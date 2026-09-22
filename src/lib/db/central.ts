/**
 * Central do morador: solicitações à administração.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { unwrap } from '@/lib/db/_comum';
import { supabase } from '@/lib/supabase';
import { faixaDaPagina } from '@/lib/consulta';
import type {
  Solicitacao,
  SolicitacaoCategoria,
  SolicitacaoStatus,
} from '@/lib/types';

// ----------------------------------------------------- Central do morador (solicitações)
export async function listarSolicitacoes(condominioId: string, pagina = 0): Promise<Solicitacao[]> {
  return unwrap(
    await supabase
      .from('solicitacoes')
      .select('*, morador:profiles(*)')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false })
      .range(...faixaDaPagina(pagina)),
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
