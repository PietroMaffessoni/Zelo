import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { alternarApoioProposta, listarPropostas, responderProposta } from '@/lib/db';
import { primeiroNome, tempoRelativo } from '@/lib/format';
import { statusProposta } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type PropostaPauta } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function Propostas() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, user, papel } = useAuth();
  const gestor = isGestor(papel);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId && user ? listarPropostas(condominioId, user.id) : []),
    [condominioId, user?.id],
  );
  const [ocupado, setOcupado] = useState<string | null>(null);
  const propostas = data ?? [];

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
          <View style={{ gap: spacing.md }}>
            {propostas.map((p) => {
              const sMeta = statusProposta[p.status];
              return (
                <Card key={p.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                    <Badge label={sMeta.label} tone={sMeta.tone} />
                    <AppText color="subtle" variant="caption" style={{ marginLeft: 'auto' }}>
                      {primeiroNome(p.autor?.nome_completo) || 'Morador'} · {tempoRelativo(p.created_at)}
                    </AppText>
                  </View>
                  <AppText variant="subtitle">{p.titulo}</AppText>
                  <AppText color="muted" style={{ marginTop: 2 }} numberOfLines={4}>{p.descricao}</AppText>

                  {p.resposta_gestor ? (
                    <AppText color="primary" variant="caption" style={{ marginTop: spacing.sm }}>
                      Síndico: {p.resposta_gestor}
                    </AppText>
                  ) : null}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
                    <Pressable
                      onPress={() => apoiar(p)}
                      disabled={ocupado === p.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.md,
                        borderWidth: 1.5,
                        borderColor: p.apoiada ? palette.primary : palette.border,
                        backgroundColor: p.apoiada ? palette.primarySoft : 'transparent',
                      }}
                    >
                      <Ionicons name={p.apoiada ? 'heart' : 'heart-outline'} size={16} color={p.apoiada ? palette.primary : palette.textMuted} />
                      <AppText variant="label" style={{ color: p.apoiada ? palette.primary : palette.textMuted }}>
                        Apoiar · {p.apoios ?? 0}
                      </AppText>
                    </Pressable>

                    {gestor && p.status === 'sugerida' ? (
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' }}>
                        <Button title="Aprovar" size="sm" fullWidth={false} icon="checkmark" onPress={() => decidir(p, 'aprovada')} loading={ocupado === p.id} />
                        <Button title="Recusar" size="sm" fullWidth={false} variant="secondary" onPress={() => decidir(p, 'recusada')} loading={ocupado === p.id} />
                      </View>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      <Fab icon="add" label="Propor" onPress={() => router.push('/(app)/propostas/nova')} />
    </View>
  );
}
