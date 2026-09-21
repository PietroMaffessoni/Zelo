import { useEffect, useRef, useState } from 'react';

import { urlsAssinadas, type Bucket } from '@/lib/storage';

/**
 * URLs assinadas das fotos de uma lista, resolvidas conforme a lista cresce.
 *
 * Os buckets de foto são privados: cada imagem precisa de uma URL assinada para
 * ser exibida. Antes isso era feito dentro do mesmo `useFetch` da lista, o que
 * funcionava enquanto a lista vinha inteira de uma vez — com paginação, a
 * segunda página traria fotos sem URL.
 *
 * Aqui o mapa é ACUMULADO e só pede assinatura para o que ainda não tem, então
 * carregar a página seguinte assina apenas as fotos novas em vez de reassinar
 * tudo. Os caminhos já pedidos ficam numa ref para que uma re-renderização não
 * dispare a mesma assinatura de novo.
 */
export function useFotosAssinadas(bucket: Bucket, paths: (string | null | undefined)[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const pedidosRef = useRef<Set<string>>(new Set());

  // Chave estável do conjunto: sem isso o efeito rodaria a cada renderização,
  // porque o array de caminhos é recriado pelo componente toda vez.
  const chave = paths.filter(Boolean).sort().join('|');

  useEffect(() => {
    const novos = paths.filter((p): p is string => !!p && !pedidosRef.current.has(p));
    if (novos.length === 0) return;
    novos.forEach((p) => pedidosRef.current.add(p));

    let ativo = true;
    urlsAssinadas(bucket, novos)
      .then((mapa) => {
        if (ativo) setUrls((atuais) => ({ ...atuais, ...mapa }));
      })
      .catch(() => {
        // Assinatura falhou: os caminhos saem da lista de pedidos para uma nova
        // tentativa na próxima atualização. A imagem fica sem aparecer, o que já
        // é tratado pelo fallback de ícone em cada tela.
        novos.forEach((p) => pedidosRef.current.delete(p));
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, chave]);

  return urls;
}
