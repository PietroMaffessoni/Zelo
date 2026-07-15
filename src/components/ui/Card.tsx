import { Platform, Pressable, View, type ViewProps, type ViewStyle } from 'react-native';

import { radius, shadow, spacing } from '@/constants/theme';
import { focusRing } from '@/components/ui/controls';
import { useAppTheme } from '@/lib/theme';

export type CardProps = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Card({ onPress, padded = true, style, children, accessibilityLabel, ...rest }: CardProps) {
  const { palette } = useAppTheme();
  const base: ViewStyle = {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: padded ? spacing.lg : 0,
    ...shadow.soft,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed, hovered, focused }: any) => [
          base,
          hovered
            ? { borderColor: palette.borderStrong, ...(Platform.OS === 'web' ? shadow.card : null) }
            : null,
          { opacity: pressed ? 0.85 : 1 },
          focusRing(focused, palette.primary),
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}
