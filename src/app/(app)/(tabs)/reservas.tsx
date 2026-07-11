import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { alterarStatusReserva, listarAreas, listarReservas } from '@/lib/db';
import { formatData, formatHora, primeiroNome } from '@/lib/format';
import * as L from '@/lib/labels';
import { isGestor, type AreaComum, type Reserva } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function ReservasTab() {
  const router = useRouter();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);
  const [processando, setProcessando] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(async () => {
    if (!condominioId) return { areas: [] as AreaComum[], reservas: [] as Reserva[] };
    const [areas, reservas] = await Promise.all([listarAreas(condominioId), listarReservas(condominioId)]);
    return { areas, reservas };
  }, [condominioId]);

  const areas = data?.areas ?? [];
  const agora = Date.now();
  const reservas = (data?.reservas ?? []).filter((r) => new Date(r.fim).getTime() >= agora || r.status === 'pendente');
  const pendentes = reservas.filter((r) => r.status === 'pendente');
  const proximas = reservas.filter((r) => r.status !== 'pendente' && r.status !== 'rejeitada' && r.status !== 'cancelada');

  async function responder(id: string, status: 'aprovada' | 'rejeitada') {
    setProcessando(id);
    await alterarStatusReserva(id, status);
    setProcessando(null);
    refetch();
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
            style={{
              width: 130,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
              gap: spacing.sm,
            }}
          >
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
              <Ionicons name={(a.icone as any) || 'business-outline'} size={22} color={palette.primary} />
            </View>
            <AppText variant="label" numberOfLines={2}>
              {a.nome}
            </AppText>
            <AppText color="primary" variant="caption">
              Reservar →
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
            <View style={{ marginTop: spacing.xl }}>
              <AppText variant="subtitle" style={{ marginBottom: spacing.md }}>
                Aguardando aprovação ({pendentes.length})
              </AppText>
              <View style={{ gap: spacing.md }}>
                {pendentes.map((r) => (
                  <Card key={r.id}>
                    <ReservaInfo reserva={r} mostrarMorador />
                    {r.observacao ? (
                      <AppText color="muted" style={{ marginTop: spacing.sm }}>
                        “{r.observacao}”
                      </AppText>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                      <Button
                        title="Recusar"
                        variant="secondary"
                        onPress={() => responder(r.id, 'rejeitada')}
                        loading={processando === r.id}
                      />
                      <Button title="Aprovar" onPress={() => responder(r.id, 'aprovada')} loading={processando === r.id} />
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {/* Próximas reservas */}
          <View style={{ marginTop: spacing.xl }}>
            <AppText variant="subtitle" style={{ marginBottom: spacing.md }}>
              Próximas reservas
            </AppText>
            {proximas.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="Sem reservas próximas"
                description="Escolha uma área acima para fazer sua reserva."
              />
            ) : (
              <View style={{ gap: spacing.md }}>
                {proximas.map((r) => (
                  <Card key={r.id}>
                    <ReservaInfo reserva={r} mostrarMorador={gestor} />
                  </Card>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function ReservaInfo({ reserva, mostrarMorador }: { reserva: Reserva; mostrarMorador?: boolean }) {
  const st = L.reservaStatus[reserva.status];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
          {reserva.area?.nome ?? 'Área'}
        </AppText>
        <Badge label={st.label} tone={st.tone} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
        <Ionicons name="calendar-outline" size={15} color={palette.textMuted} />
        <AppText color="muted" variant="caption">
          {formatData(reserva.inicio)} · {formatHora(reserva.inicio)} às {formatHora(reserva.fim)}
        </AppText>
      </View>
      {mostrarMorador ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
          <Ionicons name="person-outline" size={15} color={palette.textMuted} />
          <AppText color="muted" variant="caption">
            {primeiroNome(reserva.morador?.nome_completo) || 'Morador'}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
