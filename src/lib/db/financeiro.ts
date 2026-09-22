/**
 * Boletos, despesas, inadimplência, administradora e prestação de contas.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina, termoBusca } from '@/lib/consulta';
import type {
  CategoriaFinanceira,
  LancamentoFinanceiro,
  StatusFinanceiro,
  TipoLancamento,
  Unidade,
} from '@/lib/types';

// ---------------------------------------------------------------------- Financeiro
export async function listarLancamentos(
  condominioId: string,
  opts?: { tipo?: TipoLancamento; unidadeId?: string; pagina?: number; busca?: string },
): Promise<LancamentoFinanceiro[]> {
  let query = supabase
    .from('lancamentos_financeiros')
    .select('*, unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('vencimento', { ascending: false });
  if (opts?.tipo) query = query.eq('tipo', opts.tipo);
  if (opts?.unidadeId) query = query.eq('unidade_id', opts.unidadeId);
  const termo = termoBusca(opts?.busca);
  if (termo) query = query.or(`descricao.ilike.${termo},observacao.ilike.${termo}`);
  return unwrap(await query.range(...faixaDaPagina(opts?.pagina ?? 0))) as LancamentoFinanceiro[];
}

export async function getLancamento(id: string): Promise<LancamentoFinanceiro> {
  return unwrap(
    await supabase.from('lancamentos_financeiros').select('*, unidade:unidades(*)').eq('id', id).single(),
  );
}

export async function criarLancamento(input: {
  condominio_id: string;
  unidade_id?: string | null;
  tipo: TipoLancamento;
  categoria: CategoriaFinanceira;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia?: string | null;
  anexo_path?: string | null;
  observacao?: string | null;
  criado_por: string;
}): Promise<LancamentoFinanceiro> {
  return unwrap(await supabase.from('lancamentos_financeiros').insert(input).select('*').single());
}

export async function atualizarStatusLancamento(id: string, status: StatusFinanceiro, pagoEm?: string | null) {
  await supabase
    .from('lancamentos_financeiros')
    .update({ status, pago_em: status === 'pago' ? (pagoEm ?? new Date().toISOString().slice(0, 10)) : null })
    .eq('id', id);
}

export async function gerarBoletosMensais(input: {
  condominio_id: string;
  categoria: CategoriaFinanceira;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia?: string | null;
}): Promise<LancamentoFinanceiro[]> {
  const { data, error } = await supabase.rpc('gerar_boletos_mensais', {
    p_cond: input.condominio_id,
    p_categoria: input.categoria,
    p_descricao: input.descricao,
    p_valor: input.valor,
    p_vencimento: input.vencimento,
    p_competencia: input.competencia ?? null,
  });
  if (error) throw new Error(error.message);
  return data as LancamentoFinanceiro[];
}

export type ResumoFinanceiro = {
  pendentes: number;
  atrasados: number;
};

export async function resumoFinanceiroMorador(condominioId: string, unidadeId: string | null): Promise<ResumoFinanceiro> {
  const hoje = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from('lancamentos_financeiros')
    .select('status, vencimento')
    .eq('condominio_id', condominioId)
    .eq('tipo', 'boleto')
    .in('status', ['pendente', 'atrasado']);
  query = unidadeId ? query.eq('unidade_id', unidadeId) : query.is('unidade_id', null);
  const lancamentos = unwrap(await query) as { status: StatusFinanceiro; vencimento: string }[];
  const atrasados = lancamentos.filter((l) => l.status === 'atrasado' || l.vencimento < hoje).length;
  return { pendentes: lancamentos.length, atrasados };
}

// -------------------------------------------------------------- Inadimplência (gestor)
export type UnidadeInadimplente = {
  unidade: Unidade;
  total: number;
  quantidade: number;
  maisAntigo: string; // vencimento em atraso mais antigo (YYYY-MM-DD)
};

/**
 * Agrupa os boletos vencidos e não pagos por unidade — a visão de inadimplência do
 * síndico. "Vencido" é o status efetivo: status 'atrasado' OU pendente com
 * vencimento no passado (o mesmo critério de statusFinanceiroEfetivo).
 */
