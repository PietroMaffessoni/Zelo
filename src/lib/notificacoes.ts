import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { listarEquipamentos } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { metaEquipamento } from '@/lib/labels';
import { podeManutencao, type Equipamento, type Papel, type PreferenciasNotificacao } from '@/lib/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Pede permissão e tenta obter um push token remoto (falha silenciosamente no Expo Go,
 * que não suporta push remoto desde o SDK 53 — a notificação local continua funcionando).
 * Chamar uma vez ao abrir o app.
 */
export async function configurarNotificacoes(): Promise<string | null> {
  try {
    const permissao = await Notifications.requestPermissionsAsync();
    if (!permissao.granted || !Device.isDevice) return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function salvarPushToken(userId: string, condominioId: string | null, token: string) {
  const plataforma = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  await supabase.from('push_tokens').upsert(
    { user_id: userId, condominio_id: condominioId, expo_push_token: token, plataforma, ativo: true },
    { onConflict: 'user_id,expo_push_token' },
  );
}

export async function notificarLocal({
  titulo,
  corpo,
  dados,
}: {
  titulo: string;
  corpo: string;
  dados?: Record<string, unknown>;
}) {
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: corpo, data: dados },
    trigger: null,
  });
}

/**
 * Dispara notificações locais a partir de eventos em tempo real do condomínio atual.
 * Só funciona com o app aberto (primeiro/segundo plano) — não acorda o app fechado
 * nem notifica outro dispositivo do mesmo morador. Push remoto de verdade exige
 * development build (EAS), fora do escopo desta base.
 */
// ---------------------------------------------------------------- Lembretes de manutenção
const HORA_LEMBRETE = 9; // dispara às 09:00 locais
const TAG_MANUTENCAO = 'manutencao'; // marca em `data` para localizar/cancelar depois

function lembreteEm(dataISO: string, diasAntes: number): Date {
  const d = new Date(dataISO + 'T00:00:00');
  d.setDate(d.getDate() - diasAntes);
  d.setHours(HORA_LEMBRETE, 0, 0, 0);
  return d;
}

/**
 * Agenda lembretes locais para as manutenções preventivas com data marcada.
 * São notificações agendadas no próprio SO — disparam mesmo com o app fechado,
 * sem precisar de servidor de push. Cancela e reprograma a cada sincronização
 * (idempotente): 3 dias antes e no dia do vencimento, às 09h. Datas no passado
 * são ignoradas (não dá para agendar retroativo — o painel do síndico já sinaliza
 * as vencidas). Chamado por useLembretesManutencao para gestor/zelador.
 */
export async function sincronizarLembretesManutencao(equipamentos: Equipamento[]) {
  if (Platform.OS === 'web') return;
  try {
    const permissao = await Notifications.getPermissionsAsync();
    if (!permissao.granted) return;

    // Cancela os lembretes de manutenção anteriores (preserva outras notificações).
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      agendadas
        .filter((n) => (n.content.data as any)?.tipo === TAG_MANUTENCAO)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    const agora = Date.now();
    for (const eq of equipamentos) {
      if (!eq.proxima_manutencao || !eq.ativo) continue;
      const rotulo = metaEquipamento(eq.categoria).label;
      for (const diasAntes of [3, 0]) {
        const quando = lembreteEm(eq.proxima_manutencao, diasAntes);
        if (quando.getTime() <= agora) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: diasAntes === 0 ? `Manutenção hoje: ${eq.nome}` : `Manutenção em ${diasAntes} dias: ${eq.nome}`,
            body: `${rotulo}${eq.localizacao ? ` · ${eq.localizacao}` : ''}`,
            data: { tipo: TAG_MANUTENCAO, equipamentoId: eq.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando },
        });
      }
    }
  } catch {
    // Silencioso: lembrete é um extra; falha aqui não deve quebrar o app.
  }
}

/**
 * Mantém os lembretes de manutenção em dia para quem opera a agenda (síndico e
 * zelador). Roda ao abrir o app e quando o condomínio/papel muda.
 */
export function useLembretesManutencao(condominioId: string | null, papel: Papel | null) {
  useEffect(() => {
    if (!condominioId || !podeManutencao(papel)) return;
    let ativo = true;
    (async () => {
      try {
        const equipamentos = await listarEquipamentos(condominioId);
        if (ativo) await sincronizarLembretesManutencao(equipamentos);
      } catch {
        // ignora — sem lembrete é degradação aceitável
      }
    })();
    return () => {
      ativo = false;
    };
  }, [condominioId, papel]);
}

export function useNotificacoesRealtime(
  condominioId: string | null,
  userId: string | null,
  unidadeId: string | null,
  preferencias: PreferenciasNotificacao | undefined,
  papel?: string | null,
) {
  const prefsRef = useRef(preferencias);
  prefsRef.current = preferencias;
  const staffRef = useRef(papel);
  staffRef.current = papel;

  useEffect(() => {
    if (!condominioId || !userId) return;

    const canal = supabase
      .channel(`realtime-condominio-${condominioId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comunicados', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          if (prefsRef.current?.comunicados === false) return;
          const c = payload.new as { titulo?: string; autor_id?: string };
          if (c.autor_id === userId) return;
          notificarLocal({ titulo: 'Novo comunicado', corpo: c.titulo ?? '' });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chamados', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          if (prefsRef.current?.chamados === false) return;
          const chamado = payload.new as { autor_id?: string; status?: string; titulo?: string };
          if (chamado.autor_id === userId) {
            notificarLocal({ titulo: 'Seu chamado foi atualizado', corpo: `${chamado.titulo ?? 'Chamado'} · ${chamado.status}` });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'encomendas', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          if (prefsRef.current?.encomendas === false) return;
          const encomenda = payload.new as { descricao?: string; unidade_id?: string };
          if (unidadeId && encomenda.unidade_id === unidadeId) {
            notificarLocal({ titulo: 'Chegou uma encomenda', corpo: encomenda.descricao ?? '' });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reservas', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          if (prefsRef.current?.reservas === false) return;
          const reserva = payload.new as { morador_id?: string; status?: string };
          if (reserva.morador_id === userId) {
            notificarLocal({ titulo: 'Sua reserva foi atualizada', corpo: `Status: ${reserva.status}` });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [condominioId, userId, unidadeId]);
}
