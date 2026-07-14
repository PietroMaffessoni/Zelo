import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { AppHeader, AppText, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarRegras, removerRegra } from '@/lib/db';
import { categoriaRegra } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type CategoriaRegra, type Regra } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function RegrasLista() {
  const router = useRouter();
  const { palette, tone } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarRegras(condominioId) : []),
    [condominioId],
  );

  const regras = data ?? [];
  const categorias = [...new Set(regras.map((r) => r.categoria))] as CategoriaRegra[];

  function confirmarRemover(r: Regra) {
    Alert.alert('Remover informe', `Remover "${r.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await removerRegra(r.id);
          refetch();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Regras e informes" back subtitle="Regimento, horários e convivência" />

        {loading ? (
          <Loading />
        ) : regras.length === 0 ? (
          <EmptyState
            icon="information-circle-outline"
            title="Nenhum informe publicado"
            description={gestor ? 'Toque em "Novo informe" para publicar as regras do condomínio.' : 'O síndico ainda não publicou as regras do condomínio.'}
          />
        ) : (
          categorias.map((cat) => {
            const meta = categoriaRegra[cat];
            const t = tone[meta.tone];
            return (
              <View key={cat} style={{ marginBottom: spacing.xl }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radius.sm,
                      backgroundColor: t.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={(meta.icon ?? 'ellipse-outline') as any} size={17} color={t.fg} />
                  </View>
                  <AppText variant="subtitle">{meta.label}</AppText>
                </View>
                <View style={{ gap: spacing.md }}>
                  {regras
                    .filter((r) => r.categoria === cat)
                    .map((r) => (
                      <Card key={r.id} onPress={gestor ? () => confirmarRemover(r) : undefined}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
                          <AppText variant="subtitle" style={{ flex: 1 }}>
                            {r.titulo}
                          </AppText>
                          {gestor ? <Ionicons name="trash-outline" size={18} color={palette.textSubtle} /> : null}
                        </View>
                        <AppText color="muted" style={{ marginTop: 4 }}>
                          {r.conteudo}
                        </AppText>
                      </Card>
                    ))}
                </View>
              </View>
            );
          })
        )}
      </Screen>
      {gestor ? <Fab icon="add" label="Novo informe" onPress={() => router.push('/(app)/regras/novo')} /> : null}
    </View>
  );
}
