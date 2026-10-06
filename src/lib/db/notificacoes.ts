/**
 * Caixa de notificações: os avisos que o banco mandou para a pessoa.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio. A escrita não passa por aqui: quem cria cada linha é o
 * `enfileirar_push` no banco (migration 0014), junto com o push.
 */
import { unwrap } from '@/lib/db/_comum';
import { faixaDaPagina } from '@/lib/consulta';
import { supabase } from '@/lib/supabase';
import type { Notificacao } from '@/lib/types';

export async function listarNotificacoes(condominioId: string, userId: string, pagina = 0): Promise<Notificacao[]> {
  return unwrap(
    await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', userId)
      .eq('condominio_id', condominioId)
      .order('criado_em', { ascending: false })
      .range(...faixaDaPagina(pagina)),
  ) as Notificacao[];
}

/** Quantas não lidas — `head: true` conta no servidor sem trazer as linhas. */
export async function contarNaoLidas(condominioId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('condominio_id', condominioId)
    .is('lida_em', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function marcarNotificacaoLida(id: number) {
  unwrap(await supabase.from('notificacoes').update({ lida_em: new Date().toISOString() }).eq('id', id).is('lida_em', null));
}

export async function marcarTodasNotificacoesLidas(condominioId: string, userId: string) {
  unwrap(
    await supabase
      .from('notificacoes')
      .update({ lida_em: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('condominio_id', condominioId)
      .is('lida_em', null),
  );
}
