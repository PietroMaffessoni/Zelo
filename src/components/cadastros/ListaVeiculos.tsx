import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, EmptyState, IconButton, Loading, MetaLine, Panel, Row } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { listarVeiculos, removerVeiculo } from '@/lib/db';
import { tipoVeiculoLabel } from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';

/** Veículos da unidade — aba "Veículos" de Cadastros. */
export function ListaVeiculos({ unidadeId }: { unidadeId: string }) {
  const router = useRouter();
  const { condominioId } = useAuth();
  const acao = useAcao();
  const confirmar = useConfirm();
  const [removendo, setRemovendo] = useState<string | null>(null);

  const { data, loading, refetch } = useFetch(
    async () => (condominioId ? listarVeiculos(condominioId, unidadeId) : []),
    [condominioId, unidadeId],
  );
  const veiculos = data ?? [];

  async function remover(id: string, placa: string) {
    // Antes saía num toque só, sem volta. A portaria deixa de reconhecer a placa
    // na hora — vale uma confirmação.
    const ok = await confirmar({
      titulo: `Remover o veículo ${placa}?`,
      mensagem: 'A portaria deixa de reconhecer esta placa como da sua unidade.',
      confirmar: 'Remover',
      cancelar: 'Cancelar',
      destrutivo: true,
    });
    if (!ok) return;
    setRemovendo(id);
    const feito = await acao(() => removerVeiculo(id), { sempre: () => setRemovendo(null) });
    if (feito) refetch();
  }

  if (loading) return <Loading />;
  if (veiculos.length === 0)
    return (
      <EmptyState
        icon="car-outline"
        title="Nenhum veículo cadastrado"
        description="Cadastre os carros e motos da unidade para a portaria reconhecer."
        actionLabel="Cadastrar veículo"
        onAction={() => router.push('/(app)/veiculos/novo')}
      />
    );

  return (
    <Panel>
      {veiculos.map((v) => {
        const meta = tipoVeiculoLabel[v.tipo];
        return (
          <Row key={v.id} compact>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                {/* A placa é o identificador do registro: entreletra aberta e
                    dígitos tabulares para ficar legível e alinhada na coluna. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <AppText variant="subtitle" style={{ letterSpacing: 1.2, fontVariant: ['tabular-nums'] }}>
                    {v.placa}
                  </AppText>
                  <Badge label={meta.label} tone={meta.tone} />
                </View>
                <MetaLine style={{ marginTop: 3 }} itens={[v.modelo, v.cor, v.vaga ? `Vaga ${v.vaga}` : null]} />
              </View>
              <IconButton
                icon="trash-outline"
                label={`Remover veículo ${v.placa}`}
                onPress={() => remover(v.id, v.placa)}
                disabled={removendo === v.id}
                size={17}
              />
            </View>
          </Row>
        );
      })}
    </Panel>
  );
}
