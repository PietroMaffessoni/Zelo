import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { ready, session, memberships } = useAuth();

  if (!ready) return <Loading />;
  if (session && memberships.length > 0) return <Redirect href="/(app)/(tabs)/inicio" />;
  if (session && memberships.length === 0) return <Redirect href="/onboarding" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
