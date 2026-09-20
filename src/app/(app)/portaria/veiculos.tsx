import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, EmptyState, Input, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
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
          <Panel>
            {filtrados.map((v) => {
              const meta = tipoVeiculoLabel[v.tipo];
              const unidade = v.unidade
                ? `${v.unidade.bloco ? `Bloco ${v.unidade.bloco} · ` : ''}Unidade ${v.unidade.numero}`
                : null;
              return (
                <Row key={v.id} compact>
                  {/*
                    Consulta de portaria: o porteiro chega com uma placa na mão e
                    precisa achá-la na coluna. Placa alinhada à esquerda em dígitos
                    tabulares, resto como metadado — três linhas de tamanhos
                    diferentes por veículo tornavam a varredura mais lenta.
                  */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" style={{ letterSpacing: 1.2, fontVariant: ['tabular-nums'] }}>
                        {v.placa}
                      </AppText>
                      <MetaLine
                        style={{ marginTop: 3 }}
                        itens={[v.modelo, v.cor, unidade, v.vaga ? `Vaga ${v.vaga}` : null]}
                      />
                    </View>
                    <Badge label={meta.label} tone={meta.tone} />
                  </View>
                </Row>
              );
            })}
          </Panel>
        )}
      </View>
    </Screen>
  );
}
