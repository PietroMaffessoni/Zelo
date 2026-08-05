import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

// Largura única de conteúdo para TODAS as telas — mantém a coluna com a mesma
// largura em qualquer página, sem "pular" ao navegar. Meio termo: aproveita mais
// a tela que 760 sem esticar o conteúdo como 1120.
const MAX_LARGURA = 940;

/** Container base de tela: fundo, área segura, teclado e centralização no web. */
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
  const conteudo = (
    <View
      style={[
        // Coluna centralizada na área útil (ao lado da sidebar no desktop), com a
        // mesma largura em todas as telas.
        { width: '100%', maxWidth, alignSelf: 'center', flex: scroll ? undefined : 1 },
        padded ? { paddingHorizontal: spacing.lg } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={edges}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xxxl, flexGrow: 1 }}
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

/** Cabeçalho customizado com título, voltar e ação à direita. */
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
  const router = useRouter();
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
        paddingVertical: spacing.md,
        minHeight: 56,
      }}
    >
      {back ? (
        <Pressable
          onPress={() => (onBack ? onBack() : router.back())}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.full,
            backgroundColor: palette.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {Platform.OS === 'web' && onRefresh ? (
        <Pressable
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Atualizar"
          style={({ pressed, hovered }: any) => ({
            width: 44,
            height: 44,
            borderRadius: radius.full,
            backgroundColor: hovered || pressed ? palette.surfaceAlt : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="refresh" size={20} color={palette.textMuted} />
        </Pressable>
      ) : null}
      {right}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const { palette } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <ActivityIndicator size="large" color={palette.primary} />
      {label ? (
        <AppText color="muted" variant="body">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

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
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.full,
          backgroundColor: palette.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Ionicons name={icon} size={34} color={palette.primary} />
      </View>
      <AppText variant="subtitle" center>
        {title}
      </AppText>
      {description ? (
        <AppText color="muted" center style={{ maxWidth: 320 }}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title={actionLabel} onPress={onAction} fullWidth={false} icon="add" />
        </View>
      ) : null}
    </View>
  );
}

/** Estado de falha de carregamento — distingue "deu erro" de "está vazio". */
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
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.full,
          backgroundColor: palette.dangerSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={34} color={palette.danger} />
      </View>
      <AppText variant="subtitle" center>
        {title}
      </AppText>
      <AppText color="muted" center style={{ maxWidth: 320 }}>
        {description}
      </AppText>
      {onRetry ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title="Tentar novamente" onPress={onRetry} fullWidth={false} icon="refresh" variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
