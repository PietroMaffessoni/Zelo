import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { View } from 'react-native';

import { AppHeader, AppText, EmptyState, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { inadimplencia } from '@/lib/db';
import { formatData, formatMoeda } from '@/lib/format';
import { useAppTheme } from '@/lib/theme';
import { useFetch } from '@/lib/useFetch';

export default function Inadimplencia() {
  const { palette } = useAppTheme();
  const { condominioId } = useAuth();

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? inadimplencia(condominioId) : []),
    [condominioId],
  );

  const lista = data ?? [];
  const totalGeral = lista.reduce((s, u) => s + u.total, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader title="Inadimplência" back subtitle="Unidades com boletos vencidos" onRefresh={refetch} />

      {loading ? (
        <Loading />
      ) : lista.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="Nenhuma inadimplência" description="Não há boletos vencidos em aberto. 🎉" />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {/*
            Totalizador. Era um bloco vermelho com o valor sob o rótulo; virou uma
            faixa de resumo com o número encostado à direita, na mesma vertical em
            que os valores da lista abaixo se alinham — então o total e as parcelas
            que o compõem se leem na mesma coluna.
          */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              backgroundColor: palette.dangerSoft,
              borderRadius: radius.lg,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="overline" color="muted">
                Total em atraso
              </AppText>
              <AppText color="muted" variant="caption" style={{ marginTop: 3 }}>
                {lista.length} {lista.length === 1 ? 'unidade inadimplente' : 'unidades inadimplentes'}
              </AppText>
            </View>
            <AppText variant="metric" style={{ color: palette.danger, fontVariant: ['tabular-nums'] }}>
              {formatMoeda(totalGeral)}
            </AppText>
          </View>

          <Panel>
            {lista.map((u) => {
              const dias = dayjs().diff(dayjs(u.maisAntigo), 'day');
              return (
                <Row key={u.unidade.id} compact>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Ionicons name="home-outline" size={18} color={palette.textSubtle} style={{ width: 22, textAlign: 'center' }} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" numberOfLines={1}>
                        {u.unidade.bloco ? `Bloco ${u.unidade.bloco} · ` : ''}Unidade {u.unidade.numero}
                      </AppText>
                      <MetaLine
                        style={{ marginTop: 2 }}
                        itens={[
                          `${u.quantidade} ${u.quantidade === 1 ? 'boleto vencido' : 'boletos vencidos'}`,
                          dias > 0 ? `há ${dias} dia${dias === 1 ? '' : 's'}` : null,
                          `desde ${formatData(u.maisAntigo)}`,
                        ]}
                      />
                    </View>
                    <AppText variant="label" style={{ color: palette.danger, fontVariant: ['tabular-nums'], fontSize: 14 }}>
                      {formatMoeda(u.total)}
                    </AppText>
                  </View>
                </Row>
              );
            })}
          </Panel>
        </View>
      )}
    </Screen>
  );
}
