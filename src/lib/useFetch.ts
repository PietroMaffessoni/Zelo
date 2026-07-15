import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

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
};

/**
 * Hook de leitura: executa `fn` no mount, quando `deps` mudam e — silenciosamente,
 * sem spinner — quando a tela volta ao foco. Isso mantém as listas atualizadas
 * depois de criar um item em outra tela e voltar, sem depender de pull-to-refresh.
 */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = [], opcoes: Opcoes = {}): Estado<T> {
  const { refetchOnFocus = true } = opcoes;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executar = useCallback(async (modo: Modo) => {
    if (modo === 'refresh') setRefreshing(true);
    else if (modo === 'inicial') setLoading(true);
    if (modo !== 'silent') setError(null);
    try {
      const r = await fn();
      setData(r);
      if (modo === 'silent') setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    executar('inicial');
  }, [executar]);

  // Refetch silencioso ao recuperar o foco da tela (ex.: voltar após criar um item).
  // Usa uma ref para manter o callback estável e não refazer o fetch a cada mudança de `deps`.
  const executarRef = useRef(executar);
  executarRef.current = executar;
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
