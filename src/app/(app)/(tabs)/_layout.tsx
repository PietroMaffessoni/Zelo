import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useLayout } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';
import { isGestor } from '@/lib/types';

export default function TabsLayout() {
  const { papel } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { amplo, estreito } = useLayout();
  const gestor = isGestor(papel);
  const porteiro = papel === 'porteiro';
  const zelador = papel === 'zelador';
  const morador = !gestor && !porteiro && !zelador;

  // Em telas largas (tablet e acima, no web) a navegação vira a sidebar fixa
  // (renderizada no layout de (app), que envolve todas as telas) e a barra de
  // abas some. O corte é o mesmo de `(app)/_layout` — as duas precisam trocar
  // juntas, senão a tela fica sem navegação nenhuma ou com as duas ao mesmo tempo.
  const lateral = Platform.OS === 'web' && amplo;

  // Exibe 3–4 destinos de alto tráfego por papel; os demais ficam ocultos
  // (href: null) mas continuam navegáveis por links/ações rápidas.
  const mostrar = {
    chamados: morador || gestor || zelador,
    reservas: morador,
    portaria: gestor || porteiro,
  };

  return (
    <Tabs
      tabBar={lateral ? () => null : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSubtle,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          // Respeita a safe area inferior (home indicator / navegação por gesto)
          // em vez de uma altura fixa que fica colada no indicador do sistema.
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
        // Rótulo um grau menor e com entreletra aberta: a barra fica mais calma
        // e o ícone volta a ser o que identifica a aba. Num celular pequeno cai
        // mais um degrau: cinco rótulos disputando 320px começam a truncar, e um
        // rótulo cortado ("Em andame...") é pior que um rótulo miúdo.
        tabBarLabelStyle: { fontSize: estreito ? 9.5 : 10.5, fontWeight: '600', letterSpacing: 0.1, marginTop: 1 },
        tabBarItemStyle: { paddingHorizontal: 2 },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: gestor ? 'Painel' : porteiro ? 'Início' : 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={gestor ? 'grid-outline' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chamados"
        options={{
          title: 'Chamados',
          href: mostrar.chamados ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: 'Reservas',
          href: mostrar.reservas ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portaria"
        options={{
          title: 'Portaria',
          href: mostrar.portaria ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
