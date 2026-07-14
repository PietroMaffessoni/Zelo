import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, EmptyState, Fab, Loading, Screen, Segmented } from '@/components/ui';
import { palette, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  listarRegistrosVisitantes,
  listarUnidades,
  listarVisitantesAutorizados,
  registrarEntradaVisitante,
  registrarSaidaVisitante,
} from '@/lib/db';
import { formatData, tempoRelativo } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';

type Filtro = 'hoje' | 'local' | 'historico';

export default function PortariaVisitantes() {
  const router = useRouter();
  const { condominioId, user } = useAuth();
  const [filtro, setFiltro] = useState<Filtro>('hoje');
  const [processando, setProcessando] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(async () => {
    if (!condominioId) return { autorizados: [], registros: [], unidades: [] };
    const [autorizados, registros, unidades] = await Promise.all([
      listarVisitantesAutorizados(condominioId),
      listarRegistrosVisitantes(condominioId),
      listarUnidades(condominioId),
    ]);
    return { autorizados, registros, unidades };
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
  const noLocal = (data?.registros ?? []).filter((r) => !r.saida);
  const historico = (data?.registros ?? []).filter((r) => r.saida);

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

  async function registrarSaida(registroId: string) {
    setProcessando(registroId);
    await registrarSaidaVisitante(registroId);
    setProcessando(null);
    refetch();
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Visitantes" back />

        <Segmented
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'hoje', label: `Autorizados hoje (${autorizadosHoje.length})` },
            { value: 'local', label: `No local (${noLocal.length})` },
            { value: 'historico', label: 'Histórico' },
          ]}
        />

        <View style={{ marginTop: spacing.lg }}>
          {loading ? (
            <Loading />
          ) : filtro === 'hoje' ? (
            autorizadosHoje.length === 0 ? (
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
            )
          ) : filtro === 'local' ? (
            noLocal.length === 0 ? (
              <EmptyState icon="checkmark-circle-outline" title="Nenhum visitante no local agora" />
            ) : (
              <View style={{ gap: spacing.md }}>
                {noLocal.map((r) => (
                  <Card key={r.id}>
                    <AppText variant="subtitle">{r.nome_visitante}</AppText>
                    <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
                      {unidadeMap.get(r.unidade_id) ?? 'Unidade'} · entrou {tempoRelativo(r.entrada)}
                    </AppText>
                    <View style={{ marginTop: spacing.md }}>
                      <Button
                        title="Registrar saída"
                        size="sm"
                        variant="secondary"
                        icon="log-out-outline"
                        fullWidth={false}
                        loading={processando === r.id}
                        onPress={() => registrarSaida(r.id)}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            )
          ) : historico.length === 0 ? (
            <EmptyState icon="time-outline" title="Sem histórico ainda" />
          ) : (
            <View style={{ gap: spacing.md }}>
              {historico.map((r) => (
                <Card key={r.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="subtitle">{r.nome_visitante}</AppText>
                    <Badge label="Saiu" tone="neutral" />
                  </View>
                  <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
                    {unidadeMap.get(r.unidade_id) ?? 'Unidade'}
                  </AppText>
                  <AppText color="subtle" variant="caption" style={{ marginTop: 2 }}>
                    <Ionicons name="log-in-outline" size={12} /> {formatData(r.entrada)} · {tempoRelativo(r.entrada)}
                    {r.saida ? `  ·  ` : ''}
                    {r.saida ? <Ionicons name="log-out-outline" size={12} color={palette.textSubtle} /> : null}
                    {r.saida ? ` saiu ${tempoRelativo(r.saida)}` : ''}
                  </AppText>
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
