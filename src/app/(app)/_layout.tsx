import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useNotificacoesRealtime } from '@/lib/notificacoes';
import { useAppTheme } from '@/lib/theme';

export default function AppLayout() {
  const { ready, session, memberships, user, condominioId, membershipAtual, profile, papel } = useAuth();
  const { palette } = useAppTheme();

  useNotificacoesRealtime(condominioId, user?.id ?? null, membershipAtual?.unidade_id ?? null, profile?.preferencias_notificacao, papel);

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (memberships.length === 0) return <Redirect href="/onboarding" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
