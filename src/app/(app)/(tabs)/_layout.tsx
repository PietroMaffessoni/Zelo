import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isGestor } from '@/lib/types';

export default function TabsLayout() {
  const { papel } = useAuth();
  const gestor = isGestor(papel);

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
          title: gestor ? 'Painel' : 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={gestor ? 'grid-outline' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chamados"
        options={{
          title: 'Chamados',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
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
