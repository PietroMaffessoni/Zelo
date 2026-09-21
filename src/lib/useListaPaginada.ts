import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Quantos registros por página.
 *
 * O app inteiro rodava sem nenhum `limit`: `listarChamados`, `listarLancamentos`
 * e companhia traziam a tabela toda. Num condomínio com dois anos de operação e
 * trezentas unidades, isso é baixar milhares de linhas para mostrar as vinte
 * primeiras — e a conta cai no celular do morador, na rede dele.
 *
 * 40 é o dobro do que cabe numa tela cheia: rola-se um pouco antes de precisar
 * da próxima página, e ainda assim a primeira resposta é pequena.
 */
export const TAMANHO_PAGINA = 40;

/** Intervalo `.range()` do Supabase para a página pedida. */
export function faixaDaPagina(pagina: number, tamanho = TAMANHO_PAGINA): [number, number] {
  const inicio = pagina * tamanho;
  return [inicio, inicio + tamanho - 1];
}

type Estado<T> = {
  itens: T[];
  /** Primeira carga (mostra esqueleto). */
  loading: boolean;
  /** Pull-to-refresh. */
  refreshing: boolean;
  /** Carga de uma página seguinte (mostra o botão em estado ocupado). */
  carregandoMais: boolean;
  /** Ainda pode haver mais — a última página veio cheia. */
  temMais: boolean;
  error: string | null;
  carregarMais: () => void;
  refetch: () => void;
};

type Opcoes = {
  refetchOnFocus?: boolean;
  tamanhoPagina?: number;
};

/**
 * Lista paginada com "carregar mais".
 *
 * Irmão do `useFetch`, com a mesma atualização silenciosa ao recuperar o foco —
 * a diferença é que aqui o resultado é acumulado em páginas em vez de
 * substituído. Ao atualizar (pull-to-refresh, foco, mudança de `deps`) a lista
 * volta à primeira página: manter dez páginas abertas e recarregar todas seria
 * pior que recomeçar, e o usuário que atualiza está querendo ver o topo.
 *
 * `temMais` é inferido do tamanho da última página: veio cheia, provavelmente há
 * mais. Isso evita um `count: 'exact'` em toda consulta, que no Postgres custa
 * uma varredura a mais só para desenhar um botão.
 */
export function useListaPaginada<T>(
  carregarPagina: (pagina: number) => Promise<T[]>,
  deps: unknown[] = [],
  opcoes: Opcoes = {},
): Estado<T> {
  const { refetchOnFocus = true, tamanhoPagina = TAMANHO_PAGINA } = opcoes;

  const [itens, setItens] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Página já carregada. Em ref, e não em estado, porque `carregarMais` precisa
  // do valor atual sem se recriar a cada página — e uma corrida entre dois
  // toques no botão pediria a mesma página duas vezes.
  const paginaRef = useRef(0);
  const ocupadoRef = useRef(false);

  const carregarRef = useRef(carregarPagina);
  useEffect(() => {
    carregarRef.current = carregarPagina;
  });

  /**
   * Chave das dependências.
   *
   * `useCallback` exige um array literal — passar `[...deps]` com spread deixa a
   * regra sem como verificar o que entra. Como todas as dependências deste hook
   * são primitivas (ids, papéis, booleanos), serializá-las num texto dá uma
   * dependência única, estável e comparável por valor: muda quando o conteúdo
   * muda, e não a cada renderização como faria o array em si.
   */
  const chaveDeps = JSON.stringify(deps);

  const recomecar = useCallback(
    async (modo: 'inicial' | 'refresh' | 'silent') => {
      if (ocupadoRef.current) return;
      ocupadoRef.current = true;
      if (modo === 'refresh') setRefreshing(true);
      else if (modo === 'inicial') setLoading(true);
      if (modo !== 'silent') setError(null);
      try {
        const pagina = await carregarRef.current(0);
        paginaRef.current = 0;
        setItens(pagina);
        setTemMais(pagina.length >= tamanhoPagina);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? 'Não foi possível carregar os dados.');
      } finally {
        ocupadoRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tamanhoPagina],
  );

  // A ref mantém `recomecar` alcançável sem virar dependência de quem o chama.
  // `useRef(recomecar)` já nasce com a primeira versão, então o efeito de carga
  // abaixo encontra a função certa mesmo na montagem.
  const recomecarRef = useRef(recomecar);
  useEffect(() => {
    recomecarRef.current = recomecar;
  });

  // Recomeça na primeira carga e sempre que as dependências mudarem de valor.
  // Depender de `chaveDeps` (e não de `recomecar`) é o que deixa a lista voltar
  // à página 1 ao trocar de condomínio ou de filtro.
  useEffect(() => {
    recomecarRef.current('inicial');
  }, [chaveDeps]);

  const carregarMais = useCallback(async () => {
    if (ocupadoRef.current || !temMais) return;
    ocupadoRef.current = true;
    setCarregandoMais(true);
    try {
      const proxima = paginaRef.current + 1;
      const pagina = await carregarRef.current(proxima);
      paginaRef.current = proxima;
      setItens((atuais) => [...atuais, ...pagina]);
      setTemMais(pagina.length >= tamanhoPagina);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível carregar mais itens.');
    } finally {
      ocupadoRef.current = false;
      setCarregandoMais(false);
    }
  }, [temMais, tamanhoPagina]);

  const primeiroFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus) return;
      if (primeiroFoco.current) {
        primeiroFoco.current = false;
        return;
      }
      recomecarRef.current('silent');
    }, [refetchOnFocus]),
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !refetchOnFocus) return;
    const aoFocar = () => recomecarRef.current('silent');
    window.addEventListener('focus', aoFocar);
    return () => window.removeEventListener('focus', aoFocar);
  }, [refetchOnFocus]);

  return {
    itens,
    loading,
    refreshing,
    carregandoMais,
    temMais,
    error,
    carregarMais,
    refetch: () => recomecarRef.current('refresh'),
  };
}
