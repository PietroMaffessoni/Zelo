/**
 * Peças compartilhadas entre os módulos de acesso a dados.
 *
 * O prefixo `_` marca que não é um domínio: o `index.ts` não o reexporta, e
 * nenhuma tela deve importar daqui.
 */

/**
 * Desempacota a resposta do Supabase, transformando erro em exceção.
 *
 * O cliente devolve `{ data, error }` e nunca lança sozinho. Sem isto, cada
 * consulta precisaria checar `error` na mão — e uma que esquecesse devolveria
 * `null` silenciosamente, que a tela renderizaria como lista vazia em vez de
 * avisar que a busca falhou. Lançando, o erro chega ao `useFetch` (que mostra o
 * estado de falha) ou ao `useAcao` (que avisa por toast).
 */
export function unwrap<T>({ data, error }: { data: T | null; error: any }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/**
 * A consulta falhou porque a tabela ou função ainda não existe no banco — uma
 * migration nova que não foi aplicada. Para quem usa, isso não é falha: o
 * recurso só ainda não tem nada a mostrar. Use apenas em recursos novos e
 * opcionais (a caixa de notificações), nunca para esconder erro de tela que
 * sempre existiu.
 */
export function recursoAusente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return ['PGRST205', 'PGRST202', '42P01', '42883'].includes(error.code ?? '');
}
