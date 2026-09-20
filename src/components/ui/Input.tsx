import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fontSize, radius, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  senha?: boolean;
};

/**
 * Campo de texto. A borda voltou a 1px: a de 1,5px deixava um formulário inteiro
 * com aparência de grade pesada, e o foco — que é o estado que precisa saltar —
 * não tinha para onde crescer. Agora o repouso é discreto e o foco engrossa,
 * então o olho encontra na hora onde está digitando.
 */
export function Input({ label, error, hint, icon, senha, style, ...rest }: InputProps) {
  const { palette } = useAppTheme();
  const [focado, setFocado] = useState(false);
  const [oculto, setOculto] = useState(!!senha);

  const corBorda = error ? palette.danger : focado ? palette.primary : palette.border;

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <AppText variant="label" style={{ color: palette.text }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.campo,
          {
            borderColor: corBorda,
            borderWidth: focado || error ? 1.5 : 1,
            // Compensa o engrossar da borda para o campo não "pular" ao focar.
            paddingHorizontal: focado || error ? spacing.md - 0.5 : spacing.md,
            backgroundColor: palette.surface,
          },
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={17} color={focado ? palette.primary : palette.textSubtle} style={{ marginRight: spacing.sm }} />
        ) : null}
        <TextInput
          style={[styles.input, { color: palette.text }, Platform.OS === 'web' && (webNoOutline as object), style]}
          placeholderTextColor={palette.textSubtle}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          secureTextEntry={oculto}
          {...rest}
        />
        {senha ? (
          <Pressable onPress={() => setOculto((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={oculto ? 'Mostrar senha' : 'Ocultar senha'}>
            <Ionicons
              name={oculto ? 'eye-outline' : 'eye-off-outline'}
              size={19}
              color={palette.textSubtle}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="subtle">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

// react-native-web deixa o <input> com o outline padrão do navegador (borda preta) ao focar
const webNoOutline = { outlineStyle: 'none', outlineWidth: 0 };

const styles = StyleSheet.create({
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm + 2,
  },
});
