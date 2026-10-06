import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CabecalhoApp } from '@/components/navegacao/CabecalhoApp';
import { MenuLateral } from '@/components/navegacao/MenuLateral';
import { Sidebar } from '@/components/Sidebar';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { CabecalhoGlobalContext } from '@/lib/cabecalho';
import { CaixaEntradaProvider } from '@/lib/caixaEntrada';
import { useLembretesManutencao, useNotificacoesRealtime, useRespostaNotificacao } from '@/lib/notificacoes';
import { useLayout } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';

export default function AppLayout() {
  const { ready, session, memberships, membershipsPendentes, user, condominioId, membershipAtual, profile, papel, escolhendoCondominio } = useAuth();
  const { palette } = useAppTheme();
  // A sidebar é a navegação global do app: vive aqui, no Stack que envolve TODAS
  // as telas, para ficar fixa em qualquer rota (não só nas abas). Quem decide se
  // ela entra é `useLayout`, que cruza largura, altura e plataforma — ver
  // `navegacaoLateral`.
  const { navegacaoLateral } = useLayout();
  const [menuAberto, setMenuAberto] = useState(false);

  useNotificacoesRealtime(condominioId, user?.id ?? null, membershipAtual?.unidade_id ?? null, profile?.preferencias_notificacao, papel);
  useLembretesManutencao(condominioId, papel);
  // Aqui e nao no layout raiz: navegar exige que a pessoa ja esteja dentro do
  // app. Tocar numa notificacao na tela de login levaria a uma rota protegida
  // e o guarda devolveria para o login — parecendo que o toque nao funcionou.
  useRespostaNotificacao();

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (memberships.length === 0) return <Redirect href="/onboarding" />;
  // Recém-logado e com mais de um condomínio: mostra todos antes de escolher um
  // por ele. Com um só, a lista seria um toque a mais sem decisão nenhuma.
  if (escolhendoCondominio && memberships.length + membershipsPendentes.length > 1) {
    return <Redirect href="/condominios" />;
  }

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
      <CaixaEntradaProvider>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.background }}>
          <Sidebar />
          <View style={{ flex: 1 }}>{stack}</View>
        </View>
      </CaixaEntradaProvider>
    );
  }

  // Celular: cabeçalho fixo em cima (voltar · Zelo · menu), as telas no meio e
  // o menu lateral por cima de tudo quando aberto. O contexto avisa as telas de
  // que o topo e a seta de voltar já estão resolvidos — ver `useCabecalhoGlobal`.
  return (
    <CaixaEntradaProvider>
      <CabecalhoGlobalContext.Provider value>
        <View style={{ flex: 1, backgroundColor: palette.background }}>
          <CabecalhoApp onMenu={() => setMenuAberto(true)} />
          <View style={{ flex: 1 }}>{stack}</View>
          <MenuLateral aberto={menuAberto} onFechar={() => setMenuAberto(false)} />
        </View>
      </CabecalhoGlobalContext.Provider>
    </CaixaEntradaProvider>
  );
}
