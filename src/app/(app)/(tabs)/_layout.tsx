import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useLayout } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';
import { isGestor } from '@/lib/types';

/**
 * Altura da barra de abas, montada a partir do que ela precisa conter.
 *
 * Antes era `58 + insets.bottom` com 6px de respiro em cima e 8px embaixo. Num
 * iPhone isso funcionava por acidente: os ~34px do home indicator entravam na
 * altura mas o respiro de baixo virava o próprio inset, então sobravam 52px de
 * área útil — exatamente o necessário. Sem safe area inferior (navegador em
 * largura de celular, Android com navegação por botões) sobravam 58−6−8 = 44px,
 * e o rótulo, que precisa de 14, recebia 4: as palavras apareciam cortadas ao
 * meio embaixo dos ícones.
 *
 * Aqui a área útil é a mesma nos dois casos, porque a altura é a soma das
 * partes. `ALTURA_ICONE` é fixa em 28 dentro do react-navigation (`ICON_SIZE_TALL`)
 * e não muda se passarmos um `size` menor ao ícone — por isso entra como constante
 * e não como algo que dê para espremer.
 */
const ALTURA_ICONE = 28;
/** Respiro próprio do item da aba no react-navigation: 5px em cima e 5 embaixo. */
const RESPIRO_ITEM = 10;
const LINHA_ROTULO = 14;
const ALTURA_CONTEUDO = RESPIRO_ITEM + ALTURA_ICONE + LINHA_ROTULO;
const PADDING_TOPO = 6;
const PADDING_BASE = 8;

export default function TabsLayout() {
  const { papel } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { navegacaoLateral } = useLayout();
  const gestor = isGestor(papel);
  const porteiro = papel === 'porteiro';
  const zelador = papel === 'zelador';
  const morador = !gestor && !porteiro && !zelador;

  // Exibe 3–4 destinos de alto tráfego por papel; os demais ficam ocultos
  // (href: null) mas continuam navegáveis por links/ações rápidas.
  const mostrar = {
    chamados: morador || gestor || zelador,
    reservas: morador,
    portaria: gestor || porteiro,
  };

  return (
    <Tabs
      tabBar={navegacaoLateral ? () => null : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSubtle,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          // A altura é o conteúdo MAIS os respiros, nunca um número fixo: assim a
          // área útil é a mesma com ou sem safe area, e o rótulo tem onde caber
          // nos dois casos. Ver ALTURA_CONTEUDO.
          height:
            PADDING_TOPO +
            ALTURA_CONTEUDO +
            Math.max(insets.bottom, PADDING_BASE) +
            // O fio de cima entra na altura (a caixa do RN é border-box); sem
            // somá-lo, falta exatamente ele de área útil e o rótulo perde 1px.
            StyleSheet.hairlineWidth,
          paddingTop: PADDING_TOPO,
          // Respeita a safe area inferior (home indicator / navegação por gesto)
          // em vez de uma altura fixa que fica colada no indicador do sistema.
          paddingBottom: Math.max(insets.bottom, PADDING_BASE),
        },
        // Rótulo um grau menor e com entreletra aberta: a barra fica mais calma e
        // o ícone volta a ser o que identifica a aba. `lineHeight` é explícito
        // porque o leading padrão varia por plataforma — e é ele que entra na
        // conta de ALTURA_CONTEUDO.
        tabBarLabelStyle: {
          fontSize: 10.5,
          lineHeight: LINHA_ROTULO,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
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
