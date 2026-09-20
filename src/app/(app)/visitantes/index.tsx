import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, EmptyState, Fab, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarVisitantesAutorizados } from '@/lib/db';
import { formatData } from '@/lib/format';
import * as L from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';

export default function VisitantesLista() {
  const router = useRouter();
  const { condominioId, membershipAtual } = useAuth();
  const unidadeId = membershipAtual?.unidade_id ?? null;

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId && unidadeId ? listarVisitantesAutorizados(condominioId, unidadeId) : []),
    [condominioId, unidadeId],
  );

  const visitantes = data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Meus visitantes" back subtitle="Autorizações para a portaria" />

        {!unidadeId ? (
          <AppText color="muted" center>
            Você precisa estar vinculado a uma unidade para autorizar visitantes.
          </AppText>
        ) : loading ? (
          <Loading />
        ) : visitantes.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Nenhum visitante autorizado"
            description="Autorize a entrada de visitas, prestadores ou familiares."
            actionLabel="Autorizar visitante"
            onAction={() => router.push('/(app)/visitantes/novo')}
          />
        ) : (
          <Panel>
            {visitantes.map((v) => {
              const st = L.visitanteStatus[v.status];
              const periodo =
                v.data_fim && v.data_fim !== v.data_inicio
                  ? `${formatData(v.data_inicio)} até ${formatData(v.data_fim)}`
                  : formatData(v.data_inicio);
              return (
                <Row key={v.id} compact>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                    <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
                      {v.nome_visitante}
                    </AppText>
                    <Badge label={st.label} tone={st.tone} />
                  </View>
                  <MetaLine style={{ marginTop: 3 }} itens={[periodo, v.documento]} />
                  {v.observacao ? (
                    <AppText color="subtle" variant="caption" style={{ marginTop: 2 }}>
                      {v.observacao}
                    </AppText>
                  ) : null}
                </Row>
              );
            })}
          </Panel>
        )}
      </Screen>
      {unidadeId ? <Fab icon="add" label="Autorizar" onPress={() => router.push('/(app)/visitantes/novo')} /> : null}
    </View>
  );
}
