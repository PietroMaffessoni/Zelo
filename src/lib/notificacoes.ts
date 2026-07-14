import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { PreferenciasNotificacao } from '@/lib/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Pede permissão e tenta obter um push token remoto (falha silenciosamente no Expo Go,
 * que não suporta push remoto desde o SDK 53 — a notificação local continua funcionando).
 * Chamar uma vez ao abrir o app.
 */
export async function configurarNotificacoes(): Promise<string | null> {
  try {
    const permissao = await Notifications.requestPermissionsAsync();
    if (!permissao.granted || !Device.isDevice) return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function salvarPushToken(userId: string, condominioId: string | null, token: string) {
  const plataforma = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  await supabase.from('push_tokens').upsert(
    { user_id: userId, condominio_id: condominioId, expo_push_token: token, plataforma, ativo: true },
    { onConflict: 'user_id,expo_push_token' },
  );
}

export async function notificarLocal({
  titulo,
  corpo,
  dados,
}: {
  titulo: string;
  corpo: string;
  dados?: Record<string, unknown>;
}) {
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: corpo, data: dados },
    trigger: null,
  });
}

/**
 * Dispara notificações locais a partir de eventos em tempo real do condomínio atual.
 * Só funciona com o app aberto (primeiro/segundo plano) — não acorda o app fechado
 * nem notifica outro dispositivo do mesmo morador. Push remoto de verdade exige
 * development build (EAS), fora do escopo desta base.
 */
export function useNotificacoesRealtime(
  condominioId: string | null,
  userId: string | null,
  unidadeId: string | null,
  preferencias: PreferenciasNotificacao | undefined,
  papel?: string | null,
) {
  const prefsRef = useRef(preferencias);
  prefsRef.current = preferencias;
  const staffRef = useRef(papel);
  staffRef.current = papel;

  useEffect(() => {
    if (!condominioId || !userId) return;

    const canal = supabase
      .channel(`realtime-condominio-${condominioId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comunicados', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          if (prefsRef.current?.comunicados === false) return;
          const c = payload.new as { titulo?: string; autor_id?: string };
          if (c.autor_id === userId) return;
          notificarLocal({ titulo: 'Novo comunicado', corpo: c.titulo ?? '' });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chamados', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          if (prefsRef.current?.chamados === false) return;
          const chamado = payload.new as { autor_id?: string; status?: string; titulo?: string };
          if (chamado.autor_id === userId) {
            notificarLocal({ titulo: 'Seu chamado foi atualizado', corpo: `${chamado.titulo ?? 'Chamado'} · ${chamado.status}` });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'encomendas', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          if (prefsRef.current?.encomendas === false) return;
          const encomenda = payload.new as { descricao?: string; unidade_id?: string };
          if (unidadeId && encomenda.unidade_id === unidadeId) {
            notificarLocal({ titulo: 'Chegou uma encomenda', corpo: encomenda.descricao ?? '' });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reservas', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          if (prefsRef.current?.reservas === false) return;
          const reserva = payload.new as { morador_id?: string; status?: string };
          if (reserva.morador_id === userId) {
            notificarLocal({ titulo: 'Sua reserva foi atualizada', corpo: `Status: ${reserva.status}` });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alertas_sos', filter: `condominio_id=eq.${condominioId}` },
        (payload) => {
          const papelAtual = staffRef.current;
          const ehStaff = papelAtual === 'sindico' || papelAtual === 'admin' || papelAtual === 'porteiro';
          if (!ehStaff) return;
          const sos = payload.new as { tipo?: string; user_id?: string };
          if (sos.user_id === userId) return;
          notificarLocal({ titulo: '🚨 Alerta de emergência', corpo: `Um morador acionou um SOS (${sos.tipo ?? 'emergência'}).` });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [condominioId, userId, unidadeId]);
}
