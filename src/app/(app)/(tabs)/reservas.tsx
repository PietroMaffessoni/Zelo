import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Acoes, AppHeader, AppText, Badge, Button, EmptyState, Loading, MetaLine, Panel, Row, Screen, Section, SectionHeader } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { alterarStatusReserva, listarAreas, listarReservas } from '@/lib/db';
import { formatData, formatHora, primeiroNome } from '@/lib/format';
import * as L from '@/lib/labels';
import { isGestor, type AreaComum, type Reserva } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function ReservasTab() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const acao = useAcao();
  const gestor = isGestor(papel);
  const [processando, setProcessando] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(async () => {
    if (!condominioId) return { areas: [] as AreaComum[], reservas: [] as Reserva[] };
    const [areas, reservas] = await Promise.all([listarAreas(condominioId), listarReservas(condominioId)]);
    return { areas, reservas };
  }, [condominioId]);

  const areas = data?.areas ?? [];
  // `listarReservas` já devolve só futuras ou pendentes (o recorte desceu para o
  // servidor). Repetir o filtro aqui obrigava a chamar Date.now() a cada
  // renderização — leitura de relógio no meio do render, que é justamente o que
  // impede o compilador do React de memoizar a tela.
  const reservas = data?.reservas ?? [];
  const pendentes = reservas.filter((r) => r.status === 'pendente');
  const proximas = reservas.filter((r) => r.status !== 'pendente' && r.status !== 'rejeitada' && r.status !== 'cancelada');

  async function responder(id: string, status: 'aprovada' | 'rejeitada') {
    setProcessando(id);
    const ok = await acao(() => alterarStatusReserva(id, status), { sempre: () => setProcessando(null) });
    if (ok) refetch();
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader title="Reservas" subtitle="Áreas comuns do condomínio" />

      {/* Áreas para reservar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs }}>
        {areas.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push(`/(app)/reservas/nova?area=${a.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Reservar ${a.nome}`}
            style={({ hovered, pressed }: any) => ({
              width: 132,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: hovered ? palette.surfaceAlt : palette.surface,
              borderWidth: 1,
              borderColor: hovered ? palette.borderStrong : palette.border,
              opacity: pressed ? 0.85 : 1,
              gap: spacing.sm,
            })}
          >
            {/* Sem o quadrado colorido atrás do ícone: a área se identifica pelo
                nome, e "Reservar" já diz o que o toque faz — a seta era enfeite. */}
            <Ionicons name={(a.icone as any) || 'business-outline'} size={18} color={palette.textMuted} />
            <AppText variant="label" numberOfLines={2}>
              {a.nome}
            </AppText>
            <AppText color="primary" variant="caption">
              Reservar
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <Loading />
      ) : (
        <>
          {/* Aprovações pendentes (gestor) */}
          {gestor && pendentes.length > 0 ? (
            <Section>
              <SectionHeader title={`Aguardando aprovação (${pendentes.length})`} />
              <Panel>
                {pendentes.map((r) => (
                  <Row key={r.id}>
                    <ReservaInfo reserva={r} mostrarMorador />
                    {r.observacao ? (
                      <AppText color="muted" variant="caption" style={{ marginTop: spacing.sm, fontStyle: 'italic' }}>
                        “{r.observacao}”
                      </AppText>
                    ) : null}
                    <Acoes minimo={116} style={{ marginTop: spacing.md }}>
                      <Button
                        title="Recusar"
                        variant="secondary"
                        size="sm"
                        onPress={() => responder(r.id, 'rejeitada')}
                        loading={processando === r.id}
                      />
                      <Button
                        title="Aprovar"
                        size="sm"
                        onPress={() => responder(r.id, 'aprovada')}
                        loading={processando === r.id}
                      />
                    </Acoes>
                  </Row>
                ))}
              </Panel>
            </Section>
          ) : null}

          {/* Próximas reservas */}
          <Section>
            <SectionHeader title="Próximas reservas" />
            {proximas.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="Sem reservas próximas"
                description="Escolha uma área acima para fazer sua reserva."
              />
            ) : (
              <Panel>
                {proximas.map((r) => (
                  <Row
                    key={r.id}
                    onPress={() => router.push(`/(app)/reservas/${r.id}`)}
                    accessibilityLabel={r.area?.nome ?? 'Reserva'}
                    compact
                  >
                    <ReservaInfo reserva={r} mostrarMorador={gestor} />
                  </Row>
                ))}
              </Panel>
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}

/**
 * Miolo de uma reserva. Data/hora e morador viraram uma linha de metadados só —
 * antes cada dado vinha precedido do próprio ícone, empilhado, o que dobrava a
 * altura da linha e enchia a coluna de pictogramas que não diziam nada que o
 * texto ao lado já não dissesse.
 */
function ReservaInfo({ reserva, mostrarMorador }: { reserva: Reserva; mostrarMorador?: boolean }) {
  const st = L.reservaStatus[reserva.status];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
          {reserva.area?.nome ?? 'Área'}
        </AppText>
        <Badge label={st.label} tone={st.tone} />
      </View>
      <MetaLine
        style={{ marginTop: 3 }}
        itens={[
          `${formatData(reserva.inicio)} · ${formatHora(reserva.inicio)} às ${formatHora(reserva.fim)}`,
          mostrarMorador ? primeiroNome(reserva.morador?.nome_completo) || 'Morador' : null,
        ]}
      />
    </View>
  );
}
