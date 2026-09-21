import { useCallback } from 'react';

import { useToast } from '@/lib/toast';

/**
 * Mensagem de erro apresentável.
 *
 * Erro cru do Postgres/PostgREST não serve para o usuário — e pior, pode vazar
 * nome de tabela, de coluna e de constraint. Os códigos abaixo são os que o
 * app de fato produz e têm tradução própria; o resto vira uma frase genérica, e
 * quem precisa do motivo real olha o log.
 */
function mensagemApresentavel(e: unknown, padrao?: string): string {
  const erro = e as { code?: string; message?: string } | null;
  const codigo = erro?.code;
  const bruta = erro?.message ?? '';

  if (codigo === '23505') return 'Esse registro já existe.';
  if (codigo === '23503') return 'Este item está vinculado a outro e não pode ser removido.';
  if (codigo === '42501' || bruta.includes('row-level security')) {
    return 'Você não tem permissão para esta ação.';
  }
  if (bruta.toLowerCase().includes('network') || bruta.toLowerCase().includes('fetch')) {
    return 'Sem conexão. Verifique sua internet.';
  }
  // Exceções levantadas de propósito no banco (raise exception ... P0001) são
  // escritas para o usuário final — essas passam inteiras.
  if (codigo === 'P0001' && bruta) return bruta;

  return padrao ?? 'Não foi possível concluir. Tente novamente.';
}

type Opcoes = {
  /** Toast de confirmação quando dá certo. Omitir quando a própria tela já muda. */
  sucesso?: string;
  /** Mensagem de erro específica desta ação, quando a genérica não ajuda. */
  erro?: string;
  /** Roda dando certo ou errado — é onde o estado de "processando" é desligado. */
  sempre?: () => void;
};

/**
 * Executa uma mutação avisando o usuário quando falha.
 *
 * Trinta e uma ações do app chamavam o banco assim:
 *
 *     setProcessando(id);
 *     await alterarStatus(id, novo);
 *     setProcessando(null);
 *     refetch();
 *
 * Se a chamada lançasse — rede caída, RLS negando, registro duplicado —, nada
 * depois dela rodava: o `setProcessando(null)` não acontecia e o botão ficava
 * girando para sempre, sem uma palavra sobre o que houve. O usuário concluía
 * que o app travou.
 *
 * `sempre` é o que garante a limpeza do estado nos dois caminhos, e o retorno
 * booleano deixa a tela decidir o que fazer só quando deu certo (recarregar,
 * fechar formulário, navegar).
 */
export function useAcao() {
  const toast = useToast();

  return useCallback(
    async (executar: () => Promise<unknown>, opcoes?: Opcoes): Promise<boolean> => {
      try {
        await executar();
        if (opcoes?.sucesso) toast.sucesso(opcoes.sucesso);
        return true;
      } catch (e) {
        toast.erro(mensagemApresentavel(e, opcoes?.erro));
        return false;
      } finally {
        opcoes?.sempre?.();
      }
    },
    [toast],
  );
}
