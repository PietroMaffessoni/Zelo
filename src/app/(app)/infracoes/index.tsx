import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarInfracoes } from '@/lib/db';
import { formatData, formatMoeda } from '@/lib/format';
import { motivoInfracao, statusInfracao, tipoInfracaoLabel } from '@/lib/labels';
import { isConselho, isGestor } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function InfracoesLista() {
  const router = useRouter();
  const { condominioId, papel, membershipAtual } = useAuth();
  const gestor = isGestor(papel);
  const conselho = isConselho(papel);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarInfracoes(condominioId, conselho ? null : membershipAtual?.unidade_id) : []),
    [condominioId, conselho, membershipAtual?.unidade_id],
  );

  const infracoes = data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader
          title={gestor ? 'Infrações' : 'Advertências e multas'}
          back
          subtitle={gestor ? 'Advertências e multas aplicadas' : 'Da sua unidade'}
        />

        {loading ? (
          <Loading />
        ) : infracoes.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="Nenhuma infração"
            description={gestor ? 'Aplique advertências ou multas quando necessário.' : 'Sua unidade não possui advertências ou multas.'}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {infracoes.map((inf) => {
              const tMeta = tipoInfracaoLabel[inf.tipo];
              const sMeta = statusInfracao[inf.status];
              const mMeta = motivoInfracao[inf.motivo];
              return (
                <Card key={inf.id} onPress={() => router.push(`/(app)/infracoes/${inf.id}`)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Badge label={tMeta.label} tone={tMeta.tone} />
                    <Badge label={sMeta.label} tone={sMeta.tone} />
                    <AppText color="subtle" variant="caption" style={{ marginLeft: 'auto' }}>
                      {formatData(inf.created_at)}
                    </AppText>
                  </View>
                  <AppText variant="subtitle" numberOfLines={2} style={{ marginTop: 6 }}>
                    {inf.descricao}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <AppText color="muted" variant="caption">
                      {mMeta.label}
                      {inf.unidade ? ` · ${inf.unidade.bloco ? 'Bloco ' + inf.unidade.bloco + ' · ' : ''}Un. ${inf.unidade.numero}` : ''}
                    </AppText>
                    {inf.valor ? <AppText variant="label">{formatMoeda(inf.valor)}</AppText> : null}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      {gestor ? <Fab icon="add" label="Aplicar" onPress={() => router.push('/(app)/infracoes/nova')} /> : null}
    </View>
  );
}
