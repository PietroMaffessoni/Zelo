/**
 * Chamados de manutenção abertos por moradores e seu histórico.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina, termoBusca } from '@/lib/consulta';
import type {
  Chamado,
  ChamadoCategoria,
  ChamadoEvento,
  ChamadoStatus,
  Prioridade,
} from '@/lib/types';

// ------------------------------------------------------------------- Chamados
/**
 * O filtro de status desce para o servidor porque a lista é paginada: filtrar
 * depois de receber descartaria itens da página e poderia devolver uma página
 * vazia com mais registros logo atrás — a lista pareceria ter acabado.
 */
export async function listarChamados(
  condominioId: string,
  pagina = 0,
  status?: ChamadoStatus,
  busca?: string,
): Promise<Chamado[]> {
  let query = supabase
    .from('chamados')
    .select('*, autor:profiles!autor_id(*), responsavel:profiles!responsavel_id(*), unidade:unidades(*)')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const termo = termoBusca(busca);
  if (termo) query = query.or(`titulo.ilike.${termo},descricao.ilike.${termo}`);
  return unwrap(await query.range(...faixaDaPagina(pagina))) as Chamado[];
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
