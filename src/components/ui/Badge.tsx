import { View, type ViewStyle } from 'react-native';

import { radius, spacing, type Tone } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}) {
  const { tone: tones } = useAppTheme();
  const t = tones[tone];
  return (
    <View
      style={[
        {
          backgroundColor: t.bg,
          borderRadius: radius.full,
          paddingHorizontal: spacing.md,
          paddingVertical: 4,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <AppText variant="caption" style={{ color: t.fg }}>
        {label}
      </AppText>
    </View>
  );
}

/** Pequeno ponto colorido para indicar status compacto. */
export function Dot({ tone = 'neutral' }: { tone?: Tone }) {
  const { tone: tones } = useAppTheme();
  return (
    <View
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tones[tone].fg }}
    />
  );
}
