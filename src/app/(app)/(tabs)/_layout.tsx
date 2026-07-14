import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';
import { isGestor } from '@/lib/types';

export default function TabsLayout() {
  const { papel } = useAuth();
  const { palette } = useAppTheme();
  const gestor = isGestor(papel);
  const porteiro = papel === 'porteiro';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSubtle,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: gestor ? 'Painel' : porteiro ? 'Portaria' : 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={gestor ? 'grid-outline' : porteiro ? 'shield-checkmark-outline' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chamados"
        options={{
          title: 'Chamados',
          href: porteiro ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: 'Reservas',
          href: porteiro ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portaria"
        options={{
          title: 'Portaria',
          href: gestor || porteiro ? undefined : null,
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
