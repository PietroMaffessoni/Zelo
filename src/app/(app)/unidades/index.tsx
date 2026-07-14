import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarUnidades } from '@/lib/db';
import { useFetch } from '@/lib/useFetch';

export default function UnidadesLista() {
  const router = useRouter();
  const { condominioId } = useAuth();

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarUnidades(condominioId) : []),
    [condominioId],
  );

  const unidades = data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Moradores e unidades" back subtitle="Unidades do condomínio" />

        {loading ? (
          <Loading />
        ) : unidades.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="Nenhuma unidade cadastrada"
            description="Cadastre as unidades para organizar moradores, dependentes e pets."
            actionLabel="Cadastrar unidade"
            onAction={() => router.push('/(app)/unidades/novo')}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {unidades.map((u) => (
              <Card key={u.id} onPress={() => router.push(`/(app)/unidades/${u.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: palette.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="home-outline" size={20} color={palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">
                      {u.bloco ? `Bloco ${u.bloco} · ` : ''}Unidade {u.numero}
                    </AppText>
                    {u.observacoes ? (
                      <AppText color="muted" variant="caption" numberOfLines={1}>
                        {u.observacoes}
                      </AppText>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </Screen>
      <Fab icon="add" label="Unidade" onPress={() => router.push('/(app)/unidades/novo')} />
    </View>
  );
}
