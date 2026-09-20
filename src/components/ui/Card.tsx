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

/**
 * Superfície para um bloco que é, de fato, uma unidade isolada — um destaque, um
 * resumo, um formulário agrupado.
 *
 * O card não flutua mais: em repouso ele se separa do fundo por borda e por
 * contraste de superfície, e só levanta (de leve, no web) quando é clicável e o
 * ponteiro está sobre ele — aí a sombra tem função, que é dizer "isto responde".
 * Empilhar dezenas destes é o que dava o aspecto de template; para listas de
 * registros repetidos use `Panel` + `Row`.
 */
export function Card({ onPress, padded = true, style, children, accessibilityLabel, ...rest }: CardProps) {
  const { palette } = useAppTheme();
  const base: ViewStyle = {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: padded ? spacing.lg : 0,
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
          pressed ? { backgroundColor: palette.surfaceAlt } : null,
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
