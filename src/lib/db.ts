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
  Prioridade,
  Reserva,
  ReservaStatus,
  Solicitacao,
  SolicitacaoCategoria,
  SolicitacaoStatus,
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
