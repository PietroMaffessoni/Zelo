/**
 * Achados e perdidos.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina } from '@/lib/consulta';
import type {
  AchadoPerdido,
  AchadoStatus,
} from '@/lib/types';

// ------------------------------------------------------------- Achados e perdidos
export async function listarAchados(condominioId: string, pagina = 0): Promise<AchadoPerdido[]> {
  return unwrap(
    await supabase
      .from('achados_perdidos')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false })
      .range(...faixaDaPagina(pagina)),
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
