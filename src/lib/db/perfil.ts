/**
 * Preferências do próprio usuário.
 *
 * Parte de `@/lib/db` — ver `index.ts` para por que o acesso a dados está
 * dividido por domínio.
 */
import { supabase } from '@/lib/supabase';

import type {
  PreferenciasNotificacao,
} from '@/lib/types';

// ------------------------------------------------------------------ Notificações
export async function atualizarPreferenciasNotificacao(userId: string, preferencias: PreferenciasNotificacao) {
  await supabase.from('profiles').update({ preferencias_notificacao: preferencias }).eq('id', userId);
}
