import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth';
import { contarNaoLidas } from '@/lib/db';
import { supabase } from '@/lib/supabase';

type CaixaEntrada = {
  /** Avisos não lidos do condomínio atual — o número na aba "Notificações". */
  naoLidas: number;
  /** Reconta no servidor. A tela de notificações chama depois de marcar lidas. */
  atualizar: () => void;
};

const Contexto = createContext<CaixaEntrada>({ naoLidas: 0, atualizar: () => undefined });

/**
 * Contador de notificações não lidas, compartilhado pela barra de abas, pelo
 * menu lateral e pela própria tela de notificações.
 *
 * Mora num provedor, e não em cada tela, porque o número aparece em três lugares
 * ao mesmo tempo e precisa ser o mesmo nos três. Fica em dia por três caminhos:
 * tempo real (chegou aviso novo), volta do app ao primeiro plano (o tempo real
 * pode ter caído com o celular em repouso) e troca de condomínio.
 */
export function CaixaEntradaProvider({ children }: { children: React.ReactNode }) {
  const { condominioId, user } = useAuth();
  const userId = user?.id ?? null;
  const [naoLidas, setNaoLidas] = useState(0);
  const [versao, setVersao] = useState(0);

  const atualizar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let ativo = true;
    if (!condominioId || !userId) return;
    contarNaoLidas(condominioId, userId)
      .then((n) => {
        if (ativo) setNaoLidas(n);
      })
      // Sem a tabela (migration 0014 não aplicada) ou sem rede: o contador some,
      // o que é melhor do que um número errado.
      .catch(() => {
        if (ativo) setNaoLidas(0);
      });
    return () => {
      ativo = false;
    };
  }, [condominioId, userId, versao]);

  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`caixa-entrada-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${userId}` },
        () => atualizar(),
      )
      .subscribe();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') atualizar();
    });
    return () => {
      supabase.removeChannel(canal);
      sub.remove();
    };
  }, [userId, atualizar]);

  return (
    <Contexto.Provider value={{ naoLidas: condominioId && userId ? naoLidas : 0, atualizar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useCaixaEntrada() {
  return useContext(Contexto);
}
