import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { fontSize, fontWeight } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Variant = 'display' | 'title' | 'heading' | 'subtitle' | 'body' | 'label' | 'caption';
type ColorKey = 'default' | 'muted' | 'subtle' | 'primary' | 'onPrimary' | 'danger' | 'success';

const variants: Record<Variant, TextStyle> = {
  display: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, letterSpacing: -0.5 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  heading: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, letterSpacing: -0.2 },
  subtitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  color?: ColorKey;
  weight?: keyof typeof fontWeight;
  center?: boolean;
};

export function AppText({
  variant = 'body',
  color = 'default',
  weight,
  center,
  style,
  ...rest
}: AppTextProps) {
  const { palette } = useAppTheme();
  const colors: Record<ColorKey, string> = {
    default: palette.text,
    muted: palette.textMuted,
    subtle: palette.textSubtle,
    primary: palette.primary,
    onPrimary: palette.onPrimary,
    danger: palette.danger,
    success: palette.success,
  };
  return (
    <RNText
      {...rest}
      style={[
        variants[variant],
        { color: colors[color] },
        weight ? { fontWeight: fontWeight[weight] } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
