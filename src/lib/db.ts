import { supabase } from '@/lib/supabase';
import type {
  AchadoPerdido,
  AchadoStatus,
  AreaComum,
  Chamado,
  ChamadoCategoria,
  ChamadoEvento,
  ChamadoStatus,
  Comunicado,
  Dependente,
  Encomenda,
  EncomendaStatus,
  EspeciePet,
  Membership,
  Pet,
  Prioridade,
  RegistroVisitante,
  Reserva,
  ReservaStatus,
  Solicitacao,
  SolicitacaoCategoria,
  SolicitacaoStatus,
  TipoVeiculo,
  Unidade,
  UnidadeDetalhe,
  Veiculo,
  VisitanteAutorizado,
  VisitanteStatus,
  Vinculo,
} from '@/lib/types';

function unwrap<T>({ data, error }: { data: T | null; error: any }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------------------------------------------------------------- Comunicados
export async function listarComunicados(condominioId: string, userId: string): Promise<Comunicado[]> {
  const [comRes, leiRes] = await Promise.all([
    supabase
      .from('comunicados')
      .select('*, autor:profiles(*)')
      .eq('condominio_id', condominioId)
      .order('fixado', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('comunicado_leituras').select('comunicado_id').eq('user_id', userId),
  ]);
  const comunicados = unwrap(comRes) as Comunicado[];
  const lidos = new Set((leiRes.data ?? []).map((l: any) => l.comunicado_id));
  return comunicados.map((c) => ({ ...c, lido: lidos.has(c.id) }));
}

export async function getComunicado(id: string): Promise<Comunicado> {
  return unwrap(await supabase.from('comunicados').select('*, autor:profiles(*)').eq('id', id).single());
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

// ------------------------------------------------------------------- Chamados
export async function listarChamados(condominioId: string): Promise<Chamado[]> {
  return unwrap(
    await supabase
      .from('chamados')
      .select('*, autor:profiles!autor_id(*), responsavel:profiles!responsavel_id(*), unidade:unidades(*)')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false }),
  ) as Chamado[];
}

export async function getChamado(id: string): Promise<Chamado> {
  return unwrap(
    await supabase
      .from('chamados')
      .select('*, autor:profiles!autor_id(*), responsavel:profiles!responsavel_id(*), unidade:unidades(*)')
      .eq('id', id)
      .single(),
  );
}

export async function listarEventos(chamadoId: string): Promise<ChamadoEvento[]> {
  return unwrap(
    await supabase
      .from('chamado_eventos')
      .select('*, autor:profiles(*)')
      .eq('chamado_id', chamadoId)
      .order('created_at', { ascending: true }),
  ) as ChamadoEvento[];
}

export async function criarChamado(input: {
  condominio_id: string;
  autor_id: string;
  unidade_id?: string | null;
  categoria: ChamadoCategoria;
  titulo: string;
  descricao: string;
  prioridade: Prioridade;
  fotos?: string[];
}): Promise<Chamado> {
  const chamado = unwrap(
    await supabase.from('chamados').insert(input).select('*').single(),
  ) as Chamado;
  await supabase.from('chamado_eventos').insert({
    chamado_id: chamado.id,
    autor_id: input.autor_id,
    tipo: 'criacao',
    texto: 'Chamado aberto',
  });
  return chamado;
}

export async function comentarChamado(chamadoId: string, autorId: string, texto: string) {
  return unwrap(
    await supabase
      .from('chamado_eventos')
      .insert({ chamado_id: chamadoId, autor_id: autorId, tipo: 'comentario', texto })
      .select('*, autor:profiles(*)')
      .single(),
  );
}

export async function alterarStatusChamado(
  chamadoId: string,
  autorId: string,
  novo: ChamadoStatus,
) {
  await supabase.from('chamados').update({ status: novo }).eq('id', chamadoId);
  await supabase.from('chamado_eventos').insert({
    chamado_id: chamadoId,
    autor_id: autorId,
    tipo: 'status',
    status_novo: novo,
    texto: `Status alterado para ${novo.replace('_', ' ')}`,
  });
}

// -------------------------------------------------------- Áreas comuns / Reservas
export async function listarAreas(condominioId: string): Promise<AreaComum[]> {
  return unwrap(
    await supabase
      .from('areas_comuns')
      .select('*')
      .eq('condominio_id', condominioId)
      .eq('ativo', true)
      .order('nome'),
  ) as AreaComum[];
}

export async function listarReservas(condominioId: string): Promise<Reserva[]> {
  return unwrap(
    await supabase
      .from('reservas')
      .select('*, area:areas_comuns(*), morador:profiles(*), unidade:unidades(*)')
      .eq('condominio_id', condominioId)
      .order('inicio', { ascending: true }),
  ) as Reserva[];
}

export async function criarReserva(input: {
  condominio_id: string;
  area_id: string;
  morador_id: string;
  unidade_id?: string | null;
  inicio: string;
  fim: string;
  observacao?: string | null;
  requer_aprovacao: boolean;
}): Promise<Reserva> {
  const { requer_aprovacao, ...resto } = input;
  return unwrap(
    await supabase
      .from('reservas')
      .insert({ ...resto, status: requer_aprovacao ? 'pendente' : 'aprovada' })
      .select('*')
      .single(),
  );
}

export async function alterarStatusReserva(id: string, status: ReservaStatus, resposta?: string) {
  await supabase.from('reservas').update({ status, resposta_admin: resposta ?? null }).eq('id', id);
}

// ------------------------------------------------------------- Achados e perdidos
export async function listarAchados(condominioId: string): Promise<AchadoPerdido[]> {
  return unwrap(
    await supabase
      .from('achados_perdidos')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false }),
  ) as AchadoPerdido[];
}

