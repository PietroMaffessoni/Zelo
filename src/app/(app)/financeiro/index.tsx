import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Badge, CampoBusca, CarregarMais, EmptyState, ErrorState, Fab, MetaLine, Panel, Row, Screen, Segmented, SkeletonList } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarLancamentos } from '@/lib/db';
import { formatData, formatMoeda } from '@/lib/format';
import { categoriaFinanceira, statusFinanceiro } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isConselho, isGestor, statusFinanceiroEfetivo, type TipoLancamento } from '@/lib/types';
import { useDebounce } from '@/lib/useDebounce';
import { useListaPaginada } from '@/lib/useListaPaginada';

export default function FinanceiroLista() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);
  const podeVerDespesas = isConselho(papel);
  const [tipo, setTipo] = useState<TipoLancamento>('boleto');
  const [busca, setBusca] = useState('');
  const buscaAtrasada = useDebounce(busca);

  const {
    itens: lancamentos,
    loading,
    refreshing,
    error,
    carregandoMais,
    temMais,
    carregarMais,
    refetch,
  } = useListaPaginada(
    (pagina) =>
      condominioId ? listarLancamentos(condominioId, { tipo, pagina, busca: buscaAtrasada }) : Promise.resolve([]),
    [condominioId, tipo, buscaAtrasada],
  );

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
                style={({ hovered, pressed }: any) => ({
                  width: 34,
                  height: 34,
                  borderRadius: radius.md,
                  backgroundColor: hovered || pressed ? palette.surfaceAlt : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Ionicons name="repeat-outline" size={18} color={palette.textMuted} />
              </Pressable>
            ) : undefined
          }
        />

        <View style={{ marginBottom: spacing.md }}>
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar por descrição" />
        </View>

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
            <Panel>
              {lancamentos.map((l) => {
                const status = statusFinanceiroEfetivo(l);
                const stMeta = statusFinanceiro[status];
                const catMeta = categoriaFinanceira[l.categoria];
                const unidade = l.unidade
                  ? `${l.unidade.bloco ? 'Bloco ' + l.unidade.bloco + ' · ' : ''}Unidade ${l.unidade.numero}`
                  : null;
                return (
                  <Row key={l.id} onPress={() => router.push(`/(app)/financeiro/${l.id}`)} accessibilityLabel={l.descricao} compact>
                    {/*
                      Lançamento financeiro se lê como extrato: descrição e contexto
                      à esquerda, dinheiro encostado na direita. O valor usa dígitos
                      tabulares, então as casas decimais alinham entre as linhas e dá
                      para comparar valores de relance — que é a razão de existir da
                      lista. Antes o valor ficava no meio da linha de metadados,
                      solto, e cada registro o colocava numa horizontal diferente.
                    */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="subtitle" numberOfLines={1}>
                          {l.descricao}
                        </AppText>
                        <MetaLine
                          style={{ marginTop: 2 }}
                          itens={[catMeta.label, unidade, `Venc. ${formatData(l.vencimento)}`]}
                        />
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 5 }}>
                        <AppText variant="label" style={{ fontVariant: ['tabular-nums'], fontSize: 14 }}>
                          {formatMoeda(l.valor)}
                        </AppText>
                        <Badge label={stMeta.label} tone={stMeta.tone} />
                      </View>
                    </View>
                  </Row>
                );
              })}
            </Panel>
          )}
        <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
        </View>
      </Screen>
      {gestor ? <Fab icon="add" label="Lançar" onPress={() => router.push('/(app)/financeiro/novo')} /> : null}
    </View>
  );
}
