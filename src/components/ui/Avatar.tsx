import { Image } from 'expo-image';
import { View } from 'react-native';

import { palette, radius } from '@/constants/theme';
import { iniciais } from '@/lib/format';
import { AppText } from '@/components/ui/Text';

const cores = ['#4F46E5', '#0EA5E9', '#16A34A', '#EA580C', '#DB2777', '#7C3AED', '#0891B2'];

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
