import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ZeloWordmark } from '@/components/Brand';
import { focusRing } from '@/components/ui/controls';
import { radius, spacing } from '@/constants/theme';
import { useVoltar } from '@/lib/navegacao';
import { TOQUE_MINIMO } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';

/** As quatro abas da barra inferior: são o topo da navegação, não há para onde voltar. */
const RAIZES = ['/inicio', '/notificacoes', '/reservas', '/configuracoes'];

const ALTURA = 52;

/**
 * Cabeçalho fixo do celular: voltar à esquerda, a marca no centro e o menu à
 * direita — o arranjo dos apps de condomínio que a pessoa já conhece.
 *
 * Fica FORA do Stack (ver `(app)/_layout`): as telas deslizam por baixo dele e
 * ele não pisca a cada navegação. A seta só aparece quando há para onde voltar;
 * nas quatro abas o lugar dela fica vazio, mas reservado, para a marca não
 * escorregar do centro ao trocar de tela.
 */
export function CabecalhoApp({ onMenu }: { onMenu: () => void }) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const voltar = useVoltar();
  const raiz = RAIZES.includes(pathname);

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: palette.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.border,
      }}
    >
      <View style={{ height: ALTURA, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs }}>
        {raiz ? (
          <View style={{ width: TOQUE_MINIMO }} />
        ) : (
          <BotaoCabecalho icon="chevron-back" label="Voltar" onPress={voltar} />
        )}

        {/* A marca não é botão: o "início" já está na barra de abas e no menu. */}
        <View style={{ flex: 1, alignItems: 'center' }} accessibilityRole="header" accessibilityLabel="Zelo">
          <ZeloWordmark size={22} />
        </View>

        <BotaoCabecalho icon="menu" label="Abrir menu" onPress={onMenu} />
      </View>
    </View>
  );
}

function BotaoCabecalho({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered, focused }: any) => [
        {
          width: TOQUE_MINIMO,
          height: TOQUE_MINIMO,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed || hovered ? palette.surfaceAlt : 'transparent',
        },
        focusRing(focused, palette.primary),
      ]}
    >
      <Ionicons name={icon} size={25} color={palette.text} />
    </Pressable>
  );
}
