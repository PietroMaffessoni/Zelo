import { supabase } from '@/lib/supabase';
import type {
  AchadoPerdido,
  AchadoStatus,
  AreaComum,
  Assembleia,
  AssembleiaOpcao,
  AssembleiaPauta,
  AssembleiaVoto,
  Chamado,
  ChamadoCategoria,
  ChamadoEvento,
  ChamadoStatus,
  Comunicado,
  CategoriaDocumento,
  CategoriaEquipamento,
  CategoriaFinanceira,
  Dependente,
  Documento,
  Encomenda,
  EncomendaStatus,
  Equipamento,
  EspeciePet,
  Evento,
  Infracao,
  ItemVistoria,
  LancamentoFinanceiro,
  Manutencao,
  Membership,
  MotivoInfracao,
  Pet,
  PreferenciasNotificacao,
  Prioridade,
  PropostaPauta,
  RegistroVisitante,
  Reserva,
  ReservaStatus,
  Solicitacao,
  SolicitacaoCategoria,
  SolicitacaoStatus,
  StatusFinanceiro,
  StatusInfracao,
  StatusProposta,
  TipoEvento,
  TipoInfracao,
  TipoLancamento,
  TipoVeiculo,
  TipoVistoria,
  Unidade,
  UnidadeDetalhe,
  Veiculo,
  VisitanteAutorizado,
  VisitanteStatus,
  VistoriaReserva,
  Vinculo,
} from '@/lib/types';

function unwrap<T>({ data, error }: { data: T | null; error: any }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------------------------------------------------------------- Comunicados
/**
 * Grupo de destaque: fixado+urgente > fixado > urgente > demais. Um urgente sobe
 * acima de qualquer aviso comum, por mais recente que o outro seja, e a urgência
 * também desempata entre os que o síndico fixou à mão.
 */
function grupoComunicado(c: Comunicado): number {
  const urgente = c.prioridade === 'alta';
  if (c.fixado) return urgente ? 0 : 1;
  return urgente ? 2 : 3;
}

export async function listarComunicados(condominioId: string, userId: string): Promise<Comunicado[]> {
  const [comRes, leiRes] = await Promise.all([
    supabase
      .from('comunicados')
      .select('*, autor:profiles!autor_id(*)')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false }),
    supabase.from('comunicado_leituras').select('comunicado_id').eq('user_id', userId),
  ]);
  const comunicados = unwrap(comRes) as Comunicado[];
  const lidos = new Set((leiRes.data ?? []).map((l: any) => l.comunicado_id));
  // O agrupamento não é uma coluna, então não dá para pedir ao PostgREST: ordena
  // aqui. O sort do JS é estável, então dentro de cada grupo vale o created_at
  // desc que já veio do servidor.
  return comunicados
    .map((c) => ({ ...c, lido: lidos.has(c.id) }))
    .sort((a, b) => grupoComunicado(a) - grupoComunicado(b));
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
      .select('*, autor:profiles!autor_id(*)')
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
      .select('*, autor:profiles!autor_id(*)')
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

/** Inclui áreas inativas — uso exclusivo das telas de administração. */
export async function listarAreasAdmin(condominioId: string): Promise<AreaComum[]> {
  return unwrap(
    await supabase.from('areas_comuns').select('*').eq('condominio_id', condominioId).order('nome'),
  ) as AreaComum[];
}

export async function getArea(id: string): Promise<AreaComum> {
  return unwrap(await supabase.from('areas_comuns').select('*').eq('id', id).single());
}

export async function criarArea(input: {
  condominio_id: string;
  nome: string;
  descricao?: string | null;
  capacidade?: number | null;
  requer_aprovacao: boolean;
  icone?: string;
  taxa_uso?: number;
  limite_mensal_por_unidade?: number | null;
}): Promise<AreaComum> {
  return unwrap(await supabase.from('areas_comuns').insert(input).select('*').single());
}

