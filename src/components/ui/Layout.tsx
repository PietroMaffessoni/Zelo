import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { focusRing } from '@/components/ui/controls';
import { AppText } from '@/components/ui/Text';
import { useVoltar } from '@/lib/navegacao';
import { useLayout, TOQUE_MINIMO } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';

// Largura única de conteúdo para TODAS as telas — mantém a coluna com a mesma
// largura em qualquer página, sem "pular" ao navegar. Meio termo: aproveita mais
// a tela que 760 sem esticar o conteúdo como 1120.
const MAX_LARGURA = 940;

/**
 * Container base de tela: fundo, área segura, teclado e centralização no web.
 *
 * O recuo lateral vem da faixa de largura (`useLayout`), não de um valor fixo:
 * 14px num celular pequeno, 32px no desktop. E a área segura passou a incluir
 * `left`/`right` — sem isso, em celular com recorte de tela o conteúdo corre por
 * baixo do notch quando o aparelho está deitado.
 */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  style,
  edges = ['top'],
  maxWidth = MAX_LARGURA,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  maxWidth?: number;
}) {
  const { palette } = useAppTheme();
  const { gutter } = useLayout();

  // `left`/`right` sempre entram: protegem o recorte de tela em paisagem sem
  // afetar nada em retrato, onde os insets laterais são zero.
  const bordas = Array.from(new Set([...edges, 'left', 'right'])) as typeof edges;

  const conteudo = (
    <View
      style={[
        // Coluna centralizada na área útil (ao lado da sidebar no desktop), com a
        // mesma largura em todas as telas.
        { width: '100%', maxWidth, alignSelf: 'center', flex: scroll ? undefined : 1 },
        padded ? { paddingHorizontal: gutter } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={bordas}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xxxl + spacing.xl, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
              ) : undefined
            }
          >
            {conteudo}
          </ScrollView>
        ) : (
          conteudo
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Cabeçalho de tela: voltar, título, subtítulo e ação à direita.
 *
 * O "voltar" deixou de ser um disco cinza de 44px — um botão de navegação
 * secundário não precisa de peso de bloco. Vira uma seta neutra que só ganha
 * fundo sob o ponteiro, alinhada à esquerda da coluna de texto; e o conjunto
 * inteiro ganhou respiro embaixo, para o título não colar no conteúdo.
 */
export function AppHeader({
  title,
  subtitle,
  back,
  right,
  onBack,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
  /** Só no web: exibe um botão de atualizar (pull-to-refresh não existe no navegador). */
  onRefresh?: () => void;
}) {
  const voltar = useVoltar();
  const { palette } = useAppTheme();

  // Web: título da aba do navegador por rota (antes toda página ficava "Zelo").
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = `${title} · Zelo`;
    }
  }, [title]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
        minHeight: 56,
      }}
    >
      {back ? (
        <Pressable
          onPress={() => (onBack ? onBack() : voltar())}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed, hovered, focused }: any) => [
            {
              width: 32,
              height: 32,
              marginLeft: -6,
              borderRadius: radius.md,
              backgroundColor: hovered || pressed ? palette.surfaceAlt : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            },
            focusRing(focused, palette.primary),
          ]}
        >
          <Ionicons name="chevron-back" size={21} color={palette.textMuted} />
        </Pressable>
      ) : null}
      {/* `minWidth: 0` é o que permite o título truncar em vez de empurrar as
          ações para fora da tela: sem ele o texto impõe sua largura natural ao
          flex e, num celular, "Advertências e multas" expulsa o botão da direita. */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {/* As ações nunca encolhem — quem cede espaço é o título. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
        {Platform.OS === 'web' && onRefresh ? (
          <Pressable
            onPress={onRefresh}
            hitSlop={(TOQUE_MINIMO - 34) / 2}
            accessibilityRole="button"
            accessibilityLabel="Atualizar"
            style={({ pressed, hovered, focused }: any) => [
              {
                width: 34,
                height: 34,
                borderRadius: radius.md,
                backgroundColor: hovered || pressed ? palette.surfaceAlt : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              },
              focusRing(focused, palette.primary),
            ]}
          >
            <Ionicons name="refresh" size={17} color={palette.textMuted} />
          </Pressable>
        ) : null}
        {right}
      </View>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const { palette } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <ActivityIndicator color={palette.primary} />
      {label ? (
        <AppText color="muted" variant="caption">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * Estado vazio.
 *
 * Saiu o disco de 72px com ícone de 34 seguido de um botão largo — aquele arranjo
 * dá a uma tela SEM conteúdo mais presença visual do que ela tem quando está
 * cheia, o que é exatamente o contrário do que se quer. Aqui o vazio é uma área
 * delimitada e discreta: diz o que falta, por quê, e oferece a saída em escala
 * proporcional. Toda a informação e a ação continuam as mesmas.
 */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
        gap: spacing.xs,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: radius.lg,
      }}
    >
      <Ionicons name={icon} size={20} color={palette.textSubtle} style={{ marginBottom: spacing.sm }} />
      <AppText variant="subtitle" center>
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" color="muted" center style={{ maxWidth: 330 }}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title={actionLabel} onPress={onAction} fullWidth={false} size="sm" variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

/** Falha de carregamento — distingue "deu erro" de "está vazio". Mesmo desenho do
 *  estado vazio; só o ícone carrega a cor, porque aqui ela informa. */
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
        gap: spacing.xs,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: radius.lg,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={20} color={palette.danger} style={{ marginBottom: spacing.sm }} />
      <AppText variant="subtitle" center>
        {title}
      </AppText>
      <AppText variant="caption" color="muted" center style={{ maxWidth: 330 }}>
        {description}
      </AppText>
      {onRetry ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title="Tentar novamente" onPress={onRetry} fullWidth={false} size="sm" icon="refresh" variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
