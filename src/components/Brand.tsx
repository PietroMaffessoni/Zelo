import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

/**
 * Símbolo da Zelo: um prédio, desenhado com Views (sem dependência de SVG no
 * projeto). As "janelas" e a porta usam a cor do fundo atrás do prédio
 * (`windowColor`) para parecerem recortes — por isso funciona sobre o papel
 * claro, sobre o verde e no tema escuro.
 */
export function ZeloMark({
  height,
  color,
  windowColor,
}: {
  height: number;
  color?: string;
  windowColor?: string;
}) {
  const { palette } = useAppTheme();
  const corPredio = color ?? palette.primary;
  const corJanela = windowColor ?? palette.background;
  const w = Math.round(height * 0.42);
  const win = Math.max(2, Math.round(w * 0.2));
  const linha = { flexDirection: 'row' as const, gap: w * 0.26 };
  const janela = { width: win, height: win, borderRadius: 1, backgroundColor: corJanela };
  return (
    <View
      style={{
        width: w,
        height,
        backgroundColor: corPredio,
        borderTopLeftRadius: w * 0.22,
        borderTopRightRadius: w * 0.22,
        alignItems: 'center',
        paddingTop: height * 0.16,
        gap: height * 0.085,
      }}
    >
      <View style={linha}><View style={janela} /><View style={janela} /></View>
      <View style={linha}><View style={janela} /><View style={janela} /></View>
      <View style={linha}><View style={janela} /><View style={janela} /></View>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: w * 0.34,
          height: height * 0.2,
          backgroundColor: corJanela,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        }}
      />
    </View>
  );
}

/** Wordmark "Zelo" com o prédio no lugar do "l". */
export function ZeloWordmark({
  size = 34,
  color,
  windowColor,
}: {
  size?: number;
  color?: string;
  windowColor?: string;
}) {
  const { palette } = useAppTheme();
  const cor = color ?? palette.primary;
  const letra = {
    fontSize: size,
    fontFamily: fonts.display,
    letterSpacing: -size * 0.03,
    color: cor,
    lineHeight: size * 1.02,
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessibilityRole="header" accessibilityLabel="Zelo">
      <AppText style={letra}>Ze</AppText>
      <View style={{ marginHorizontal: size * 0.02, marginBottom: size * 0.12 }}>
        <ZeloMark height={size * 0.82} color={cor} windowColor={windowColor} />
      </View>
      <AppText style={letra}>o</AppText>
    </View>
  );
}

/** Logotipo da Zelo: wordmark + tagline opcional (splash, login, cadastro). */
export function Brand({ size = 'md', tagline }: { size?: 'md' | 'lg'; tagline?: boolean }) {
  const fs = size === 'lg' ? 54 : 38;
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <ZeloWordmark size={fs} />
      {tagline ? (
        <AppText color="muted" center>
          Cuide do seu condomínio com zelo
        </AppText>
      ) : null}
    </View>
  );
}
