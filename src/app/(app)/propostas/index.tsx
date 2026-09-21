import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Acoes, AppHeader, AppText, Badge, Button, CarregarMais, EmptyState, Fab, Loading, Panel, Row, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { alternarApoioProposta, listarPropostas, responderProposta } from '@/lib/db';
import { primeiroNome, tempoRelativo } from '@/lib/format';
import { statusProposta } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type PropostaPauta } from '@/lib/types';
import { useListaPaginada } from '@/lib/useListaPaginada';

export default function Propostas() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, user, papel } = useAuth();
  const gestor = isGestor(papel);

  const {
    itens: propostas,
    loading,
    refreshing,
    carregandoMais,
    temMais,
    carregarMais,
    refetch,
  } = useListaPaginada(
    (pagina) => (condominioId && user ? listarPropostas(condominioId, user.id, pagina) : Promise.resolve([])),
    [condominioId, user?.id],
  );
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function apoiar(p: PropostaPauta) {
    if (!user) return;
    setOcupado(p.id);
    await alternarApoioProposta(p.id, user.id, !p.apoiada);
    await refetch();
    setOcupado(null);
  }

  async function decidir(p: PropostaPauta, status: 'aprovada' | 'recusada') {
    setOcupado(p.id);
    await responderProposta(p.id, status);
    await refetch();
    setOcupado(null);
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Propostas de pauta" back subtitle="Ideias dos moradores para as assembleias" />

        {loading ? (
          <Loading />
        ) : propostas.length === 0 ? (
          <EmptyState
            icon="bulb-outline"
            title="Nenhuma proposta ainda"
            description="Tem uma ideia para o condomínio? Proponha uma pauta para ser discutida na próxima assembleia."
            actionLabel="Propor pauta"
            onAction={() => router.push('/(app)/propostas/nova')}
          />
        ) : (
          <Panel>
            {propostas.map((p) => {
              const sMeta = statusProposta[p.status];
              return (
                <Row key={p.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                    <Badge label={sMeta.label} tone={sMeta.tone} />
                    <AppText color="subtle" variant="caption" style={{ marginLeft: 'auto' }}>
                      {primeiroNome(p.autor?.nome_completo) || 'Morador'} · {tempoRelativo(p.created_at)}
                    </AppText>
                  </View>
                  <AppText variant="subtitle">{p.titulo}</AppText>
                  <AppText color="muted" variant="caption" style={{ marginTop: 3 }} numberOfLines={4}>
                    {p.descricao}
                  </AppText>

                  {p.resposta_gestor ? (
                    <AppText color="primary" variant="caption" style={{ marginTop: spacing.sm }}>
                      Síndico: {p.resposta_gestor}
                    </AppText>
                  ) : null}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
                    <Pressable
                      onPress={() => apoiar(p)}
                      disabled={ocupado === p.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: !!p.apoiada }}
                      accessibilityLabel={`Apoiar ${p.titulo}`}
                      style={({ hovered }: any) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        minHeight: 32,
                        paddingHorizontal: spacing.md - 1,
                        paddingVertical: 6,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: p.apoiada ? palette.primary : hovered ? palette.borderStrong : palette.border,
                        backgroundColor: p.apoiada ? palette.primarySoft : hovered ? palette.surfaceAlt : palette.surface,
                      })}
                    >
                      <Ionicons name={p.apoiada ? 'heart' : 'heart-outline'} size={14} color={p.apoiada ? palette.primary : palette.textMuted} />
                      <AppText variant="label" style={{ color: p.apoiada ? palette.primary : palette.textMuted }}>
                        Apoiar · {p.apoios ?? 0}
                      </AppText>
                    </Pressable>

                    {gestor && p.status === 'sugerida' ? (
                      <Acoes minimo={116}>
                        <Button title="Aprovar" size="sm" icon="checkmark" onPress={() => decidir(p, 'aprovada')} loading={ocupado === p.id} />
                        <Button title="Recusar" size="sm" variant="secondary" onPress={() => decidir(p, 'recusada')} loading={ocupado === p.id} />
                      </Acoes>
                    ) : null}
                  </View>
                </Row>
              );
            })}
          </Panel>
        )}
        {/* Rodapé de paginação: some sozinho quando não há mais o que buscar. */}
        <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
      </Screen>
      <Fab icon="add" label="Propor" onPress={() => router.push('/(app)/propostas/nova')} />
    </View>
  );
}
