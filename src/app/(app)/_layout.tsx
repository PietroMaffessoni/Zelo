import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { Sidebar } from '@/components/Sidebar';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useLembretesManutencao, useNotificacoesRealtime } from '@/lib/notificacoes';
import { useLayout } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';

export default function AppLayout() {
  const { ready, session, memberships, user, condominioId, membershipAtual, profile, papel } = useAuth();
  const { palette } = useAppTheme();
  // A sidebar é a navegação global do app: vive aqui, no Stack que envolve TODAS
  // as telas, para ficar fixa em qualquer rota (não só nas abas). Quem decide se
  // ela entra é `useLayout`, que cruza largura, altura e plataforma — ver
  // `navegacaoLateral`.
  const { navegacaoLateral } = useLayout();

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

  if (navegacaoLateral) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.background }}>
        <Sidebar />
        <View style={{ flex: 1 }}>{stack}</View>
      </View>
    );
  }

  return stack;
}
