import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarEquipamentos } from '@/lib/db';
import { formatData } from '@/lib/format';
import { metaEquipamento } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, manutencaoVencida } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function ManutencaoLista() {
  const router = useRouter();
  const { tone, palette } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarEquipamentos(condominioId) : []),
    [condominioId],
  );

  const equipamentos = data ?? [];
  const vencidas = equipamentos.filter((e) => manutencaoVencida(e.proxima_manutencao));

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Manutenção" back subtitle="Equipamentos e manutenção preventiva" />

        {vencidas.length > 0 ? (
          <Card style={{ backgroundColor: palette.dangerSoft, borderColor: palette.danger, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="alert-circle" size={22} color={palette.danger} />
              <AppText variant="label" style={{ color: palette.danger, flex: 1 }}>
                {vencidas.length === 1
                  ? '1 manutenção vencida — precisa de atenção'
                  : `${vencidas.length} manutenções vencidas — precisam de atenção`}
              </AppText>
            </View>
          </Card>
        ) : null}

        {loading ? (
          <Loading />
        ) : equipamentos.length === 0 ? (
          <EmptyState
            icon="construct-outline"
            title="Nenhum equipamento cadastrado"
            description={gestor ? 'Cadastre elevadores, bombas, geradores e outros para acompanhar a manutenção preventiva.' : 'Nenhum equipamento cadastrado ainda.'}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {equipamentos.map((eq) => {
              const meta = metaEquipamento(eq.categoria);
              const t = tone[meta.tone];
              const vencida = manutencaoVencida(eq.proxima_manutencao);
              return (
                <Card key={eq.id} onPress={() => router.push(`/(app)/manutencao/${eq.id}`)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
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
                      <Ionicons name={(meta.icon ?? 'construct-outline') as any} size={22} color={t.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" numberOfLines={1}>{eq.nome}</AppText>
                      <AppText color="muted" variant="caption" numberOfLines={1}>
                        {meta.label}
                        {eq.localizacao ? ` · ${eq.localizacao}` : ''}
                      </AppText>
                    </View>
                    {eq.proxima_manutencao ? (
                      <Badge label={vencida ? 'Vencida' : formatData(eq.proxima_manutencao)} tone={vencida ? 'danger' : 'success'} />
                    ) : (
                      <Badge label="Sem plano" tone="neutral" />
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      {gestor ? <Fab icon="add" label="Equipamento" onPress={() => router.push('/(app)/manutencao/novo')} /> : null}
    </View>
  );
}
