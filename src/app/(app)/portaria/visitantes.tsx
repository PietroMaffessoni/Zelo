import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarUnidades, listarVisitantesAutorizados, registrarEntradaVisitante } from '@/lib/db';
import { useFetch } from '@/lib/useFetch';

export default function PortariaVisitantes() {
  const router = useRouter();
  const { condominioId, user } = useAuth();
  const [processando, setProcessando] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(async () => {
    if (!condominioId) return { autorizados: [], unidades: [] };
    const [autorizados, unidades] = await Promise.all([
      listarVisitantesAutorizados(condominioId),
      listarUnidades(condominioId),
    ]);
    return { autorizados, unidades };
  }, [condominioId]);

  const unidadeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of data?.unidades ?? []) m.set(u.id, u.bloco ? `Bloco ${u.bloco} · ${u.numero}` : `Unidade ${u.numero}`);
    return m;
  }, [data?.unidades]);

  const hoje = new Date().toISOString().slice(0, 10);
  const autorizadosHoje = (data?.autorizados ?? []).filter(
    (a) => a.status === 'ativa' && a.data_inicio <= hoje && (!a.data_fim || a.data_fim >= hoje),
  );

  async function registrarEntrada(autorizacaoId: string, unidadeId: string, nome: string, documento: string | null) {
    if (!condominioId || !user) return;
    setProcessando(autorizacaoId);
    await registrarEntradaVisitante({
      condominio_id: condominioId,
      unidade_id: unidadeId,
      autorizacao_id: autorizacaoId,
      nome_visitante: nome,
      documento,
      registrado_por: user.id,
    });
    setProcessando(null);
    refetch();
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Visitantes" subtitle="Autorizados hoje" back />

        <View style={{ marginTop: spacing.lg }}>
          {loading ? (
            <Loading />
          ) : autorizadosHoje.length === 0 ? (
            <EmptyState icon="people-outline" title="Nenhum visitante autorizado hoje" />
          ) : (
            <View style={{ gap: spacing.md }}>
              {autorizadosHoje.map((a) => (
                <Card key={a.id}>
                  <AppText variant="subtitle">{a.nome_visitante}</AppText>
                  <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
                    {unidadeMap.get(a.unidade_id) ?? 'Unidade'}
                    {a.documento ? ` · ${a.documento}` : ''}
                  </AppText>
                  <View style={{ marginTop: spacing.md }}>
                    <Button
                      title="Registrar entrada"
                      size="sm"
                      icon="log-in-outline"
                      fullWidth={false}
                      loading={processando === a.id}
                      onPress={() => registrarEntrada(a.id, a.unidade_id, a.nome_visitante, a.documento)}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </Screen>
      <Fab icon="add" label="Avulso" onPress={() => router.push('/(app)/portaria/visitante-avulso')} />
    </View>
  );
}
