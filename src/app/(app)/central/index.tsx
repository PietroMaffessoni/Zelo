import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, CarregarMais, EmptyState, Fab, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';
import { listarSolicitacoes } from '@/lib/db';
import { primeiroNome, tempoRelativo } from '@/lib/format';
import * as L from '@/lib/labels';
import { isGestor } from '@/lib/types';
import { useListaPaginada } from '@/lib/useListaPaginada';

export default function CentralLista() {
  const { palette } = useAppTheme();
  const router = useRouter();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);

  const { itens, loading, refreshing, carregandoMais, temMais, carregarMais, refetch } = useListaPaginada(
    (pagina) => (condominioId ? listarSolicitacoes(condominioId, pagina) : Promise.resolve([])),
    [condominioId],
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader
          title="Central do morador"
          back
          subtitle={gestor ? 'Solicitações dos moradores' : 'Suas solicitações à administração'}
        />

        {loading ? (
          <Loading />
        ) : itens.length === 0 ? (
          <EmptyState
            icon="documents-outline"
            title="Nenhuma solicitação"
            description={
              gestor
                ? 'As solicitações dos moradores aparecerão aqui.'
                : 'Peça 2ª via de boleto, autorizações, documentos e muito mais.'
            }
            actionLabel={gestor ? undefined : 'Nova solicitação'}
            onAction={gestor ? undefined : () => router.push('/(app)/central/nova')}
          />
        ) : (
          <Panel>
            {itens.map((s) => {
              const cat = L.solicitacaoCategoria[s.categoria];
              const st = L.solicitacaoStatus[s.status];
              return (
                <Row key={s.id} onPress={() => router.push(`/(app)/central/${s.id}`)} accessibilityLabel={s.titulo} compact>
                  <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                    {/* O ícone da categoria perdeu o bloco colorido de 42px e ficou
                        neutro: numa coluna de dez linhas ele serve para localizar o
                        tipo de pedido, não para colorir a tela. A cor sobrou para o
                        selo de status, que é o que de fato muda de linha para linha. */}
                    <Ionicons
                      name={(cat.icon as any) || 'document-outline'}
                      size={19}
                      color={palette.textSubtle}
                      style={{ width: 22, textAlign: 'center' }}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" numberOfLines={1}>
                        {s.titulo}
                      </AppText>
                      <MetaLine
                        style={{ marginTop: 2 }}
                        itens={[
                          cat.label,
                          gestor ? primeiroNome(s.morador?.nome_completo) || 'Morador' : null,
                          tempoRelativo(s.created_at),
                        ]}
                      />
                    </View>
                    <Badge label={st.label} tone={st.tone} />
                  </View>
                </Row>
              );
            })}
          </Panel>
        )}
        {/* Rodapé de paginação: some sozinho quando não há mais o que buscar. */}
        <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
      </Screen>
      <Fab icon="add" label="Solicitar" onPress={() => router.push('/(app)/central/nova')} />
    </View>
  );
}