export async function atualizarArea(id: string, patch: Partial<AreaComum>) {
  await supabase.from('areas_comuns').update(patch).eq('id', id);
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

export async function getReserva(id: string): Promise<Reserva> {
  return unwrap(
    await supabase
      .from('reservas')
      .select('*, area:areas_comuns(*), morador:profiles(*), unidade:unidades(*)')
      .eq('id', id)
      .single(),
  );
}

/**
 * Reservas ativas (pendente/aprovada) de uma área que cruzam um intervalo — usada
 * pela tela de nova reserva para mostrar os horários já ocupados (disponibilidade).
 */
export async function reservasDaArea(areaId: string, deISO: string, ateISO: string): Promise<Reserva[]> {
  return unwrap(
    await supabase
      .from('reservas')
      .select('id, inicio, fim, status')
      .eq('area_id', areaId)
      .in('status', ['pendente', 'aprovada'])
      .lt('inicio', ateISO)
      .gt('fim', deISO)
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
  taxa_cobrada?: number | null;
}): Promise<Reserva> {
  const { requer_aprovacao, ...resto } = input;
  const { data, error } = await supabase
    .from('reservas')
    .insert({ ...resto, status: requer_aprovacao ? 'pendente' : 'aprovada' })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23P01') throw new Error('Este horário já está reservado para esta área. Escolha outro horário.');
    throw new Error(error.message);
  }
  return data as Reserva;
}

export async function alterarStatusReserva(id: string, status: ReservaStatus, resposta?: string) {
  await supabase.from('reservas').update({ status, resposta_admin: resposta ?? null }).eq('id', id);

  // Ao aprovar uma reserva com taxa de uso, gera automaticamente o boleto correspondente.
  if (status === 'aprovada') {
    const reserva = await getReserva(id);
    if (reserva.taxa_cobrada && reserva.taxa_cobrada > 0 && !reserva.lancamento_id && reserva.unidade_id) {
      const lancamento = await criarLancamento({
        condominio_id: reserva.condominio_id,
        unidade_id: reserva.unidade_id,
        tipo: 'boleto',
        categoria: 'outros',
        descricao: `Taxa de uso — ${reserva.area?.nome ?? 'área comum'}`,
        valor: reserva.taxa_cobrada,
        vencimento: reserva.inicio.slice(0, 10),
        criado_por: reserva.morador_id,
      });
      await supabase.from('reservas').update({ lancamento_id: lancamento.id }).eq('id', id);
    }
  }
}

/** Anexa (ou substitui) o comprovante de pagamento de uma reserva. Path do bucket privado 'financeiro'. */
export async function anexarComprovanteReserva(id: string, comprovantePath: string) {
  await supabase.from('reservas').update({ comprovante_path: comprovantePath }).eq('id', id);
}

// ------------------------------------------------------------------ Vistorias
export async function listarVistorias(reservaId: string): Promise<VistoriaReserva[]> {
  return unwrap(
    await supabase.from('vistorias_reserva').select('*').eq('reserva_id', reservaId),
  ) as VistoriaReserva[];
}

