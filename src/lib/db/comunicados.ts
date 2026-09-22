/**
 * Avisos publicados pela administração e a marcação de leitura.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina } from '@/lib/consulta';
import type {
  Comunicado,
  Prioridade,
} from '@/lib/types';

// ---------------------------------------------------------------- Comunicados
export async function listarComunicados(
  condominioId: string,
  userId: string,
  pagina = 0,
): Promise<Comunicado[]> {
  const [comRes, leiRes] = await Promise.all([
    supabase
      .from('comunicados')
      .select('*, autor:profiles!autor_id(*)')
      .eq('condominio_id', condominioId)
      // `ordem_destaque` é coluna gerada no banco (fixado+urgente > fixado >
      // urgente > demais) justamente para este ORDER BY existir no servidor:
      // ordenar no cliente só ordenaria dentro da página, e um aviso fixado que
      // caísse na página 3 apareceria abaixo de um comum da página 1.
      .order('ordem_destaque', { ascending: true })
      .order('created_at', { ascending: false })
      .range(...faixaDaPagina(pagina)),
    supabase.from('comunicado_leituras').select('comunicado_id').eq('user_id', userId),
  ]);
  const comunicados = unwrap(comRes) as Comunicado[];
  const lidos = new Set((leiRes.data ?? []).map((l: any) => l.comunicado_id));
  return comunicados.map((c) => ({ ...c, lido: lidos.has(c.id) }));
}

export async function getComunicado(id: string): Promise<Comunicado> {
  return unwrap(await supabase.from('comunicados').select('*, autor:profiles!autor_id(*)').eq('id', id).single());
}

export async function marcarComunicadoLido(comunicadoId: string, userId: string) {
  await supabase
    .from('comunicado_leituras')
    .upsert({ comunicado_id: comunicadoId, user_id: userId }, { onConflict: 'comunicado_id,user_id' });
}

export async function criarComunicado(input: {
  condominio_id: string;
  autor_id: string;
  titulo: string;
  corpo: string;
  categoria?: string | null;
  prioridade?: Prioridade;
  fixado?: boolean;
}) {
  return unwrap(await supabase.from('comunicados').insert(input).select('*').single());
}

/** Fixa/desafixa um comunicado no topo da lista (gestor). */
export async function fixarComunicado(id: string, fixado: boolean) {
  return unwrap(await supabase.from('comunicados').update({ fixado }).eq('id', id).select('*').single());
}
