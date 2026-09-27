/**
 * Condomínios que a própria conta pode recuperar.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { supabase } from '@/lib/supabase';

import { unwrap } from '@/lib/db/_comum';

export type CondominioRecuperavel = { id: string; nome: string; cidade: string | null; uf: string | null };

/**
 * Onde a pessoa já foi síndica (ou que ela criou) e que hoje está sem nenhum
 * gestor ativo — ver a migration 0010 para por que a regra é tão estreita.
 */
export async function listarCondominiosRecuperaveis(): Promise<CondominioRecuperavel[]> {
  return (unwrap(await supabase.rpc('condominios_recuperaveis')) as CondominioRecuperavel[] | null) ?? [];
}
