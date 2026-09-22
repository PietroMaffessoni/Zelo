/**
 * Agenda de eventos do condomínio.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';

import type {
  Evento,
  TipoEvento,
} from '@/lib/types';

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
