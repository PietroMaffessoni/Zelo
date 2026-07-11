import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';

/** Logotipo do CondoOS: ícone de prédio + nome. */
export function Brand({ size = 'md', tagline }: { size?: 'md' | 'lg'; tagline?: boolean }) {
  const box = size === 'lg' ? 64 : 46;
  const icon = size === 'lg' ? 34 : 24;
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: box,
          height: box,
          borderRadius: radius.lg,
          backgroundColor: palette.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="business" size={icon} color={palette.white} />
      </View>
      <AppText variant={size === 'lg' ? 'title' : 'heading'}>CondoOS</AppText>
      {tagline ? (
        <AppText color="muted" center>
          O sistema operacional do seu condomínio
        </AppText>
      ) : null}
    </View>
  );
}
