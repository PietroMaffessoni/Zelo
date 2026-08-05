import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, ErrorState, Fab, Screen, Segmented, SkeletonList } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarLancamentos } from '@/lib/db';
import { formatData, formatMoeda } from '@/lib/format';
import { categoriaFinanceira, statusFinanceiro } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isConselho, isGestor, statusFinanceiroEfetivo, type TipoLancamento } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function FinanceiroLista() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);
  const podeVerDespesas = isConselho(papel);
  const [tipo, setTipo] = useState<TipoLancamento>('boleto');

  const { data, loading, refreshing, error, refetch } = useFetch(
    async () => (condominioId ? listarLancamentos(condominioId) : []),
    [condominioId],
  );

  const lancamentos = (data ?? []).filter((l) => l.tipo === tipo);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader
          title="Financeiro"
          back
          subtitle={gestor ? 'Boletos e despesas do condomínio' : 'Meus boletos'}
          onRefresh={refetch}
          right={
            gestor ? (
              <Pressable
                onPress={() => router.push('/(app)/financeiro/gerar-mensal')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Gerar boletos do mês"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.full,
                  backgroundColor: palette.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="repeat-outline" size={20} color={palette.text} />
              </Pressable>
            ) : undefined
          }
        />

        {podeVerDespesas ? (
          <Segmented
            value={tipo}
            onChange={setTipo}
            options={[
              { value: 'boleto', label: gestor ? 'Boletos' : 'Meus boletos' },
              { value: 'despesa', label: 'Despesas do condomínio' },
            ]}
          />
        ) : null}

        <View style={{ marginTop: spacing.lg }}>
          {loading ? (
            <SkeletonList />
          ) : error ? (
            <ErrorState onRetry={refetch} />
          ) : lancamentos.length === 0 ? (
            <EmptyState
              icon="cash-outline"
              title={tipo === 'boleto' ? 'Nenhum boleto por aqui' : 'Nenhuma despesa registrada'}
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {lancamentos.map((l) => {
                const status = statusFinanceiroEfetivo(l);
                const stMeta = statusFinanceiro[status];
                const catMeta = categoriaFinanceira[l.categoria];
                return (
                  <Card key={l.id} onPress={() => router.push(`/(app)/financeiro/${l.id}`)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
                        {l.descricao}
                      </AppText>
                      <Badge label={stMeta.label} tone={stMeta.tone} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <AppText color="muted" variant="caption">
                        {catMeta.label}
                        {l.unidade ? ` · ${l.unidade.bloco ? 'Bloco ' + l.unidade.bloco + ' · ' : ''}Unidade ${l.unidade.numero}` : ''}
                      </AppText>
                      <AppText variant="label">{formatMoeda(l.valor)}</AppText>
                    </View>
                    <AppText color="subtle" variant="caption" style={{ marginTop: 2 }}>
                      Vencimento {formatData(l.vencimento)}
                    </AppText>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </Screen>
      {gestor ? <Fab icon="add" label="Lançar" onPress={() => router.push('/(app)/financeiro/novo')} /> : null}
    </View>
  );
}
