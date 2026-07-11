import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function Index() {
  const { ready, session, memberships } = useAuth();

  if (!isSupabaseConfigured) return <Redirect href="/setup" />;
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (memberships.length === 0) return <Redirect href="/onboarding" />;
  return <Redirect href="/(app)/(tabs)/inicio" />;
}
