import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';

import { palette, radius, shadow, spacing, tone as tones, type Tone } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';

export function Divider({ style }: { style?: ViewStyle }) {
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
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: selected ? palette.primary : palette.border,
        backgroundColor: selected ? palette.primarySoft : palette.surface,
      }}
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
  const t = tones[iconTone];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        opacity: pressed && onPress ? 0.7 : 1,
      })}
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
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
  const t = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        opacity: pressed ? 0.8 : 1,
      })}
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
