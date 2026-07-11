import { useCallback, useEffect, useState } from 'react';

type Estado<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Hook simples de leitura: executa `fn` no mount e quando `deps` mudam,
 * com estados de carregamento, atualização (pull-to-refresh) e erro.
 */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []): Estado<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executar = useCallback(async (modo: 'inicial' | 'refresh') => {
    if (modo === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const r = await fn();
      setData(r);
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

  return { data, loading, refreshing, error, refetch: () => executar('refresh') };
}
