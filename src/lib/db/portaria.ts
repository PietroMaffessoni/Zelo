/**
 * Visitantes, encomendas, veículos e os códigos de equipe.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina } from '@/lib/consulta';
import type {
  Encomenda,
  EncomendaStatus,
  RegistroVisitante,
  TipoVeiculo,
  Veiculo,
  VisitanteAutorizado,
  VisitanteStatus,
} from '@/lib/types';

// ----------------------------------------------------------------------- Portaria
export async function listarVisitantesAutorizados(
  condominioId: string,
  unidadeId?: string,
): Promise<VisitanteAutorizado[]> {
  let query = supabase
    .from('visitantes_autorizados')
    .select('*, unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('data_inicio', { ascending: false });
  if (unidadeId) query = query.eq('unidade_id', unidadeId);
  return unwrap(await query) as VisitanteAutorizado[];
}

export async function criarVisitanteAutorizado(input: {
  condominio_id: string;
  unidade_id: string;
  autorizado_por: string;
  nome_visitante: string;
  documento?: string | null;
  observacao?: string | null;
  data_inicio: string;
  data_fim?: string | null;
}): Promise<VisitanteAutorizado> {
  return unwrap(await supabase.from('visitantes_autorizados').insert(input).select('*').single());
}

export async function atualizarStatusVisitante(id: string, status: VisitanteStatus) {
  await supabase.from('visitantes_autorizados').update({ status }).eq('id', id);
}

export async function registrarEntradaVisitante(input: {
  condominio_id: string;
  unidade_id: string;
  autorizacao_id?: string | null;
  nome_visitante: string;
  documento?: string | null;
  registrado_por: string;
  observacao?: string | null;
}): Promise<RegistroVisitante> {
  const registro = unwrap(
    await supabase.from('registros_visitantes').insert(input).select('*').single(),
  ) as RegistroVisitante;
  if (input.autorizacao_id) {
    await atualizarStatusVisitante(input.autorizacao_id, 'utilizada');
  }
  return registro;
}

/**
 * Encomendas.
 *
 * `status` e `limite` existem porque a tela da portaria não quer "as encomendas":
 * quer as que aguardam retirada (naturalmente poucas — é o que está fisicamente
 * na portaria) e as dez últimas retiradas. Sem esse recorte, a consulta trazia o
 * histórico inteiro de todas as entregas já feitas ao prédio para exibir dez.
 */
export async function listarEncomendas(
  condominioId: string,
  opts?: { unidadeId?: string; status?: EncomendaStatus; limite?: number; pagina?: number },
): Promise<Encomenda[]> {
  let query = supabase
    .from('encomendas')
    .select('*, unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: false });
  if (opts?.unidadeId) query = query.eq('unidade_id', opts.unidadeId);
  if (opts?.status) query = query.eq('status', opts.status);
  if (opts?.limite) return unwrap(await query.limit(opts.limite)) as Encomenda[];
  return unwrap(await query.range(...faixaDaPagina(opts?.pagina ?? 0))) as Encomenda[];
}

export async function criarEncomenda(input: {
  condominio_id: string;
  unidade_id: string;
  descricao: string;
  remetente?: string | null;
  foto_url?: string | null;
  registrado_por: string;
}): Promise<Encomenda> {
  return unwrap(await supabase.from('encomendas').insert(input).select('*').single());
}

export async function marcarEncomendaRetirada(
  id: string,
  retiradoPorNome: string,
  opts?: { retiradoPorId?: string | null; assinaturaConfirmada?: boolean },
) {
  await supabase
    .from('encomendas')
    .update({
      status: 'retirada',
      retirado_por_nome: retiradoPorNome,
      retirado_por_id: opts?.retiradoPorId ?? null,
      assinatura_confirmada: opts?.assinaturaConfirmada ?? false,
      retirado_em: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function listarVeiculos(condominioId: string, unidadeId?: string): Promise<Veiculo[]> {
  let query = supabase
    .from('veiculos')
    .select('*, unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('placa');
  if (unidadeId) query = query.eq('unidade_id', unidadeId);
  return unwrap(await query) as Veiculo[];
}

export async function criarVeiculo(input: {
  condominio_id: string;
  unidade_id: string;
  proprietario_id?: string | null;
  placa: string;
  modelo?: string | null;
  cor?: string | null;
  tipo?: TipoVeiculo;
  vaga?: string | null;
}): Promise<Veiculo> {
  return unwrap(
    await supabase
      .from('veiculos')
      .insert({ ...input, placa: input.placa.toUpperCase() })
      .select('*')
      .single(),
  );
}

export async function removerVeiculo(id: string) {
  await supabase.from('veiculos').delete().eq('id', id);
}

export async function gerarCodigoPortaria(condominioId: string): Promise<string> {
  const { data, error } = await supabase.rpc('gerar_codigo_portaria', { p_cond: condominioId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function gerarCodigoZelador(condominioId: string): Promise<string> {
  const { data, error } = await supabase.rpc('gerar_codigo_zelador', { p_cond: condominioId });
  if (error) throw new Error(error.message);
  return data as string;
}

export type ResumoPortaria = {
  encomendasAguardando: number;
  visitantesAutorizadosHoje: number;
};

export async function resumoPortaria(condominioId: string): Promise<ResumoPortaria> {
  const conta = (q: any) => q.then((r: any) => (r.count ?? 0) as number);
  const hoje = new Date().toISOString().slice(0, 10);
  const [encomendasAguardando, visitantesAutorizadosHoje] = await Promise.all([
    conta(
      supabase
        .from('encomendas')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .eq('status', 'aguardando_retirada'),
    ),
    conta(
      supabase
        .from('visitantes_autorizados')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .eq('status', 'ativa')
        .lte('data_inicio', hoje),
    ),
  ]);
  return { encomendasAguardando, visitantesAutorizadosHoje };
}
