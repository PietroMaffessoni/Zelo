import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Badge, EmptyState, Loading, MetaLine, Panel, Row } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarVisitantesAutorizados } from '@/lib/db';
import { formatData } from '@/lib/format';
import * as L from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';

/** Visitantes autorizados da unidade — aba "Visitantes" de Cadastros. */
export function ListaVisitantes({ unidadeId }: { unidadeId: string }) {
  const router = useRouter();
  const { condominioId } = useAuth();

  const { data, loading } = useFetch(
    async () => (condominioId ? listarVisitantesAutorizados(condominioId, unidadeId) : []),
    [condominioId, unidadeId],
  );
  const visitantes = data ?? [];

  if (loading) return <Loading />;
  if (visitantes.length === 0)
    return (
      <EmptyState
        icon="people-outline"
        title="Nenhum visitante autorizado"
        description="Autorize a entrada de visitas, prestadores ou familiares."
        actionLabel="Autorizar visitante"
        onAction={() => router.push('/(app)/visitantes/novo')}
      />
    );

  return (
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
  );
}
