import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

const MAX_LARGURA = 680;

/** Container base de tela: fundo, área segura e centralização no web. */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  style,
  edges = ['top'],
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const { palette } = useAppTheme();
  const conteudo = (
    <View
      style={[
        { width: '100%', maxWidth: MAX_LARGURA, alignSelf: 'center', flex: scroll ? undefined : 1 },
        padded ? { paddingHorizontal: spacing.lg } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxxl, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
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
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();
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
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
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
      {right}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const { palette } = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
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
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl + insets.top,
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