export async function salvarVistoria(input: {
  reserva_id: string;
  condominio_id: string;
  tipo: TipoVistoria;
  itens: ItemVistoria[];
  fotos?: string[];
  respondida_por: string;
}): Promise<VistoriaReserva> {
  return unwrap(
    await supabase
      .from('vistorias_reserva')
      .upsert(input, { onConflict: 'reserva_id,tipo' })
      .select('*')
      .single(),
  );
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

/** Pedidos de acesso ainda não aprovados pelo síndico (entrar_condominio cria como 'pendente'). */
export async function listarMembershipsPendentes(condominioId: string): Promise<Membership[]> {
  return unwrap(
    await supabase
      .from('memberships')
      .select('*, profile:profiles(*), unidade:unidades(*)')
      .eq('condominio_id', condominioId)
      .eq('status', 'pendente')
      .order('created_at', { ascending: true }),
  ) as Membership[];
}

export async function aprovarMembership(membershipId: string) {
  await supabase.from('memberships').update({ status: 'ativo' }).eq('id', membershipId);
}

export async function recusarMembership(membershipId: string) {
  await supabase.from('memberships').delete().eq('id', membershipId);
}

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

/** Promove/rebaixa um morador entre 'morador' e 'conselheiro' (só o gestor, via RLS). */
export async function atualizarPapelMorador(membershipId: string, papel: 'morador' | 'conselheiro') {
  await supabase.from('memberships').update({ papel }).eq('id', membershipId);
}

/** Atualiza a ficha cadastral (CPF/RG) de um morador — só o gestor, via RLS de memberships. */
export async function atualizarDadosCadastrais(
  membershipId: string,
  dados: { cpf?: string | null; rg?: string | null },
) {
  await supabase.from('memberships').update(dados).eq('id', membershipId);
}

/** Todos os moradores ativos do condomínio (para a busca rápida do síndico). */
export async function listarMoradores(condominioId: string): Promise<Membership[]> {
  return unwrap(
    await supabase
      .from('memberships')
      .select('*, profile:profiles(*), unidade:unidades(*)')
      .eq('condominio_id', condominioId)
      .eq('status', 'ativo')
      .order('created_at', { ascending: true }),
  ) as Membership[];
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

// ---------------------------------------------------------------------- Financeiro
export async function listarLancamentos(
  condominioId: string,
  opts?: { tipo?: TipoLancamento; unidadeId?: string },
): Promise<LancamentoFinanceiro[]> {
  let query = supabase
    .from('lancamentos_financeiros')
    .select('*, unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('vencimento', { ascending: false });
  if (opts?.tipo) query = query.eq('tipo', opts.tipo);
  if (opts?.unidadeId) query = query.eq('unidade_id', opts.unidadeId);
  return unwrap(await query) as LancamentoFinanceiro[];
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

// ---------------------------------------------------------------------- Documentos
export async function listarDocumentos(condominioId: string, categoria?: CategoriaDocumento): Promise<Documento[]> {
  let query = supabase
    .from('documentos')
    .select('*')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: false });
  if (categoria) query = query.eq('categoria', categoria);
  return unwrap(await query) as Documento[];
}

export async function criarDocumento(input: {
  condominio_id: string;
  categoria: CategoriaDocumento;
  titulo: string;
  descricao?: string | null;
  arquivo_path: string;
  arquivo_nome?: string | null;
  tamanho_bytes?: number | null;
  publicado_por: string;
}): Promise<Documento> {
  return unwrap(await supabase.from('documentos').insert(input).select('*').single());
}

export async function removerDocumento(id: string) {
  await supabase.from('documentos').delete().eq('id', id);
}

// ------------------------------------------------------------------ Assembleias
export async function listarAssembleias(condominioId: string): Promise<Assembleia[]> {
  return unwrap(
    await supabase
      .from('assembleias')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('data_hora', { ascending: false }),
  ) as Assembleia[];
}

export async function getAssembleia(id: string): Promise<Assembleia> {
  return unwrap(await supabase.from('assembleias').select('*').eq('id', id).single());
}

export async function listarPautas(assembleiaId: string): Promise<AssembleiaPauta[]> {
  const pautas = unwrap(
    await supabase.from('assembleia_pautas').select('*').eq('assembleia_id', assembleiaId).order('ordem'),
  ) as AssembleiaPauta[];
  const pautaIds = pautas.map((p) => p.id);
  if (pautaIds.length === 0) return [];

  const [opcoesRes, votosRes] = await Promise.all([
    supabase.from('assembleia_opcoes').select('*').in('pauta_id', pautaIds).order('ordem'),
    supabase.from('assembleia_votos').select('pauta_id, opcao_id').in('pauta_id', pautaIds),
  ]);
  const opcoes = unwrap(opcoesRes) as AssembleiaOpcao[];
  const votos = unwrap(votosRes) as { pauta_id: string; opcao_id: string }[];

  return pautas.map((p) => ({
    ...p,
    opcoes: opcoes
      .filter((o) => o.pauta_id === p.id)
      .map((o) => ({ ...o, votos: votos.filter((v) => v.opcao_id === o.id).length })),
  }));
}

export async function criarAssembleia(input: {
  condominio_id: string;
  titulo: string;
  descricao?: string | null;
  data_hora: string;
  local?: string | null;
  link_online?: string | null;
  quorum_minimo_unidades?: number | null;
  criado_por: string;
}): Promise<Assembleia> {
  return unwrap(await supabase.from('assembleias').insert(input).select('*').single());
}

export async function adicionarPauta(input: {
  assembleia_id: string;
  condominio_id: string;
  titulo: string;
  descricao?: string | null;
  ordem?: number;
  opcoes: string[];
}): Promise<AssembleiaPauta> {
  const { opcoes, ...resto } = input;
  const pauta = unwrap(
    await supabase.from('assembleia_pautas').insert(resto).select('*').single(),
  ) as AssembleiaPauta;
  if (opcoes.length) {
    await supabase
      .from('assembleia_opcoes')
      .insert(opcoes.map((texto, ordem) => ({ pauta_id: pauta.id, texto, ordem })));
  }
  return pauta;
}

export async function votar(input: { pauta_id: string; opcao_id: string; condominio_id: string; unidade_id: string; user_id: string }) {
  const { error } = await supabase.from('assembleia_votos').insert(input);
  if (error) {
    if (error.code === '23505') throw new Error('Sua unidade já votou nesta pauta.');
    throw new Error(error.message);
  }
}

export async function meuVoto(pautaId: string, unidadeId: string): Promise<AssembleiaVoto | null> {
  const { data } = await supabase
    .from('assembleia_votos')
    .select('*')
    .eq('pauta_id', pautaId)
    .eq('unidade_id', unidadeId)
    .maybeSingle();
  return (data as AssembleiaVoto) ?? null;
}

export async function encerrarPauta(id: string) {
  await supabase.from('assembleia_pautas').update({ encerrada: true }).eq('id', id);
}

export async function encerrarAssembleia(id: string) {
  await supabase.from('assembleias').update({ status: 'encerrada' }).eq('id', id);
  await supabase.from('assembleia_pautas').update({ encerrada: true }).eq('assembleia_id', id);
}

export async function vincularAta(assembleiaId: string, documentoId: string) {
  await supabase.from('assembleias').update({ ata_documento_id: documentoId }).eq('id', assembleiaId);
}

// ------------------------------------------------------------------ Notificações
export async function atualizarPreferenciasNotificacao(userId: string, preferencias: PreferenciasNotificacao) {
  await supabase.from('profiles').update({ preferencias_notificacao: preferencias }).eq('id', userId);
}

// -------------------------------------------------------------------- Dashboard
export type ResumoGestor = {
  chamadosAbertos: number;
  reservasPendentes: number;
  solicitacoesAbertas: number;
  moradores: number;
  boletosAtrasados: number;
  manutencoesVencidas: number;
};

export async function resumoGestor(condominioId: string): Promise<ResumoGestor> {
  const conta = (q: any) => q.then((r: any) => (r.count ?? 0) as number);
  const hoje = new Date().toISOString().slice(0, 10);
  const [chamadosAbertos, reservasPendentes, solicitacoesAbertas, moradores, boletosAtrasados, manutencoesVencidas] = await Promise.all([
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
    conta(
      supabase
        .from('lancamentos_financeiros')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .eq('tipo', 'boleto')
        .or(`status.eq.atrasado,and(status.eq.pendente,vencimento.lt.${hoje})`),
    ),
    conta(
      supabase
        .from('equipamentos')
        .select('id', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .eq('ativo', true)
        .lt('proxima_manutencao', hoje),
    ),
  ]);
  return { chamadosAbertos, reservasPendentes, solicitacoesAbertas, moradores, boletosAtrasados, manutencoesVencidas };
}

// ---------------------------------------------------------------------- Agenda / Eventos
export async function listarEventosAgenda(condominioId: string): Promise<Evento[]> {
  return unwrap(
    await supabase
      .from('eventos')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('inicio', { ascending: true }),
  ) as Evento[];
}

export async function criarEvento(input: {
  condominio_id: string;
  titulo: string;
  descricao?: string | null;
  tipo: TipoEvento;
  inicio: string;
  fim?: string | null;
  local?: string | null;
  criado_por: string;
}): Promise<Evento> {
  return unwrap(await supabase.from('eventos').insert(input).select('*').single());
}

export async function removerEvento(id: string) {
  await supabase.from('eventos').delete().eq('id', id);
}

// ---------------------------------------------------------------- Manutenção preventiva
export async function listarEquipamentos(condominioId: string): Promise<Equipamento[]> {
  return unwrap(
    await supabase
      .from('equipamentos')
      .select('*')
      .eq('condominio_id', condominioId)
      .eq('ativo', true)
      .order('proxima_manutencao', { ascending: true, nullsFirst: false }),
  ) as Equipamento[];
}

export async function getEquipamento(id: string): Promise<Equipamento> {
  return unwrap(await supabase.from('equipamentos').select('*').eq('id', id).single());
}

export async function criarEquipamento(input: {
  condominio_id: string;
  nome: string;
  categoria: CategoriaEquipamento;
  localizacao?: string | null;
  periodicidade_dias?: number | null;
  proxima_manutencao?: string | null;
  fornecedor?: string | null;
  observacoes?: string | null;
}): Promise<Equipamento> {
  return unwrap(await supabase.from('equipamentos').insert(input).select('*').single());
}

export async function removerEquipamento(id: string) {
  await supabase.from('equipamentos').update({ ativo: false }).eq('id', id);
}

export async function listarManutencoes(equipamentoId: string): Promise<Manutencao[]> {
  return unwrap(
    await supabase
      .from('manutencoes')
      .select('*')
      .eq('equipamento_id', equipamentoId)
      .order('realizada_em', { ascending: false }),
  ) as Manutencao[];
}

/**
 * Registra uma manutenção e atualiza o equipamento (última + próxima manutenção,
 * calculada a partir da periodicidade). Retorna a manutenção criada.
 */
export async function registrarManutencao(input: {
  condominio_id: string;
  equipamento_id: string;
  descricao: string;
  custo?: number | null;
  realizada_em: string;
  responsavel?: string | null;
  registrado_por: string;
  itens?: ItemVistoria[];
  periodicidade_dias?: number | null;
}): Promise<Manutencao> {
  const { periodicidade_dias, itens, ...resto } = input;
  const manutencao = unwrap(
    await supabase.from('manutencoes').insert({ ...resto, itens: itens ?? [] }).select('*').single(),
  ) as Manutencao;
  const patch: Partial<Equipamento> = { ultima_manutencao: input.realizada_em };
  if (periodicidade_dias && periodicidade_dias > 0) {
    const base = new Date(input.realizada_em + 'T00:00:00');
    base.setDate(base.getDate() + periodicidade_dias);
    patch.proxima_manutencao = base.toISOString().slice(0, 10);
  }
  await supabase.from('equipamentos').update(patch).eq('id', input.equipamento_id);
  return manutencao;
}

// -------------------------------------------------------------- Infrações (multas/advertências)
export async function listarInfracoes(condominioId: string, unidadeId?: string | null): Promise<Infracao[]> {
  let query = supabase
    .from('infracoes')
    .select('*, unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: false });
  if (unidadeId) query = query.eq('unidade_id', unidadeId);
  return unwrap(await query) as Infracao[];
}

export async function getInfracao(id: string): Promise<Infracao> {
  return unwrap(await supabase.from('infracoes').select('*, unidade:unidades(*)').eq('id', id).single());
}

export async function criarInfracao(input: {
  condominio_id: string;
  unidade_id: string;
  tipo: TipoInfracao;
  motivo: MotivoInfracao;
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

// -------------------------------------------------------- Propostas de pauta (moradores)
export async function listarPropostas(condominioId: string, userId: string): Promise<PropostaPauta[]> {
  const propostas = unwrap(
    await supabase
      .from('propostas_pauta')
      .select('*, autor:profiles!autor_id(*)')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false }),
  ) as PropostaPauta[];
  const ids = propostas.map((p) => p.id);
  if (ids.length === 0) return propostas;
  const { data: apoios } = await supabase.from('propostas_apoios').select('proposta_id, user_id').in('proposta_id', ids);
  const lista = (apoios ?? []) as { proposta_id: string; user_id: string }[];
  return propostas.map((p) => ({
    ...p,
    apoios: lista.filter((a) => a.proposta_id === p.id).length,
    apoiada: lista.some((a) => a.proposta_id === p.id && a.user_id === userId),
  }));
}

export async function criarProposta(input: {
  condominio_id: string;
  autor_id: string;
  unidade_id?: string | null;
  titulo: string;
  descricao: string;
}): Promise<PropostaPauta> {
  return unwrap(await supabase.from('propostas_pauta').insert(input).select('*').single());
}

export async function alternarApoioProposta(propostaId: string, userId: string, apoiar: boolean) {
  if (apoiar) {
    await supabase.from('propostas_apoios').upsert({ proposta_id: propostaId, user_id: userId }, { onConflict: 'proposta_id,user_id' });
  } else {
    await supabase.from('propostas_apoios').delete().eq('proposta_id', propostaId).eq('user_id', userId);
  }
}

export async function responderProposta(id: string, status: StatusProposta, resposta?: string | null, assembleiaId?: string | null) {
  await supabase
    .from('propostas_pauta')
    .update({ status, resposta_gestor: resposta ?? null, assembleia_id: assembleiaId ?? null })
    .eq('id', id);
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
