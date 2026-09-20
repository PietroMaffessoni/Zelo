import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Fab, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarEquipamentos } from '@/lib/db';
import { formatData } from '@/lib/format';
import { metaEquipamento } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, manutencaoVencida } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function ManutencaoLista() {
  const router = useRouter();
  const { palette } = useAppTheme();
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
              <Ionicons name="alert-circle" size={17} color={palette.danger} />
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
          <Panel>
            {equipamentos.map((eq) => {
              const meta = metaEquipamento(eq.categoria);
              const vencida = manutencaoVencida(eq.proxima_manutencao);
              return (
                <Row
                  key={eq.id}
                  onPress={() => router.push(`/(app)/manutencao/${eq.id}`)}
                  accessibilityLabel={eq.nome}
                  compact
                >
                  {/*
                    O bloco colorido de 44px por equipamento saiu. Numa lista em que
                    o dado crítico é a data da próxima manutenção — e o vermelho de
                    "Vencida" é o que precisa saltar —, colorir também o ícone de
                    cada categoria fazia justamente o alerta se perder no meio.
                  */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Ionicons
                      name={(meta.icon ?? 'construct-outline') as any}
                      size={19}
                      color={palette.textSubtle}
                      style={{ width: 22, textAlign: 'center' }}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" numberOfLines={1}>
                        {eq.nome}
                      </AppText>
                      <MetaLine style={{ marginTop: 2 }} itens={[meta.label, eq.localizacao]} />
                    </View>
                    {eq.proxima_manutencao ? (
                      <Badge label={vencida ? 'Vencida' : formatData(eq.proxima_manutencao)} tone={vencida ? 'danger' : 'success'} />
                    ) : (
                      <Badge label="Sem plano" tone="neutral" />
                    )}
                  </View>
                </Row>
              );
            })}
          </Panel>
        )}
      </Screen>
      {gestor ? <Fab icon="add" label="Equipamento" onPress={() => router.push('/(app)/manutencao/novo')} /> : null}
    </View>
  );
}
