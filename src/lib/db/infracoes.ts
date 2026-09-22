/**
 * Advertências e multas.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina } from '@/lib/consulta';
// Multa vira lançamento financeiro da unidade — o único cruzamento
// entre infrações e financeiro.
import { criarLancamento } from '@/lib/db/financeiro';
import type {
  Infracao,
  StatusInfracao,
  TipoInfracao,
} from '@/lib/types';

// -------------------------------------------------------------- Infrações (multas/advertências)
export async function listarInfracoes(
  condominioId: string,
  unidadeId?: string | null,
  pagina = 0,
): Promise<Infracao[]> {
  let query = supabase
    .from('infracoes')
    .select('*, unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: false });
  if (unidadeId) query = query.eq('unidade_id', unidadeId);
  return unwrap(await query.range(...faixaDaPagina(pagina))) as Infracao[];
}

export async function getInfracao(id: string): Promise<Infracao> {
  return unwrap(await supabase.from('infracoes').select('*, unidade:unidades(*)').eq('id', id).single());
}

export async function criarInfracao(input: {
  condominio_id: string;
  unidade_id: string;
  tipo: TipoInfracao;
  motivo: string;
  descricao: string;
  valor?: number | null;
  aplicada_por: string;
}): Promise<Infracao> {
  const infracao = unwrap(await supabase.from('infracoes').insert(input).select('*').single()) as Infracao;
  // Multa com valor vira automaticamente um boleto na unidade infratora.
  if (input.tipo === 'multa' && input.valor && input.valor > 0) {
    const lancamento = await criarLancamento({
      condominio_id: input.condominio_id,
      unidade_id: input.unidade_id,
      tipo: 'boleto',
      categoria: 'multa',
      descricao: `Multa — ${input.descricao}`.slice(0, 120),
      valor: input.valor,
      vencimento: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      criado_por: input.aplicada_por,
    });
    await supabase.from('infracoes').update({ lancamento_id: lancamento.id }).eq('id', infracao.id);
  }
  return infracao;
}

export async function contestarInfracao(id: string, contestacao: string) {
  // Via RPC security definer: a policy de update de infrações é gestor-only,
  // então a contestação do morador é validada e gravada no banco.
  const { error } = await supabase.rpc('contestar_infracao', { p_id: id, p_texto: contestacao });
  if (error) throw new Error(error.message);
}

export async function responderInfracao(id: string, status: StatusInfracao, resposta?: string | null) {
  await supabase.from('infracoes').update({ status, resposta_gestor: resposta ?? null }).eq('id', id);
}
