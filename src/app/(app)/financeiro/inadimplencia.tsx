import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Loading, Screen } from '@/components/ui';
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
        <View style={{ gap: spacing.md }}>
          <Card style={{ backgroundColor: palette.dangerSoft }}>
            <AppText color="muted" variant="caption">Total em atraso</AppText>
            <AppText variant="title" style={{ color: palette.danger }}>{formatMoeda(totalGeral)}</AppText>
            <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
              {lista.length} {lista.length === 1 ? 'unidade inadimplente' : 'unidades inadimplentes'}
            </AppText>
          </Card>

          {lista.map((u) => {
            const dias = dayjs().diff(dayjs(u.maisAntigo), 'day');
            return (
              <Card key={u.unidade.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: palette.dangerSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="home-outline" size={20} color={palette.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">
                      {u.unidade.bloco ? `Bloco ${u.unidade.bloco} · ` : ''}Unidade {u.unidade.numero}
                    </AppText>
                    <AppText color="muted" variant="caption">
                      {u.quantidade} {u.quantidade === 1 ? 'boleto vencido' : 'boletos vencidos'}
                      {dias > 0 ? ` · há ${dias} dia${dias === 1 ? '' : 's'}` : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="subtitle" style={{ color: palette.danger }}>{formatMoeda(u.total)}</AppText>
                    <Badge label={`desde ${formatData(u.maisAntigo)}`} tone="danger" />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
