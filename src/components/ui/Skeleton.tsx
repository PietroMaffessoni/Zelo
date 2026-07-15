import { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

/** Bloco cinza pulsante — placeholder de conteúdo enquanto carrega. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius: r = radius.sm,
  style,
}: {
  width?: number | `${number}%` | 'auto';
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const { palette } = useAppTheme();
  const pulso = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulso]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: r, backgroundColor: palette.surfaceAlt, opacity: pulso }, style]}
    />
  );
}

/** Placeholder no formato de um Card com título + duas linhas. */
export function SkeletonCard() {
  const { palette } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.border,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <Skeleton width="55%" height={14} />
      <Skeleton width="90%" height={12} />
      <Skeleton width="75%" height={12} />
    </View>
  );
}

/** Lista de cards-placeholder para telas de listagem. */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
