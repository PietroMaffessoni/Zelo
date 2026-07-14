import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { palette, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarVeiculos, removerVeiculo } from '@/lib/db';
import { tipoVeiculoLabel } from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';

export default function VeiculosLista() {
  const router = useRouter();
  const { condominioId, membershipAtual } = useAuth();
  const unidadeId = membershipAtual?.unidade_id ?? null;
  const [removendo, setRemovendo] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId && unidadeId ? listarVeiculos(condominioId, unidadeId) : []),
    [condominioId, unidadeId],
  );

  const veiculos = data ?? [];

  async function remover(id: string) {
    setRemovendo(id);
    await removerVeiculo(id);
    setRemovendo(null);
    refetch();
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Meus veículos" back />

        {!unidadeId ? (
          <AppText color="muted" center>
            Você precisa estar vinculado a uma unidade para cadastrar veículos.
          </AppText>
        ) : loading ? (
          <Loading />
        ) : veiculos.length === 0 ? (
          <EmptyState
            icon="car-outline"
            title="Nenhum veículo cadastrado"
            actionLabel="Cadastrar veículo"
            onAction={() => router.push('/(app)/veiculos/novo')}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {veiculos.map((v) => {
              const meta = tipoVeiculoLabel[v.tipo];
              return (
                <Card key={v.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <AppText variant="subtitle" style={{ letterSpacing: 1 }}>
                          {v.placa}
                        </AppText>
                        <Badge label={meta.label} tone={meta.tone} />
                      </View>
                      <AppText color="muted" variant="caption" style={{ marginTop: 4 }}>
                        {v.modelo ? `${v.modelo}${v.cor ? ' · ' + v.cor : ''}` : v.cor || ''}
                        {v.vaga ? ` · Vaga ${v.vaga}` : ''}
                      </AppText>
                    </View>
                    <Pressable onPress={() => remover(v.id)} hitSlop={8} disabled={removendo === v.id}>
                      <Ionicons name="trash-outline" size={18} color={palette.textSubtle} />
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      {unidadeId ? <Fab icon="add" label="Veículo" onPress={() => router.push('/(app)/veiculos/novo')} /> : null}
    </View>
  );
}