export async function criarAchado(input: {
  condominio_id: string;
  registrado_por: string;
  titulo: string;
  descricao?: string | null;
  local_encontrado?: string | null;
  foto_url?: string | null;
  data_encontrado?: string | null;
}): Promise<AchadoPerdido> {
  return unwrap(await supabase.from('achados_perdidos').insert(input).select('*').single());
}

export async function alterarStatusAchado(id: string, status: AchadoStatus) {
  await supabase.from('achados_perdidos').update({ status }).eq('id', id);
}

// ----------------------------------------------------- Central do morador (solicitações)
export async function listarSolicitacoes(condominioId: string): Promise<Solicitacao[]> {
  return unwrap(
    await supabase
      .from('solicitacoes')
      .select('*, morador:profiles(*)')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false }),
  ) as Solicitacao[];
}

export async function getSolicitacao(id: string): Promise<Solicitacao> {
  return unwrap(
    await supabase.from('solicitacoes').select('*, morador:profiles(*)').eq('id', id).single(),
  );
}

export async function criarSolicitacao(input: {
  condominio_id: string;
  morador_id: string;
  categoria: SolicitacaoCategoria;
  titulo: string;
  descricao: string;
}): Promise<Solicitacao> {
  return unwrap(await supabase.from('solicitacoes').insert(input).select('*').single());
}

export async function responderSolicitacao(id: string, status: SolicitacaoStatus, resposta?: string) {
  await supabase.from('solicitacoes').update({ status, resposta: resposta ?? null }).eq('id', id);
}

// --------------------------------------------------------- Moradores e unidades
export async function listarUnidades(condominioId: string): Promise<Unidade[]> {
  return unwrap(
    await supabase
      .from('unidades')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('bloco', { ascending: true })
      .order('numero', { ascending: true }),
  ) as Unidade[];
}

export async function getUnidade(id: string): Promise<UnidadeDetalhe> {
  const [unidadeRes, moradoresRes, dependentesRes, petsRes] = await Promise.all([
    supabase.from('unidades').select('*').eq('id', id).single(),
    supabase
      .from('memberships')
      .select('*, profile:profiles(*)')
      .eq('unidade_id', id)
      .eq('status', 'ativo')
      .order('created_at', { ascending: true }),
    supabase.from('dependentes').select('*').eq('unidade_id', id).order('nome'),
    supabase.from('pets').select('*').eq('unidade_id', id).order('nome'),
  ]);
  const unidade = unwrap(unidadeRes) as Unidade;
  return {
    ...unidade,
    moradores: unwrap(moradoresRes) as Membership[],
    dependentes: unwrap(dependentesRes) as Dependente[],
    pets: unwrap(petsRes) as Pet[],
  };
}

