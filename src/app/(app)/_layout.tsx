import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function AppLayout() {
  const { ready, session, memberships } = useAuth();

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
