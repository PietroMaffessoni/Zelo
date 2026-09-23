import '@/global.css';

import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErroFatal } from '@/components/ErroFatal';
import { palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ConfirmProvider } from '@/lib/confirm';
import { configurarNotificacoes, salvarPushToken } from '@/lib/notificacoes';
import { ThemeProvider, useAppTheme } from '@/lib/theme';
import { ToastProvider } from '@/lib/toast';

SplashScreen.preventAutoHideAsync();

/** O expo-router procura por este nome exportado do layout raiz. Sem ele, um
 *  erro de renderização em produção vira tela branca. */
export { ErroFatal as ErrorBoundary };

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
  // Segura o app na splash até a fonte de títulos carregar (evita "flash" do tipo
  // do sistema trocando pela Plus Jakarta Sans). A splash já está travada por
  // SplashScreen.preventAutoHideAsync() no topo do módulo.
  const [fontesCarregadas, erroFonte] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  // `erroFonte` entra na condição porque `fontesCarregadas` nunca vira true
  // quando o carregamento falha — e este `return null`, somado à splash travada
  // acima, deixaria o app parado na tela de abertura para sempre. Fonte é
  // enfeite; sem ela o app abre no tipo do sistema, que é o certo a fazer.
  if (!fontesCarregadas && !erroFonte) return null;

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