export async function criarUnidade(input: {
  condominio_id: string;
  bloco?: string | null;
  numero: string;
  fracao_ideal?: number | null;
  observacoes?: string | null;
}): Promise<Unidade> {
  return unwrap(await supabase.from('unidades').insert(input).select('*').single());
}

export async function atualizarVinculoMorador(membershipId: string, vinculo: Vinculo) {
  await supabase.from('memberships').update({ vinculo }).eq('id', membershipId);
}

export async function removerMoradorDaUnidade(membershipId: string) {
  await supabase.from('memberships').update({ status: 'inativo' }).eq('id', membershipId);
}

export async function criarDependente(input: {
  condominio_id: string;
  unidade_id: string;
  nome: string;
  parentesco?: string | null;
  data_nascimento?: string | null;
}): Promise<Dependente> {
  return unwrap(await supabase.from('dependentes').insert(input).select('*').single());
}

export async function removerDependente(id: string) {
  await supabase.from('dependentes').delete().eq('id', id);
}

export async function criarPet(input: {
  condominio_id: string;
  unidade_id: string;
  nome: string;
  especie?: EspeciePet;
  raca?: string | null;
  foto_url?: string | null;
  observacoes?: string | null;
}): Promise<Pet> {
  return unwrap(await supabase.from('pets').insert(input).select('*').single());
}

export async function removerPet(id: string) {
  await supabase.from('pets').delete().eq('id', id);
}

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

export async function listarRegistrosVisitantes(condominioId: string): Promise<RegistroVisitante[]> {
  return unwrap(
    await supabase
      .from('registros_visitantes')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('entrada', { ascending: false }),
  ) as RegistroVisitante[];
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

export async function registrarSaidaVisitante(registroId: string) {
  await supabase.from('registros_visitantes').update({ saida: new Date().toISOString() }).eq('id', registroId);
}

export async function listarEncomendas(condominioId: string, unidadeId?: string): Promise<Encomenda[]> {
  let query = supabase
    .from('encomendas')
    .select('*, unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: false });
  if (unidadeId) query = query.eq('unidade_id', unidadeId);
  return unwrap(await query) as Encomenda[];
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

export async function marcarEncomendaRetirada(id: string, retiradoPorNome: string) {
  await supabase
    .from('encomendas')
    .update({ status: 'retirada', retirado_por_nome: retiradoPorNome, retirado_em: new Date().toISOString() })
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

export type ResumoPortaria = {
  encomendasAguardando: number;
  visitantesAutorizadosHoje: number;
  visitantesNoLocal: number;
};

export async function resumoPortaria(condominioId: string): Promise<ResumoPortaria> {
  const conta = (q: any) => q.then((r: any) => (r.count ?? 0) as number);
  const hoje = new Date().toISOString().slice(0, 10);
  const [encomendasAguardando, visitantesAutorizadosHoje, visitantesNoLocal] = await Promise.all([
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
    conta(
      supabase
        .from('registros_visitantes')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .is('saida', null),
    ),
  ]);
  return { encomendasAguardando, visitantesAutorizadosHoje, visitantesNoLocal };
}

// -------------------------------------------------------------------- Dashboard
export type ResumoGestor = {
  chamadosAbertos: number;
  reservasPendentes: number;
  solicitacoesAbertas: number;
  moradores: number;
};

export async function resumoGestor(condominioId: string): Promise<ResumoGestor> {
  const conta = (q: any) => q.then((r: any) => (r.count ?? 0) as number);
  const [chamadosAbertos, reservasPendentes, solicitacoesAbertas, moradores] = await Promise.all([
    conta(
      supabase
        .from('chamados')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .in('status', ['aberto', 'em_andamento']),
    ),
    conta(
      supabase
        .from('reservas')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .eq('status', 'pendente'),
    ),
    conta(
      supabase
        .from('solicitacoes')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .in('status', ['aberta', 'em_analise']),
    ),
    conta(
      supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .eq('status', 'ativo'),
    ),
  ]);
  return { chamadosAbertos, reservasPendentes, solicitacoesAbertas, moradores };
}
