import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, CarregarMais, EmptyState, Fab, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarInfracoes } from '@/lib/db';
import { formatData, formatMoeda } from '@/lib/format';
import { statusInfracao, tipoInfracaoLabel } from '@/lib/labels';
import { isConselho, isGestor } from '@/lib/types';
import { useListaPaginada } from '@/lib/useListaPaginada';

export default function InfracoesLista() {
  const router = useRouter();
  const { condominioId, papel, membershipAtual } = useAuth();
  const gestor = isGestor(papel);
  const conselho = isConselho(papel);

  const {
    itens: infracoes,
    loading,
    refreshing,
    carregandoMais,
    temMais,
    carregarMais,
    refetch,
  } = useListaPaginada(
    (pagina) =>
      condominioId
        ? listarInfracoes(condominioId, conselho ? null : membershipAtual?.unidade_id, pagina)
        : Promise.resolve([]),
    [condominioId, conselho, membershipAtual?.unidade_id],
  );

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
          <Panel>
            {infracoes.map((inf) => {
              const tMeta = tipoInfracaoLabel[inf.tipo];
              const sMeta = statusInfracao[inf.status];
              const unidade = inf.unidade
                ? `${inf.unidade.bloco ? 'Bloco ' + inf.unidade.bloco + ' · ' : ''}Un. ${inf.unidade.numero}`
                : null;
              return (
                <Row key={inf.id} onPress={() => router.push(`/(app)/infracoes/${inf.id}`)} accessibilityLabel={inf.descricao}>
                  {/*
                    Dos dois selos que abriam o registro, só o status continua selo:
                    é o que muda com o tempo e decide o que fazer. O tipo (advertência
                    ou multa) desceu para a linha de metadados, junto do motivo e da
                    unidade — continua visível, sem competir pelo mesmo destaque.
                  */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" numberOfLines={2}>
                        {inf.descricao}
                      </AppText>
                      <MetaLine
                        style={{ marginTop: 3 }}
                        itens={[tMeta.label, inf.motivo, unidade, formatData(inf.created_at)]}
                      />
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 5 }}>
                      {inf.valor ? (
                        <AppText variant="label" style={{ fontVariant: ['tabular-nums'], fontSize: 14 }}>
                          {formatMoeda(inf.valor)}
                        </AppText>
                      ) : null}
                      <Badge label={sMeta.label} tone={sMeta.tone} />
                    </View>
                  </View>
                </Row>
              );
            })}
          </Panel>
        )}
        {/* Rodapé de paginação: some sozinho quando não há mais o que buscar. */}
        <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
      </Screen>
      {gestor ? <Fab icon="add" label="Aplicar" onPress={() => router.push('/(app)/infracoes/nova')} /> : null}
    </View>
  );
}
