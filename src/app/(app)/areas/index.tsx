import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, EmptyState, Fab, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { palette, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarAreasAdmin } from '@/lib/db';
import { formatMoeda } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';

export default function AreasLista() {
  const router = useRouter();
  const { condominioId } = useAuth();

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarAreasAdmin(condominioId) : []),
    [condominioId],
  );

  const areas = data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Áreas comuns" back subtitle="Taxa de uso, limites e disponibilidade" />

        {loading ? (
          <Loading />
        ) : areas.length === 0 ? (
          <EmptyState
            icon="business-outline"
            title="Nenhuma área cadastrada"
            actionLabel="Cadastrar área"
            onAction={() => router.push('/(app)/areas/novo')}
          />
        ) : (
          <Panel>
            {areas.map((a) => (
              <Row key={a.id} onPress={() => router.push(`/(app)/areas/${a.id}`)} accessibilityLabel={a.nome} compact>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Ionicons
                    name={(a.icone as any) || 'business-outline'}
                    size={19}
                    color={palette.textSubtle}
                    style={{ width: 22, textAlign: 'center' }}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle" numberOfLines={1}>
                      {a.nome}
                    </AppText>
                    <MetaLine
                      style={{ marginTop: 2 }}
                      itens={[
                        a.taxa_uso > 0 ? `Taxa: ${formatMoeda(a.taxa_uso)}` : 'Sem taxa',
                        a.limite_mensal_por_unidade ? `Limite ${a.limite_mensal_por_unidade}/mês` : null,
                      ]}
                    />
                  </View>
                  {!a.ativo ? <Badge label="Inativa" tone="neutral" /> : null}
                  <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} />
                </View>
              </Row>
            ))}
          </Panel>
        )}
      </Screen>
      <Fab icon="add" label="Área" onPress={() => router.push('/(app)/areas/novo')} />
    </View>
  );
}
