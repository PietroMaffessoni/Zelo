/**
 * Trilha de atos de gestão (setup.sql seção 13).
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina } from '@/lib/consulta';
import type {
  RegistroAuditoria,
} from '@/lib/types';

// ------------------------------------------------------------------ Auditoria
/**
 * Trilha de auditoria do condomínio (síndico e conselho — ver `auditoria_select`).
 * Paginada como as demais listas: é a tabela que mais cresce no produto, já que
 * ganha uma linha a cada ato de gestão.
 */
export async function listarAuditoria(
  condominioId: string,
  pagina = 0,
  entidade?: string,
): Promise<RegistroAuditoria[]> {
  let query = supabase
    .from('auditoria')
    .select('*')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: false });
  if (entidade) query = query.eq('entidade', entidade);
  return unwrap(await query.range(...faixaDaPagina(pagina))) as RegistroAuditoria[];
}

/**
 * Prazos de retenção de dados de portaria (LGPD — ver setup.sql seção 14).
 * `0` significa "nunca expurgar", para condomínios cuja convenção exija guardar.
 */
export async function atualizarRetencao(
  condominioId: string,
  dados: { retencao_visitantes_dias?: number; retencao_encomendas_dias?: number },
) {
  await supabase.from('condominios').update(dados).eq('id', condominioId);
}
