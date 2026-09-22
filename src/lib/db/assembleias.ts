/**
 * Assembleias, pautas, votação e propostas dos moradores.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina } from '@/lib/consulta';
import type {
  Assembleia,
  AssembleiaOpcao,
  AssembleiaPauta,
  AssembleiaVoto,
  PropostaPauta,
  StatusProposta,
} from '@/lib/types';

// ------------------------------------------------------------------ Assembleias
/** `grupo` filtra no servidor pelo mesmo motivo de `listarChamados`. */
export async function listarAssembleias(
  condominioId: string,
  pagina = 0,
  grupo?: 'proximas' | 'encerradas',
): Promise<Assembleia[]> {
  const statusDoGrupo: Record<'proximas' | 'encerradas', string[]> = {
    proximas: ['convocada', 'em_andamento'],
    encerradas: ['encerrada', 'cancelada'],
  };
  let query = supabase
    .from('assembleias')
    .select('*')
    .eq('condominio_id', condominioId)
    .order('data_hora', { ascending: false });
  if (grupo) query = query.in('status', statusDoGrupo[grupo]);
  return unwrap(await query.range(...faixaDaPagina(pagina))) as Assembleia[];
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

  // A contagem vem da RPC de apuração, não de ler a tabela de votos: `assembleia_votos`
  // só entrega a linha de quem tem razão para vê-la (o próprio eleitor e o gestor,
  // que lavra a ata). Contar no cliente exigiria baixar o voto nominal de todas as
  // unidades para mostrar um placar — que é o que expunha em quem cada vizinho votou.
  const [opcoesRes, apuracaoRes] = await Promise.all([
    supabase.from('assembleia_opcoes').select('*').in('pauta_id', pautaIds).order('ordem'),
    supabase.rpc('apurar_assembleia', { p_assembleia: assembleiaId }),
  ]);
  const opcoes = unwrap(opcoesRes) as AssembleiaOpcao[];
  const apuracao = unwrap(apuracaoRes) as { pauta_id: string; opcao_id: string; votos: number }[];
  const totalPorOpcao = new Map(apuracao.map((a) => [a.opcao_id, Number(a.votos)]));

  return pautas.map((p) => ({
    ...p,
    opcoes: opcoes
      .filter((o) => o.pauta_id === p.id)
      .map((o) => ({ ...o, votos: totalPorOpcao.get(o.id) ?? 0 })),
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

// -------------------------------------------------------- Propostas de pauta (moradores)
export async function listarPropostas(
  condominioId: string,
  userId: string,
  pagina = 0,
): Promise<PropostaPauta[]> {
  const propostas = unwrap(
    await supabase
      .from('propostas_pauta')
      .select('*, autor:profiles!autor_id(*)')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false })
      .range(...faixaDaPagina(pagina)),
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
