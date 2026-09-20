import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { focusRing } from '@/components/ui/controls';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger';
type Tamanho = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: Variante;
  size?: Tamanho;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
};

// Alturas reduzidas: 56px de botão dominava a tela sem que a ação ganhasse nada
// em clareza. 48px continua confortável ao toque (acima dos 44 recomendados).
const alturas: Record<Tamanho, number> = { sm: 34, md: 42, lg: 48 };

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { palette } = useAppTheme();
  const inativo = disabled || loading;

  const bg =
    variant === 'primary'
      ? palette.primary
      : variant === 'danger'
        ? palette.danger
        : variant === 'secondary'
          ? palette.surface
          : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger'
      ? palette.onPrimary
      : variant === 'secondary'
        ? palette.text
        : palette.primary;
  const borderColor = variant === 'secondary' ? palette.border : 'transparent';

  // Hover no web: o preenchido escurece/clareia (primaryDark serve aos dois temas)
  // e o vazado ganha fundo. Sem sombra — a mudança de cor já confirma a resposta.
  const bgHover =
    variant === 'primary'
      ? palette.primaryDark
      : variant === 'danger'
        ? palette.danger
        : palette.surfaceAlt;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inativo}
      style={({ pressed, hovered, focused }: any) => [
        styles.base,
        {
          height: alturas[size],
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: inativo ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? spacing.lg : spacing.lg + 2,
        },
        hovered && !inativo ? { backgroundColor: bgHover, borderColor: variant === 'secondary' ? palette.borderStrong : borderColor } : null,
        pressed && !inativo ? { opacity: Platform.OS === 'web' ? 0.92 : 0.85 } : null,
        focusRing(focused, palette.primary),
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 15 : 16} color={fg} /> : null}
          <AppText variant="label" style={{ color: fg, fontSize: size === 'sm' ? 13 : 14 }}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 1 },
});
