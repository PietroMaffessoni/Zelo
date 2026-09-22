import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { PixelRatio, StyleSheet } from 'react-native';
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
const PADDING_TOPO = 6;
const PADDING_BASE = 8;

/**
 * Teto do fator de ampliação de fonte considerado no cálculo da barra.
 *
 * O rótulo acompanha o ajuste de tamanho de fonte do sistema (`allowFontScaling`
 * segue ligado — desligá-lo tiraria a acessibilidade de quem depende dele). Só
 * que a altura da barra era calculada para 14px de linha fixos: com a fonte
 * grande do sistema, o texto voltava a ser cortado.
 *
 * A barra passa a crescer junto, até 1,4×, e para aí. O teto existe porque em 2×
 * uma barra de abas tomaria um terço da tela do celular; desse ponto em diante
 * quem cede é o rótulo, que é a troca menos ruim — o ícone e o alvo de toque
 * continuam inteiros.
 */
const FATOR_FONTE_MAX = 1.4;

export default function TabsLayout() {
  const { papel } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { navegacaoLateral } = useLayout();
  // `getFontScale` reflete o ajuste de tamanho de fonte do sistema operacional.
  const fatorFonte = Math.min(PixelRatio.getFontScale(), FATOR_FONTE_MAX);
  const alturaConteudo = RESPIRO_ITEM + ALTURA_ICONE + Math.ceil(LINHA_ROTULO * fatorFonte);
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
          // nos dois casos. `alturaConteudo` já considera o ajuste de tamanho de
          // fonte do sistema — ver FATOR_FONTE_MAX.
          height:
            PADDING_TOPO +
            alturaConteudo +
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
        // conta da altura. Vai sem o fator de fonte de propósito: o RN já amplia
        // fonte e linha juntos, e multiplicar aqui dobraria o espaçamento.
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
