import { View, type ViewStyle } from 'react-native';

import { radius, spacing, type Tone } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

/**
 * Selo de status. Deixou de ser pílula: o canto levemente arredondado o aproxima
 * dos demais controles e o afasta da estética de "etiqueta decorativa" — um selo
 * aqui carrega um estado do negócio (aberto, vencido, aprovado), então ele se
 * parece com um dado, não com um adorno.
 */
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
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <AppText variant="caption" style={{ color: t.fg, letterSpacing: 0.1 }}>
        {label}
      </AppText>
    </View>
  );
}

/** Ponto colorido para status compacto — onde um selo inteiro seria ruído. */
export function Dot({ tone = 'neutral' }: { tone?: Tone }) {
  const { tone: tones } = useAppTheme();
  return <View style={{ width: 7, height: 7, borderRadius: radius.full, backgroundColor: tones[tone].fg }} />;
}
