/**
 * Biblioteca de documentos do condomínio.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina, termoBusca } from '@/lib/consulta';
import type {
  CategoriaDocumento,
  Documento,
} from '@/lib/types';

// ---------------------------------------------------------------------- Documentos
export async function listarDocumentos(
  condominioId: string,
  categoria?: CategoriaDocumento,
  pagina = 0,
  busca?: string,
): Promise<Documento[]> {
  let query = supabase
    .from('documentos')
    .select('*')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: false });
  if (categoria) query = query.eq('categoria', categoria);
  const termo = termoBusca(busca);
  if (termo) query = query.or(`titulo.ilike.${termo},descricao.ilike.${termo}`);
  return unwrap(await query.range(...faixaDaPagina(pagina))) as Documento[];
}

export async function criarDocumento(input: {
  condominio_id: string;
  categoria: CategoriaDocumento;
  titulo: string;
  descricao?: string | null;
  arquivo_path?: string | null;
  arquivo_nome?: string | null;
  tamanho_bytes?: number | null;
  publicado_por: string;
}): Promise<Documento> {
  return unwrap(await supabase.from('documentos').insert(input).select('*').single());
}

export async function removerDocumento(id: string) {
  await supabase.from('documentos').delete().eq('id', id);
}
