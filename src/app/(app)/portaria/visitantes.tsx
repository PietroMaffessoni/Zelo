import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, EmptyState, Fab, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { listarUnidades, listarVisitantesAutorizados, registrarEntradaVisitante } from '@/lib/db';
import { useFetch } from '@/lib/useFetch';

export default function PortariaVisitantes() {
  const router = useRouter();
  const { condominioId, user } = useAuth();
  const acao = useAcao();
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
    const ok = await acao(() => registrarEntradaVisitante({
      condominio_id: condominioId,
      unidade_id: unidadeId,
      autorizacao_id: autorizacaoId,
      nome_visitante: nome,
      documento,
      registrado_por: user.id,
    }), { sempre: () => setProcessando(null) });
    if (ok) refetch();
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
            <Panel>
              {autorizadosHoje.map((a) => (
                <Row key={a.id} compact>
                  {/* A ação fica na mesma linha do visitante: a portaria despacha
                      a fila de cima a baixo sem descer até um botão por bloco. */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                    <View style={{ flex: 1, minWidth: 150 }}>
                      <AppText variant="subtitle" numberOfLines={1}>
                        {a.nome_visitante}
                      </AppText>
                      <MetaLine
                        style={{ marginTop: 2 }}
                        itens={[unidadeMap.get(a.unidade_id) ?? 'Unidade', a.documento]}
                      />
                    </View>
                    <Button
                      title="Registrar entrada"
                      size="sm"
                      icon="log-in-outline"
                      fullWidth={false}
                      loading={processando === a.id}
                      onPress={() => registrarEntrada(a.id, a.unidade_id, a.nome_visitante, a.documento)}
                    />
                  </View>
                </Row>
              ))}
            </Panel>
          )}
        </View>
      </Screen>
      <Fab icon="add" label="Avulso" onPress={() => router.push('/(app)/portaria/visitante-avulso')} />
    </View>
  );
}