export async function inadimplencia(condominioId: string): Promise<UnidadeInadimplente[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  const boletos = unwrap(
    await supabase
      .from('lancamentos_financeiros')
      .select('valor, vencimento, status, unidade:unidades(*)')
      .eq('condominio_id', condominioId)
      .eq('tipo', 'boleto')
      .in('status', ['pendente', 'atrasado'])
      .not('unidade_id', 'is', null),
    // unidade:unidades(*) é relação to-one → objeto único em runtime; o tipo inferido
    // do supabase-js (sem schema tipado) o trata como array, daí o cast via unknown.
  ) as unknown as { valor: number; vencimento: string; status: StatusFinanceiro; unidade: Unidade | null }[];

  const mapa = new Map<string, UnidadeInadimplente>();
  for (const b of boletos) {
    const vencido = b.status === 'atrasado' || b.vencimento < hoje;
    if (!vencido || !b.unidade) continue;
    const g = mapa.get(b.unidade.id);
    if (g) {
      g.total += Number(b.valor);
      g.quantidade += 1;
      if (b.vencimento < g.maisAntigo) g.maisAntigo = b.vencimento;
    } else {
      mapa.set(b.unidade.id, { unidade: b.unidade, total: Number(b.valor), quantidade: 1, maisAntigo: b.vencimento });
    }
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

// ---------------------------------------------- Caminho A: contas para a administradora
/**
 * Marca (ou desmarca) despesas como "enviadas para a administradora pagar".
 * Só o gestor edita lançamentos financeiros (RLS financeiro_write).
 */
export async function marcarDespesasEnviadas(ids: string[], enviado = true) {
  if (ids.length === 0) return;
  await supabase
    .from('lancamentos_financeiros')
    .update({ enviado_administradora_em: enviado ? new Date().toISOString() : null })
    .in('id', ids);
}

/** Atualiza os dados da administradora do condomínio (nome e contato). Gestor via RLS. */
export async function atualizarAdministradora(
  condominioId: string,
  dados: { administradora?: string | null; administradora_contato?: string | null },
) {
  await supabase.from('condominios').update(dados).eq('id', condominioId);
}

// -------------------------------------------------------------------- Prestação de contas
export type MesFinanceiro = { mes: string; receita: number; despesa: number };

/** Agrega receitas (boletos pagos) e despesas por mês para o gráfico de prestação de contas. */
export async function prestacaoDeContas(condominioId: string, meses = 6): Promise<MesFinanceiro[]> {
  const hoje = new Date();
  // Só busca a janela exibida (evita varrer todo o histórico). A despesa entra por
  // 'vencimento' e a receita por 'pago_em', então filtramos por qualquer um dos dois.
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1).toISOString().slice(0, 10);
  const lancamentos = unwrap(
    await supabase
      .from('lancamentos_financeiros')
      .select('tipo, valor, status, vencimento, pago_em')
      .eq('condominio_id', condominioId)
      .or(`vencimento.gte.${inicio},pago_em.gte.${inicio}`),
  ) as { tipo: TipoLancamento; valor: number; status: StatusFinanceiro; vencimento: string; pago_em: string | null }[];

  const buckets: MesFinanceiro[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    buckets.push({ mes: d.toISOString().slice(0, 7), receita: 0, despesa: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.mes, i]));
  for (const l of lancamentos) {
    if (l.tipo === 'boleto' && l.status === 'pago') {
      const chave = (l.pago_em ?? l.vencimento).slice(0, 7);
      const i = idx.get(chave);
      if (i !== undefined) buckets[i].receita += Number(l.valor);
    } else if (l.tipo === 'despesa') {
      const chave = l.vencimento.slice(0, 7);
      const i = idx.get(chave);
      if (i !== undefined) buckets[i].despesa += Number(l.valor);
    }
  }
  return buckets;
}
