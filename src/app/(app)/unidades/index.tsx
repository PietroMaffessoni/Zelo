import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Avatar, Button, Card, EmptyState, ErrorState, Fab, Screen, SkeletonList } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { aprovarMembership, listarMembershipsPendentes, listarUnidades, recusarMembership } from '@/lib/db';
import { vinculoLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import type { Membership, Unidade } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function UnidadesLista() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const confirmar = useConfirm();
  const { condominioId } = useAuth();
  const [processando, setProcessando] = useState<string | null>(null);

  const { data, loading, refreshing, error, refetch } = useFetch<[Unidade[], Membership[]]>(
    async () => (condominioId ? Promise.all([listarUnidades(condominioId), listarMembershipsPendentes(condominioId)]) : [[], []]),
    [condominioId],
  );

  const [unidades, pendentes] = data ?? [[], []];

  async function aprovar(id: string) {
    setProcessando(id);
    await aprovarMembership(id);
    setProcessando(null);
    refetch();
  }

  async function recusar(id: string) {
    const ok = await confirmar({
      titulo: 'Recusar pedido de acesso?',
      mensagem: 'O usuário precisará entrar com o código de convite novamente para tentar de novo.',
      confirmar: 'Recusar',
      cancelar: 'Cancelar',
      destrutivo: true,
    });
    if (!ok) return;
    setProcessando(id);
    await recusarMembership(id);
    setProcessando(null);
    refetch();
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch} maxWidth={920}>
        <AppHeader title="Moradores e unidades" back subtitle="Unidades do condomínio" onRefresh={refetch} />

        {!loading && pendentes.length > 0 ? (
          <View style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
            <AppText variant="label" color="muted">
              Pedidos de acesso pendentes ({pendentes.length})
            </AppText>
            {pendentes.map((m) => (
              <Card key={m.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar nome={m.profile?.nome_completo} url={m.profile?.avatar_url} size={40} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" numberOfLines={1}>
                      {m.profile?.nome_completo || 'Morador'}
                    </AppText>
                    <AppText color="muted" variant="caption">
                      {m.unidade ? `${m.unidade.bloco ? `Bloco ${m.unidade.bloco} · ` : ''}Unidade ${m.unidade.numero} · ` : ''}
                      {vinculoLabel[m.vinculo].label}
                    </AppText>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button
                    title="Recusar"
                    variant="secondary"
                    size="sm"
                    onPress={() => recusar(m.id)}
                    loading={processando === m.id}
                  />
                  <Button
                    title="Aprovar"
                    size="sm"
                    icon="checkmark"
                    onPress={() => aprovar(m.id)}
                    loading={processando === m.id}
                  />
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : unidades.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="Nenhuma unidade cadastrada"
            description="Cadastre as unidades para organizar moradores, dependentes e pets."
            actionLabel="Cadastrar unidade"
            onAction={() => router.push('/(app)/unidades/novo')}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {unidades.map((u) => (
              <Card key={u.id} onPress={() => router.push(`/(app)/unidades/${u.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: palette.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="home-outline" size={20} color={palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">
                      {u.bloco ? `Bloco ${u.bloco} · ` : ''}Unidade {u.numero}
                    </AppText>
                    {u.observacoes ? (
                      <AppText color="muted" variant="caption" numberOfLines={1}>
                        {u.observacoes}
                      </AppText>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </Screen>
      <Fab icon="add" label="Unidade" onPress={() => router.push('/(app)/unidades/novo')} />
    </View>
  );
}
