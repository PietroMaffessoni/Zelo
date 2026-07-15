import '@/global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ConfirmProvider } from '@/lib/confirm';
import { configurarNotificacoes, salvarPushToken } from '@/lib/notificacoes';
import { ThemeProvider, useAppTheme } from '@/lib/theme';
import { ToastProvider } from '@/lib/toast';

SplashScreen.preventAutoHideAsync();

function EsconderSplash() {
  const { ready } = useAuth();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  return null;
}

function ConfigurarPush() {
  const { user, condominioId } = useAuth();
  useEffect(() => {
    if (!user) return;
    configurarNotificacoes().then((token) => {
      if (token) salvarPushToken(user.id, condominioId, token);
    });
  }, [user, condominioId]);
  return null;
}

// Fica DENTRO do ThemeProvider para reagir a `palette.background` mutar ao trocar de tema.
function AppShell() {
  const { escuro } = useAppTheme();
  return (
    <>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      <EsconderSplash />
      <ConfigurarPush />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <AppShell />
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
