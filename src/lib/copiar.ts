import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';

import { hapticSuccess } from '@/lib/haptics';
import { useToast } from '@/lib/toast';

/**
 * Copia um texto para a área de transferência e confirma com toast e vibração.
 *
 * O `expo-clipboard` funciona igual no celular e no navegador — a barra lateral
 * do computador usava a Clipboard API do navegador direto, e o celular não tinha
 * como copiar nada. Se a cópia falhar (navegador sem permissão), o toast mostra o
 * próprio texto por mais tempo, para dar para copiar à mão.
 */
export function useCopiar() {
  const toast = useToast();
  return useCallback(
    async (texto: string, oQue = 'Código') => {
      try {
        await Clipboard.setStringAsync(texto);
        hapticSuccess();
        toast.sucesso(`${oQue} copiado.`);
      } catch {
        toast.show(texto, { duracao: 6000 });
      }
    },
    [toast],
  );
}
