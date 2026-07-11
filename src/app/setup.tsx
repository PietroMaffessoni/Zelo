import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radius.full,
          backgroundColor: palette.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        <AppText style={{ color: palette.white, fontWeight: '700', fontSize: 13 }}>{n}</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText color="muted">{children}</AppText>
      </View>
    </View>
  );
}

export default function Setup() {
  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.lg, gap: spacing.sm }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.lg,
            backgroundColor: palette.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="cloud-offline-outline" size={32} color={palette.primary} />
        </View>
        <AppText variant="title" center>
          Conecte o Supabase
        </AppText>
        <AppText color="muted" center style={{ maxWidth: 340 }}>
          O app está pronto, mas ainda não sabe onde guardar os dados. Configure o backend em 3 passos.
        </AppText>
      </View>

      <Card style={{ gap: spacing.lg }}>
        <Passo n={1}>
          Crie um projeto gratuito em <AppText weight="semibold">supabase.com</AppText>.
        </Passo>
        <Passo n={2}>
          No SQL Editor, cole e execute o arquivo <AppText weight="semibold">supabase/setup.sql</AppText>.
        </Passo>
        <Passo n={3}>
          Copie <AppText weight="semibold">.env.example</AppText> para <AppText weight="semibold">.env</AppText>,
          preencha a URL e a chave anon do projeto e reinicie o app.
        </Passo>
      </Card>

      <Card style={{ marginTop: spacing.lg, backgroundColor: palette.surfaceAlt }}>
        <AppText variant="label" color="muted" style={{ marginBottom: spacing.xs }}>
          .env
        </AppText>
        <AppText style={{ fontFamily: 'monospace', fontSize: 13 }}>
          EXPO_PUBLIC_SUPABASE_URL=...{'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY=...
        </AppText>
      </Card>

      <AppText color="subtle" center variant="caption" style={{ marginTop: spacing.xl }}>
        Passo a passo completo em GUIA_SUPABASE.md
      </AppText>
    </Screen>
  );
}
