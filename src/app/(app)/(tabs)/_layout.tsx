import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';
import { isGestor } from '@/lib/types';

export default function TabsLayout() {
  const { papel } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gestor = isGestor(papel);
  const porteiro = papel === 'porteiro';
  const morador = !gestor && !porteiro;

  // Em telas largas (web/desktop) a navegação vira uma sidebar fixa e a tab bar
  // inferior some — aproveita melhor a tela e evita o visual de "celular esticado".
  const desktop = Platform.OS === 'web' && width >= 1024;

  // Exibe 3–4 destinos de alto tráfego por papel; os demais ficam ocultos
  // (href: null) mas continuam navegáveis por links/ações rápidas.
  const mostrar = {
    chamados: morador || gestor,
    reservas: morador,
    portaria: gestor || porteiro,
  };

  const tabs = (
    <Tabs
      tabBar={desktop ? () => null : undefined}
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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

  if (desktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.background }}>
        <Sidebar />
        <View style={{ flex: 1 }}>{tabs}</View>
      </View>
    );
  }

  return tabs;
}
