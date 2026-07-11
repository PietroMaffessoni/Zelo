import { Pressable, View, type ViewProps, type ViewStyle } from 'react-native';

import { palette, radius, shadow, spacing } from '@/constants/theme';

export type CardProps = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
};

export function Card({ onPress, padded = true, style, children, ...rest }: CardProps) {
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
        style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
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
