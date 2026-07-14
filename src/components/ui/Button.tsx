import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { radius, spacing } from '@/constants/theme';
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

const alturas: Record<Tamanho, number> = { sm: 40, md: 48, lg: 56 };

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
  const inativo = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inativo}
      style={({ pressed }) => [
        styles.base,
        {
          height: alturas[size],
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: inativo ? 0.55 : pressed ? 0.9 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? spacing.lg : spacing.xl,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <AppText variant="label" style={{ color: fg, fontSize: size === 'lg' ? 16 : 15 }}>
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
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
