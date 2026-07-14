import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fontSize, palette, radius, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  senha?: boolean;
};

export function Input({ label, error, hint, icon, senha, style, ...rest }: InputProps) {
  const [focado, setFocado] = useState(false);
  const [oculto, setOculto] = useState(!!senha);

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <AppText variant="label" color="muted">
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.campo,
          {
            borderColor: error ? palette.danger : focado ? palette.primary : palette.border,
            backgroundColor: palette.surface,
          },
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={palette.textSubtle} style={{ marginRight: spacing.sm }} />
        ) : null}
        <TextInput
          style={[styles.input, Platform.OS === 'web' && (webNoOutline as object), style]}
          placeholderTextColor={palette.textSubtle}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          secureTextEntry={oculto}
          {...rest}
        />
        {senha ? (
          <Pressable onPress={() => setOculto((v) => !v)} hitSlop={8}>
            <Ionicons
              name={oculto ? 'eye-outline' : 'eye-off-outline'}
              size={20}
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
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: palette.text,
    paddingVertical: spacing.md,
  },
});
