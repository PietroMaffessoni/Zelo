import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { fonts, fontSize, fontWeight } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'caption'
  | 'overline'
  | 'metric';
type ColorKey = 'default' | 'muted' | 'subtle' | 'primary' | 'onPrimary' | 'danger' | 'success';

/**
 * Escala tipográfica. A família não muda: títulos em Plus Jakarta Sans, corpo no
 * tipo do sistema. O que foi calibrado aqui é a HIERARQUIA — cada degrau tem um
 * papel único, e todo degrau ganhou `lineHeight` explícito (o leading padrão do
 * RN varia por plataforma e deixava os blocos de texto com ritmo irregular).
 *
 * A distinção entre `subtitle` (título de um item) e `overline` (nome de uma
 * seção) é o que evita o achatamento anterior, em que a mesma variante servia
 * para os dois papéis e nada parecia mais importante que o resto.
 */
const variants: Record<Variant, TextStyle> = {
  /** Marca e telas de abertura. Um por tela, no máximo. */
  display: { fontSize: 28, lineHeight: 34, fontFamily: fonts.display, letterSpacing: -0.6 },
  /** Título de um registro em tela de detalhe. */
  title: { fontSize: 21, lineHeight: 27, fontFamily: fonts.display, letterSpacing: -0.4 },
  /** Título da tela, no cabeçalho. */
  heading: { fontSize: fontSize.lg, lineHeight: 23, fontFamily: fonts.bold, letterSpacing: -0.25 },
  /** Título de um item de lista ou de um bloco. Distingue-se do corpo pelo peso. */
  subtitle: { fontSize: fontSize.md, lineHeight: 20, fontFamily: fonts.semibold, letterSpacing: -0.1 },
  body: { fontSize: fontSize.md, lineHeight: 22, fontWeight: fontWeight.regular },
  /** Rótulo de campo, texto de botão, dado em destaque dentro de uma linha. */
  label: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: fontWeight.semibold },
  /** Metadado de apoio: data, autor, contagem. */
  caption: { fontSize: fontSize.xs, lineHeight: 16, fontWeight: fontWeight.medium },
  /** Nome de seção. Maiúsculas e entreletra aberta — ordena a página sem competir
   *  em tamanho com os títulos dos itens que a seção contém. */
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  /** Número lido em coluna (indicadores, valores). `tabular-nums` mantém os
   *  dígitos na mesma largura, então os números alinham entre linhas. */
  metric: {
    fontSize: fontSize.xl,
    lineHeight: 24,
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  color?: ColorKey;
  weight?: keyof typeof fontWeight;
  center?: boolean;
};

export function AppText({
  variant = 'body',
  color = 'default',
  weight,
  center,
  style,
  ...rest
}: AppTextProps) {
  const { palette } = useAppTheme();
  const colors: Record<ColorKey, string> = {
    default: palette.text,
    muted: palette.textMuted,
    subtle: palette.textSubtle,
    primary: palette.primary,
    onPrimary: palette.onPrimary,
    danger: palette.danger,
    success: palette.success,
  };
  return (
    <RNText
      {...rest}
      style={[
        variants[variant],
        { color: colors[color] },
        weight ? { fontWeight: fontWeight[weight] } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
