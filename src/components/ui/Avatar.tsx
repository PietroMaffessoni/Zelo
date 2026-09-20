import { Image } from 'expo-image';
import { View } from 'react-native';

import { coresAvatar, INTENSIDADE, radius } from '@/constants/theme';
import { iniciais } from '@/lib/format';
import { useAppTheme } from '@/lib/theme';
import { AppText } from '@/components/ui/Text';

/** A lista vive em `@/constants/theme` para seguir o interruptor de intensidade. */
const cores = coresAvatar[INTENSIDADE];

function corPorNome(nome?: string | null) {
  const s = nome ?? '?';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return cores[Math.abs(h) % cores.length];
}

export function Avatar({
  nome,
  url,
  size = 44,
}: {
  nome?: string | null;
  url?: string | null;
  size?: number;
}) {
  const { palette } = useAppTheme();
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: radius.full }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: corPorNome(nome),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText style={{ color: palette.white, fontSize: size * 0.4, fontWeight: '700' }}>
        {iniciais(nome)}
      </AppText>
    </View>
  );
}
