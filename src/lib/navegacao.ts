import { usePathname, useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * Volta para a tela anterior com segurança.
 *
 * `router.back()` puro quebra quando não existe histórico — acontece no web ao
 * abrir a rota por link direto ou dar F5 na página, e dispara o aviso
 * "The action 'GO_BACK' was not handled by any navigator". Nesses casos caímos
 * na rota-pai (ex.: `/comunicados/novo` → `/comunicados`) ou no `fallback`.
 */
export function useVoltar(fallback?: Href) {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const pai = pathname.split('/').slice(0, -1).join('/');
    router.replace((fallback ?? ((pai || '/inicio') as Href)) as Href);
  }, [router, pathname, fallback]);
}
