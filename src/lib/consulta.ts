/**
 * Regras de consulta — paginação e busca.
 *
 * Módulo deliberadamente sem NENHUM import: são as decisões de como recortar e
 * filtrar dados, e nada aqui depende de React, do React Native ou do Supabase.
 * Isso as torna verificáveis por teste sem precisar de ambiente de aplicativo —
 * e são justamente as regras cujo erro passa despercebido em revisão (um `%` não
 * escapado, um `range` com um item a mais ou a menos).
 */

/**
 * Quantos registros por página.
 *
 * O app rodava sem nenhum limite: `listarChamados`, `listarLancamentos` e
 * companhia traziam a tabela toda. Num condomínio com dois anos de operação e
 * trezentas unidades, isso é baixar milhares de linhas para mostrar as vinte
 * primeiras — e a conta cai no celular do morador.
 *
 * 40 é o dobro do que cabe numa tela cheia: rola-se um pouco antes de precisar
 * da próxima página, e ainda assim a primeira resposta é pequena.
 */
export const TAMANHO_PAGINA = 40;

/**
 * Intervalo `.range()` do Supabase para a página pedida.
 *
 * O `range` do PostgREST é INCLUSIVO nas duas pontas — daí o `-1`. Sem ele cada
 * página traria um registro a mais, que reapareceria no topo da seguinte.
 */
export function faixaDaPagina(pagina: number, tamanho = TAMANHO_PAGINA): [number, number] {
  const inicio = Math.max(0, pagina) * tamanho;
  return [inicio, inicio + tamanho - 1];
}

/**
 * Trecho de busca para `ilike`, com curinga dos dois lados.
 *
 * A busca acontece no servidor porque as listas são paginadas: filtrar no
 * cliente só procuraria dentro das páginas já baixadas, e o usuário concluiria
 * que o registro não existe quando ele está na página seguinte.
 *
 * `%`, `_` e a própria barra invertida são escapados. Sem isso, digitar "%" na
 * busca casaria com qualquer coisa e "_" com qualquer caractere — o usuário
 * veria a lista inteira e pensaria que a busca não funciona.
 */
export function termoBusca(busca?: string | null): string | null {
  const limpo = busca?.trim();
  if (!limpo) return null;
  return `%${limpo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
