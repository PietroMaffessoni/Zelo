import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, View, type ViewStyle } from 'react-native';

import { radius, shadow, spacing, type Tone } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

/** Anel de foco para navegação por teclado (só web). Use `inset` em listas bem
 *  próximas (ex.: sidebar) para o anel ficar por dentro do item e não invadir o
 *  vizinho. */
export function focusRing(focused: boolean, cor: string, inset = false): ViewStyle {
  if (Platform.OS !== 'web' || !focused) return {};
  return { outlineStyle: 'solid', outlineWidth: 2, outlineColor: cor, outlineOffset: inset ? -2 : 2 } as ViewStyle;
}

export function Divider({ style }: { style?: ViewStyle }) {
  const { palette } = useAppTheme();
  return <View style={[{ height: 1, backgroundColor: palette.border }, style]} />;
}

/** Pílula selecionável (categorias, filtros). */
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      style={({ hovered, focused }: any) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 40,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.full,
          borderWidth: 1.5,
          borderColor: selected ? palette.primary : hovered ? palette.borderStrong : palette.border,
          backgroundColor: selected ? palette.primarySoft : hovered ? palette.surfaceAlt : palette.surface,
        },
        focusRing(focused, palette.primary),
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={15} color={selected ? palette.primary : palette.textMuted} />
      ) : null}
      <AppText variant="label" style={{ color: selected ? palette.primary : palette.textMuted }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Barra de filtros horizontais roláveis. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
    >
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

/** Linha de lista com ícone colorido, título, subtítulo e ação. */
export function ListItem({
  icon,
  iconTone = 'primary',
  title,
  subtitle,
  right,
  onPress,
  chevron = true,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: Tone;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const { palette, tone: tones } = useAppTheme();
  const t = tones[iconTone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed, hovered, focused }: any) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: 44,
          paddingVertical: spacing.md,
          paddingHorizontal: hovered && onPress ? spacing.sm : 0,
          marginHorizontal: hovered && onPress ? -spacing.sm : 0,
          borderRadius: radius.md,
          backgroundColor: hovered && onPress ? palette.surfaceAlt : 'transparent',
          opacity: pressed && onPress ? 0.7 : 1,
        },
        focusRing(focused, palette.primary),
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.md,
            backgroundColor: t.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={20} color={t.fg} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron && onPress && !right ? (
        <Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
      ) : null}
    </Pressable>
  );
}

/** Botão de ação flutuante (canto inferior direito). */
export function Fab({
  icon = 'add',
  onPress,
  label,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label?: string;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Adicionar'}
      style={({ pressed, focused }: any) => [
        {
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.xl,
          height: 56,
          borderRadius: radius.full,
          backgroundColor: palette.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingHorizontal: label ? spacing.xl : 0,
          width: label ? undefined : 56,
          opacity: pressed ? 0.9 : 1,
        },
        shadow.floating,
        focusRing(focused, palette.primary),
      ]}
    >
      <Ionicons name={icon} size={26} color={palette.onPrimary} />
      {label ? (
        <AppText variant="label" style={{ color: palette.onPrimary }}>
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Quadrado de ação rápida (grid do início). */
export function ActionTile({
  icon,
  label,
  tone = 'primary',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: Tone;
  onPress: () => void;
}) {
  const { palette, tone: tones } = useAppTheme();
  const t = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered, focused }: any) => [
        {
          flex: 1,
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: hovered ? palette.surfaceAlt : palette.surface,
          borderWidth: 1,
          borderColor: hovered ? palette.borderStrong : palette.border,
          opacity: pressed ? 0.8 : 1,
        },
        focusRing(focused, palette.primary),
      ]}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.md,
          backgroundColor: t.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={24} color={t.fg} />
      </View>
      <AppText variant="label" center numberOfLines={2} style={{ color: palette.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Ação rápida em formato de linha de menu: ícone à esquerda, título + descrição e
 *  um chevron à direita. Ocupa a largura toda — pensado para empilhar verticalmente
 *  (ex.: "Ações rápidas" do morador), diferente do `ActionTile` (grade lado a lado). */
export function ActionRow({
  icon,
  label,
  descricao,
  tone = 'primary',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  descricao?: string;
  tone?: Tone;
  onPress: () => void;
}) {
  const { palette, tone: tones } = useAppTheme();
  const t = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered, focused }: any) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: hovered ? palette.surfaceAlt : palette.surface,
          borderWidth: 1,
          borderColor: hovered ? palette.borderStrong : palette.border,
          opacity: pressed ? 0.8 : 1,
        },
        focusRing(focused, palette.primary),
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: t.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={22} color={t.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label" numberOfLines={1} style={{ color: palette.text }}>
          {label}
        </AppText>
        {descricao ? (
          <AppText variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 2 }}>
            {descricao}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.textSubtle} />
    </Pressable>
  );
}
