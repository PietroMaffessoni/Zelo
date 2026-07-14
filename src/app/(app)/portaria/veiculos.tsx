import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Input, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarVeiculos } from '@/lib/db';
import { tipoVeiculoLabel } from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';

export default function PortariaVeiculos() {
  const { condominioId } = useAuth();
  const [busca, setBusca] = useState('');

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarVeiculos(condominioId) : []),
    [condominioId],
  );

  const veiculos = data ?? [];
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return veiculos;
    return veiculos.filter((v) => {
      const unidadeTxt = `${v.unidade?.bloco ?? ''} ${v.unidade?.numero ?? ''}`.toLowerCase();
      return v.placa.toLowerCase().includes(termo) || unidadeTxt.includes(termo);
    });
  }, [veiculos, busca]);

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader title="Veículos" back subtitle="Consulta por placa ou unidade" />

      <Input placeholder="Buscar por placa ou unidade..." value={busca} onChangeText={setBusca} icon="search-outline" />

      <View style={{ marginTop: spacing.lg }}>
        {loading ? (
          <Loading />
        ) : filtrados.length === 0 ? (
          <EmptyState icon="car-outline" title="Nenhum veículo encontrado" />
        ) : (
          <View style={{ gap: spacing.md }}>
            {filtrados.map((v) => {
              const meta = tipoVeiculoLabel[v.tipo];
              return (
                <Card key={v.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="subtitle" style={{ letterSpacing: 1 }}>
                      {v.placa}
                    </AppText>
                    <Badge label={meta.label} tone={meta.tone} />
                  </View>
                  <AppText color="muted" variant="caption" style={{ marginTop: 4 }}>
                    {v.modelo ? `${v.modelo}${v.cor ? ' · ' + v.cor : ''}` : v.cor || ''}
                  </AppText>
                  <AppText color="subtle" variant="caption" style={{ marginTop: 2 }}>
                    {v.unidade?.bloco ? `Bloco ${v.unidade.bloco} · ` : ''}
                    {v.unidade ? `Unidade ${v.unidade.numero}` : ''}
                    {v.vaga ? ` · Vaga ${v.vaga}` : ''}
                  </AppText>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}
