import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useLayout } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger';
type Tamanho = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: Variante;
  size?: Tamanho;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
};

/**
 * Altura por tamanho. No toque, o `sm` sobe de 40 para 44px: 40px é confortável
 * com ponteiro e pequeno demais para o polegar — 44px é o nível AAA da WCAG 2.2
 * (critério 2.5.5) e o mínimo do HIG. O ponteiro mantém a densidade original.
 *
 * Quem decide é a modalidade de entrada, não a largura da janela: um tablet de
 * 800px é largo E é tocado com o dedo. Pelo critério anterior — "largura de
 * celular" — ele caía no tamanho de ponteiro.
 */
const ALTURAS: Record<Tamanho, { ponteiro: number; toque: number }> = {
  sm: { ponteiro: 40, toque: 44 },
  md: { ponteiro: 48, toque: 48 },
  lg: { ponteiro: 56, toque: 56 },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { palette } = useAppTheme();
  const { toque } = useLayout();
  const bg =
    variant === 'primary'
      ? palette.primary
      : variant === 'danger'
        ? palette.danger
        : variant === 'secondary'
          ? palette.surface
          : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger'
      ? palette.onPrimary
      : variant === 'secondary'
        ? palette.text
        : palette.primary;
  const borderColor = variant === 'secondary' ? palette.border : 'transparent';
  const inativo = disabled || loading;
  const altura = toque ? ALTURAS[size].toque : ALTURAS[size].ponteiro;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!loading }}
      disabled={inativo}
      style={({ pressed }) => [
        styles.base,
        {
          // `minHeight` e não `height`: com altura travada, um rótulo que quebra
          // em duas linhas fica cortado pela metade em vez de caber.
          minHeight: altura,
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: inativo ? 0.55 : pressed ? 0.9 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? spacing.lg : spacing.xl,
          // Num `flexDirection: 'row'` o padrão do RN é não encolher, então dois
          // botões lado a lado num celular estouravam a linha em vez de dividir
          // o espaço. Aqui eles cedem, e o rótulo trunca com reticências.
          flexShrink: 1,
          minWidth: 0,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={{ flexShrink: 0 }} /> : null}
          {/*
            O `lineHeight` acompanha o `fontSize` sobrescrito. A variante `label`
            traz 18px de linha, calibrados para os 13px dela; o botão sobe a fonte
            para 15/16 e, herdando os 18, a caixa ficava 1px menor que a linha —
            com `numberOfLines` (overflow oculto) isso raspa a descendente de um
            "ç" ou "g". Medido: 15px pede 20 de linha, 16px pede 21.
          */}
          <AppText
            variant="label"
            numberOfLines={1}
            style={{
              color: fg,
              fontSize: size === 'lg' ? 16 : 15,
              lineHeight: size === 'lg' ? 21 : 20,
              flexShrink: 1,
            }}
          >
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minWidth: 0 },
});
