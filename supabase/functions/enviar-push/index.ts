/**
 * Drena a fila `push_fila` e entrega as notificações ao serviço da Expo.
 *
 * Roda no Supabase (Deno), não no app. É chamada por dois caminhos — o gatilho
 * cutuca assim que algo entra na fila, e o pg_cron varre de minuto em minuto —
 * e os dois podem cair juntos: é `reservar_push` (com `for update skip locked`)
 * que garante que cada linha saia uma vez só. Ver a migration 0009.
 *
 * Deploy:
 *   npx supabase functions deploy enviar-push
 *
 * Não precisa de segredo configurado à mão: SUPABASE_URL e
 * SUPABASE_SERVICE_ROLE_KEY já existem no ambiente de toda Edge Function.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

/** O serviço da Expo aceita no máximo 100 mensagens por requisição. */
const LOTE_EXPO = 100;
const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/** Quantas linhas da fila cada execução leva. Acima disso, a próxima varredura
 *  pega o resto — melhor várias execuções curtas do que uma que estoura o
 *  tempo limite da função e devolve o lote inteiro para a fila. */
const LOTE_FILA = 200;

type LinhaFila = {
  id: number;
  destinatarios: string[];
  titulo: string;
  corpo: string;
  dados: Record<string, unknown>;
};

type TicketExpo = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1. Reserva um lote. A própria chamada incrementa `tentativas`, então uma
  //    falha daqui para a frente não deixa a linha presa num laço infinito.
  const { data: linhas, error: erroFila } = await supabase.rpc('reservar_push', {
    p_limite: LOTE_FILA,
  });
  if (erroFila) return resposta({ erro: erroFila.message }, 500);
  if (!linhas || linhas.length === 0) return resposta({ enviados: 0, fila: 0 });

  const fila = linhas as LinhaFila[];

  // 2. Tokens de todos os destinatários, numa consulta só.
  const idsUnicos = [...new Set(fila.flatMap((l) => l.destinatarios))];
  const { data: tokens, error: erroTokens } = await supabase
    .from('push_tokens')
    .select('user_id, expo_push_token')
    .in('user_id', idsUnicos)
    .eq('ativo', true);
  if (erroTokens) return resposta({ erro: erroTokens.message }, 500);

  const porUsuario = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    const lista = porUsuario.get(t.user_id) ?? [];
    lista.push(t.expo_push_token);
    porUsuario.set(t.user_id, lista);
  }

  // 3. Uma mensagem por aparelho. `paraLinha` guarda de qual linha da fila veio
  //    cada mensagem — o serviço da Expo responde na mesma ordem em que recebe,
  //    e é assim que o erro volta a ser atribuído à linha certa.
  const mensagens: Record<string, unknown>[] = [];
  const paraLinha: number[] = [];
  const semAparelho = new Set<number>(fila.map((l) => l.id));

  for (const linha of fila) {
    for (const uid of linha.destinatarios) {
      for (const token of porUsuario.get(uid) ?? []) {
        semAparelho.delete(linha.id);
        mensagens.push({
          to: token,
          title: linha.titulo,
          body: linha.corpo,
          data: linha.dados ?? {},
          sound: 'default',
          // Tem que bater com o canal criado no app (lib/notificacoes.ts). Sem
          // canal certo, o Android entrega a notificação em silêncio.
          channelId: 'default',
          priority: 'high',
        });
        paraLinha.push(linha.id);
      }
    }
  }

  // 4. Envia em lotes de 100.
  const invalidos = new Set<string>();
  const erroPorLinha = new Map<number, string>();
  let entregues = 0;
  let indice = 0;

  for (const lote of emLotes(mensagens, LOTE_EXPO)) {
    const inicio = indice;
    indice += lote.length;

    let tickets: TicketExpo[] = [];
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(lote),
      });
      const json = await r.json();
      if (!r.ok) {
        // Falha do lote inteiro (rate limit, indisponibilidade). As linhas não
        // são marcadas como enviadas: a próxima varredura tenta de novo.
        for (let i = 0; i < lote.length; i++) {
          erroPorLinha.set(paraLinha[inicio + i], json?.errors?.[0]?.message ?? `HTTP ${r.status}`);
        }
        continue;
      }
      tickets = json?.data ?? [];
    } catch (e) {
      for (let i = 0; i < lote.length; i++) {
        erroPorLinha.set(paraLinha[inicio + i], String(e));
      }
      continue;
    }

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const idLinha = paraLinha[inicio + i];
      if (ticket.status === 'ok') {
        entregues++;
        continue;
      }
      // Aparelho que desinstalou o app ou revogou a permissão. O token está
      // morto para sempre: desativar evita insistir nele em toda notificação
      // futura, o que a Expo trata como abuso.
      if (ticket.details?.error === 'DeviceNotRegistered') {
        invalidos.add(lote[i].to as string);
      }
      erroPorLinha.set(idLinha, ticket.details?.error ?? ticket.message ?? 'erro desconhecido');
    }
  }

  // 5. Desativa os tokens mortos.
  if (invalidos.size > 0) {
    await supabase
      .from('push_tokens')
      .update({ ativo: false })
      .in('expo_push_token', [...invalidos]);
  }

  // 6. Fecha as linhas. Uma linha cujos destinatários não têm nenhum aparelho
  //    registrado também é fechada: não há nada a reenviar, e deixá-la aberta
  //    só gastaria as cinco tentativas até sumir em silêncio.
  const agora = new Date().toISOString();
  const concluidas = fila
    .map((l) => l.id)
    .filter((id) => !erroPorLinha.has(id));

  if (concluidas.length > 0) {
    await supabase
      .from('push_fila')
      .update({ enviado_em: agora })
      .in('id', concluidas);
  }

  for (const [id, erro] of erroPorLinha) {
    await supabase.from('push_fila').update({ erro }).eq('id', id);
  }

  return resposta({
    fila: fila.length,
    mensagens: mensagens.length,
    entregues,
    semAparelho: semAparelho.size,
    tokensDesativados: invalidos.size,
    comErro: erroPorLinha.size,
  });
});
