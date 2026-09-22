import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { gravarCache, lerCache } from '@/lib/cache';

type Estado<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: () => void;
};

type Modo = 'inicial' | 'refresh' | 'silent';

type Opcoes = {
  /** Refaz o fetch quando a tela recupera foco (voltar de um "novo") ou a janela ganha foco no web. Padrão: true. */
  refetchOnFocus?: boolean;
  /**
   * Chave de cache local. Informada, a tela pinta com a última resposta
   * conhecida enquanto a rede responde — e continua legível se ela não
   * responder. Opt-in de propósito: o cache é texto puro no disco, então só
   * entram telas de conteúdo que o condomínio já publica a todos. Ver
   * `lib/cache.ts`.
   */
  cache?: string;
};

/**
 * Hook de leitura: executa `fn` no mount, quando `deps` mudam e — silenciosamente,
 * sem spinner — quando a tela volta ao foco. Isso mantém as listas atualizadas
 * depois de criar um item em outra tela e voltar, sem depender de pull-to-refresh.
 */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = [], opcoes: Opcoes = {}): Estado<T> {
  const { refetchOnFocus = true, cache } = opcoes;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  /** Já veio resposta da rede? Impede o cache (assíncrono) de sobrescrever dado fresco. */
  const respondeuRef = useRef(false);
  /** Há algo desenhado agora? Marcado onde `data` é escrito, nunca lido no render. */
  const temConteudoRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Chave das dependências.
   *
   * `useCallback` exige um array literal — passar `deps` direto deixa a regra
   * sem como verificar o que entra. Como as dependências deste hook são sempre
   * primitivas (ids, papéis, booleanos), serializá-las dá uma dependência única,
   * estável e comparada por valor.
   */
  const chaveDeps = JSON.stringify(deps);

  const executar = useCallback(async (modo: Modo) => {
    if (modo === 'refresh') setRefreshing(true);
    else if (modo === 'inicial') setLoading(true);
    if (modo !== 'silent') setError(null);
    try {
      const r = await fn();
      respondeuRef.current = true;
      temConteudoRef.current = r != null;
      setData(r);
      if (cache) gravarCache(cache, r);
      if (modo === 'silent') setError(null);
    } catch (e: any) {
      // Com conteúdo em tela (veio do cache), a falha de rede não vira estado de
      // erro: apagar o que o usuário já está lendo para mostrar "não foi possível
      // carregar" é pior do que manter o retrato anterior.
      if (!respondeuRef.current && !temConteudoRef.current) {
        setError(e?.message ?? 'Não foi possível carregar os dados.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // `fn` é recriada a cada renderização pelo chamador; quem governa quando
    // refazer a busca é `chaveDeps`, que compara as dependências por valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDeps, cache]);

  useEffect(() => {
    // A regra "não chame setState dentro de efeito" existe para impedir que o
    // React seja usado para copiar estado de um lugar para outro. Aqui é o caso
    // legítimo que ela não distingue: buscar dados é sincronizar com um sistema
    // externo, e acender o indicador de carregamento faz parte dessa mesma
    // operação. Não há como expressar "comece a buscar ao montar" sem isto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    executar('inicial');
  }, [executar]);

  // Hidratação: pinta com o que já se sabe enquanto a rede não responde. Se a
  // resposta chegar primeiro, o cache é descartado — nunca anda para trás.
  useEffect(() => {
    if (!cache) return;
    let ativo = true;
    lerCache<T>(cache).then((guardado) => {
      if (!ativo || guardado == null || respondeuRef.current) return;
      setData(guardado);
      temConteudoRef.current = true;
      setLoading(false);
    });
    return () => {
      ativo = false;
    };
  }, [cache]);

  // Refetch silencioso ao recuperar o foco da tela (ex.: voltar após criar um item).
  // Usa uma ref para manter o callback estável e não refazer o fetch a cada mudança de `deps`.
  const executarRef = useRef(executar);
  useEffect(() => {
    executarRef.current = executar;
  });
  const primeiroFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus) return;
      if (primeiroFoco.current) {
        primeiroFoco.current = false;
        return; // o mount já buscou; não duplicar
      }
      executarRef.current('silent');
    }, [refetchOnFocus]),
  );

  // No web, pull-to-refresh não existe: atualiza ao voltar o foco para a janela.
  useEffect(() => {
    if (Platform.OS !== 'web' || !refetchOnFocus) return;
    const onFocus = () => executarRef.current('silent');
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetchOnFocus]);

  return { data, loading, refreshing, error, refetch: () => executar('refresh') };
}
