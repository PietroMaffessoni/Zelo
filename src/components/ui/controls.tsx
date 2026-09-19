import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, View, type ViewStyle } from 'react-native';

import { radius, shadow, spacing, type Tone } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

/** O react-native-web marca `focused` em qualquer foco, inclusive no clique do
 *  mouse — então o anel ficava preso em volta do item depois de selecionar. Aqui
 *  guardamos a modalidade do último input para imitar o `:focus-visible` do
 *  navegador: só quem chegou pelo teclado vê o anel. O style é reavaliado no
 *  evento de foco, que sempre vem depois do keydown/pointerdown. */
let focoPorTeclado = false;
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' || e.key.startsWith('Arrow')) focoPorTeclado = true;
  }, true);
  document.addEventListener('pointerdown', () => {
    focoPorTeclado = false;
  }, true);
}

// `none` não está no ViewStyle do RN (só existe no web), daí o cast.
const semAnel = { outlineStyle: 'none', outlineWidth: 0 } as unknown as ViewStyle;

/** Anel de foco para navegação por teclado (só web). Use `inset` em listas bem
 *  próximas (ex.: sidebar) para o anel ficar por dentro do item e não invadir o
 *  vizinho. */
export function focusRing(focused: boolean, cor: string, inset = false): ViewStyle {
  if (Platform.OS !== 'web') return {};
  if (!focused || !focoPorTeclado) return semAnel;
  return { outlineStyle: 'solid', outlineWidth: 2, outlineColor: cor, outlineOffset: inset ? -2 : 2 } as ViewStyle;
}

export function Divider({ style, inset }: { style?: ViewStyle; inset?: number }) {
  const { palette } = useAppTheme();
  return <View style={[{ height: 1, backgroundColor: palette.border, marginLeft: inset ?? 0 }, style]} />;
}

/**
 * Opção selecionável (categorias, filtros). Mais baixa e mais discreta que antes:
 * um filtro é um controle de apoio, não o assunto da tela. O selecionado carrega
 * a cor da marca — é justamente para marcar escolha e estado ativo que a primária
 * existe.
 */
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
          minHeight: 32,
          paddingHorizontal: spacing.md - 1,
          paddingVertical: 6,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: selected ? palette.primary : hovered ? palette.borderStrong : palette.border,
          backgroundColor: selected ? palette.primarySoft : hovered ? palette.surfaceAlt : palette.surface,
        },
        focusRing(focused, palette.primary),
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? palette.primary : palette.textSubtle} />
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
      contentContainerStyle={{ gap: spacing.sm - 2, paddingVertical: 2 }}
    >
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          selected={o.value === value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </ScrollView>
  );
}

/**
 * Linha de lista com ícone, título, subtítulo e ação.
 *
 * O quadrado colorido de 42px que antecedia cada linha saiu: repetido dez vezes
 * numa tela de menu ele criava um mosaico em que nada se destacava, e gastava o
 * vocabulário de cores (verde, âmbar, vermelho) em navegação — de modo que, quando
 * um selo de status realmente urgente aparecia, ele já não tinha para onde gritar.
 * O ícone agora é neutro e serve de âncora de leitura; a cor fica guardada para
 * estado. `iconTone` continua aceito para não alterar nenhuma chamada existente,
 * e só pinta quando o tom de fato comunica risco.
 */
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
  const corIcone = iconTone === 'danger' ? tones.danger.fg : palette.textSubtle;
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
          paddingVertical: spacing.md - 1,
          paddingHorizontal: hovered && onPress ? spacing.md : 0,
          marginHorizontal: hovered && onPress ? -spacing.md : 0,
          borderRadius: radius.md,
          backgroundColor: hovered && onPress ? palette.surfaceAlt : 'transparent',
          opacity: pressed && onPress ? 0.7 : 1,
        },
        focusRing(focused, palette.primary, true),
      ]}
    >
      {icon ? (
        <View style={{ width: 22, alignItems: 'center' }}>
          <Ionicons name={icon} size={19} color={corIcone} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText
          variant="subtitle"
          numberOfLines={1}
          style={iconTone === 'danger' ? { color: tones.danger.fg } : undefined}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron && onPress && !right ? (
        <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} />
      ) : null}
    </Pressable>
  );
}


/**
 * Ação principal ancorada no canto inferior. Deixou de ser um círculo/pílula
 * flutuante para virar um botão retangular de canto suave — o mesmo desenho dos
 * outros botões do produto, só que fixo na tela. Mantém `shadow.floating` porque
 * aqui a elevação é real: ele passa por cima do conteúdo que rola sob ele.
 */
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
      style={({ pressed, hovered, focused }: any) => [
        {
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.lg + 4,
          height: 46,
          borderRadius: label ? radius.md : radius.full,
          backgroundColor: hovered ? palette.primaryDark : palette.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm - 2,
          paddingHorizontal: label ? spacing.lg : 0,
          width: label ? undefined : 46,
          opacity: pressed ? 0.9 : 1,
        },
        shadow.floating,
        focusRing(focused, palette.primary),
      ]}
    >
      <Ionicons name={icon} size={label ? 18 : 24} color={palette.onPrimary} />
      {label ? (
        <AppText variant="label" style={{ color: palette.onPrimary }}>
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/**
 * Atalho em grade (ações rápidas do início). Sem o bloco colorido de 48px: o que
 * identifica o atalho é o nome dele, e o ícone só ajuda a achar de relance.
 * `tone` permanece na assinatura para não mexer nas chamadas existentes.
 */
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
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered, focused }: any) => [
        {
          flex: 1,
          alignItems: 'flex-start',
          gap: spacing.sm,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: hovered ? palette.surfaceAlt : palette.surface,
          borderWidth: 1,
          borderColor: hovered ? palette.borderStrong : palette.border,
          opacity: pressed ? 0.85 : 1,
        },
        focusRing(focused, palette.primary),
      ]}
    >
      <Ionicons name={icon} size={19} color={palette.textMuted} />
      <AppText variant="label" numberOfLines={2} style={{ color: palette.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Atalho em linha (ações rápidas do morador): ocupa a largura toda e empilha.
 * Pensado para viver dentro de um `Panel`, por isso não carrega borda própria —
 * o fio de divisão do painel já separa um do outro.
 */
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
  const { palette } = useAppTheme();
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
          paddingHorizontal: spacing.lg,
          backgroundColor: hovered ? palette.surfaceAlt : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
        focusRing(focused, palette.primary, true),
      ]}
    >
      <View style={{ width: 22, alignItems: 'center' }}>
        <Ionicons name={icon} size={19} color={palette.textSubtle} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle" numberOfLines={1}>
          {label}
        </AppText>
        {descricao ? (
          <AppText variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {descricao}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} />
    </Pressable>
  );
}
