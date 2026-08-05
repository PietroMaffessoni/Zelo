import { Redirect, Stack } from 'expo-router';
import { Platform, useWindowDimensions, View } from 'react-native';

import { Sidebar } from '@/components/Sidebar';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useLembretesManutencao, useNotificacoesRealtime } from '@/lib/notificacoes';
import { useAppTheme } from '@/lib/theme';

export default function AppLayout() {
  const { ready, session, memberships, user, condominioId, membershipAtual, profile, papel } = useAuth();
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();

  // Em telas largas a sidebar é a navegação global do app: vive aqui, no Stack que
  // envolve TODAS as telas, para ficar fixa em qualquer rota (não só nas abas).
  const desktop = Platform.OS === 'web' && width >= 1024;

  useNotificacoesRealtime(condominioId, user?.id ?? null, membershipAtual?.unidade_id ?? null, profile?.preferencias_notificacao, papel);
  useLembretesManutencao(condominioId, papel);

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (memberships.length === 0) return <Redirect href="/onboarding" />;

  const stack = (
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

  if (desktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.background }}>
        <Sidebar />
        <View style={{ flex: 1 }}>{stack}</View>
      </View>
    );
  }

  return stack;
}
