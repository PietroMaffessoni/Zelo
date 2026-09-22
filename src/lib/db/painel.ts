/**
 * Resumos que alimentam a tela inicial de cada papel.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { supabase } from '@/lib/supabase';

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
