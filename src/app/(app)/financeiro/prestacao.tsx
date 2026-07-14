import dayjs from 'dayjs';
import { View } from 'react-native';

import { AppHeader, AppText, Card, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { prestacaoDeContas } from '@/lib/db';
import { formatMoeda } from '@/lib/format';
import { useAppTheme } from '@/lib/theme';
import { useFetch } from '@/lib/useFetch';

export default function PrestacaoContas() {
  const { palette } = useAppTheme();
  const { condominioId } = useAuth();

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? prestacaoDeContas(condominioId, 6) : []),
    [condominioId],
  );

  const meses = data ?? [];
  const maxValor = Math.max(1, ...meses.map((m) => Math.max(m.receita, m.despesa)));
  const totalReceita = meses.reduce((s, m) => s + m.receita, 0);
  const totalDespesa = meses.reduce((s, m) => s + m.despesa, 0);
  const saldo = totalReceita - totalDespesa;

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader title="Prestação de contas" back subtitle="Receitas e despesas dos últimos 6 meses" />

      {loading ? (
        <Loading />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {/* Resumo */}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Card style={{ flex: 1 }}>
              <AppText color="muted" variant="caption">Receitas</AppText>
              <AppText variant="subtitle" color="success">{formatMoeda(totalReceita)}</AppText>
            </Card>
            <Card style={{ flex: 1 }}>
              <AppText color="muted" variant="caption">Despesas</AppText>
              <AppText variant="subtitle" color="danger">{formatMoeda(totalDespesa)}</AppText>
            </Card>
          </View>
          <Card style={{ backgroundColor: saldo >= 0 ? palette.successSoft : palette.dangerSoft }}>
            <AppText color="muted" variant="caption">Saldo do período</AppText>
            <AppText variant="title" style={{ color: saldo >= 0 ? palette.success : palette.danger }}>
              {formatMoeda(saldo)}
            </AppText>
          </Card>

          {/* Gráfico de barras */}
          <Card>
            <AppText variant="subtitle" style={{ marginBottom: spacing.lg }}>Por mês</AppText>
            <View style={{ gap: spacing.lg }}>
              {meses.map((m) => (
                <View key={m.mes} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="label" style={{ textTransform: 'capitalize' }}>
                      {dayjs(m.mes + '-01').format('MMM/YY')}
                    </AppText>
                    <AppText color="muted" variant="caption">{formatMoeda(m.receita - m.despesa)}</AppText>
                  </View>
                  <View style={{ gap: 4 }}>
                    <Barra valor={m.receita} max={maxValor} cor={palette.success} />
                    <Barra valor={m.despesa} max={maxValor} cor={palette.danger} />
                  </View>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg }}>
              <Legenda cor={palette.success} label="Receita (boletos pagos)" />
              <Legenda cor={palette.danger} label="Despesa" />
            </View>
          </Card>

          <AppText color="subtle" variant="caption" center>
            Receita considera apenas boletos marcados como pagos.
          </AppText>
        </View>
      )}
    </Screen>
  );
}

function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const { palette } = useAppTheme();
  const pct = Math.max(valor > 0 ? 6 : 0, (valor / max) * 100);
  return (
    <View style={{ height: 14, borderRadius: radius.sm, backgroundColor: palette.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: cor, borderRadius: radius.sm }} />
    </View>
  );
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: cor }} />
      <AppText color="muted" variant="caption">{label}</AppText>
    </View>
  );
}
