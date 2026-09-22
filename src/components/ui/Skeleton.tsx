import { useEffect, useState } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

/** Bloco cinza pulsante — placeholder de conteúdo enquanto carrega. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius: r = radius.sm,
  style,
}: {
  width?: number | `${number}%` | 'auto';
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const { palette } = useAppTheme();
  // `useState` com inicializador preguiçoso em vez de `useRef(...).current`: cria
  // o valor uma única vez e sem ler uma ref durante a renderização, que é o que
  // impede o compilador do React de memoizar o componente.
  const [pulso] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0.55, duration: 800, useNativeDriver: true }),
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
      <Skeleton width="55%" height={13} />
      <Skeleton width="90%" height={11} />
      <Skeleton width="75%" height={11} />
    </View>
  );
}

/**
 * Placeholder de listagem. Agora desenha o MESMO painel de linhas que a lista
 * carregada vai ocupar — antes eram cards soltos, e o layout se reorganizava na
 * frente do usuário quando os dados chegavam.
 */
export function SkeletonList({ count = 5 }: { count?: number }) {
  const { palette } = useAppTheme();
  const larguras = ['62%', '45%', '70%', '52%', '58%', '48%'] as const;
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.border,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: palette.border }} /> : null}
          <View style={{ paddingVertical: spacing.lg - 2, paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            <Skeleton width={larguras[i % larguras.length]} height={13} />
            <Skeleton width="38%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}
