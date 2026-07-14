import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { View } from 'react-native';

import { AppHeader, AppText, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarAssembleias, listarEventosAgenda } from '@/lib/db';
import { formatDataHora } from '@/lib/format';
import { tipoEventoLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type TipoEvento } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

type ItemAgenda = {
  id: string;
  titulo: string;
  descricao: string | null;
  quando: string;
  local: string | null;
  tipo: TipoEvento;
  rota?: string;
};

export default function Agenda() {
  const router = useRouter();
  const { palette, tone } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);

  const { data, loading, refreshing, refetch } = useFetch(async () => {
    if (!condominioId) return [] as ItemAgenda[];
    const [eventos, assembleias] = await Promise.all([
      listarEventosAgenda(condominioId),
      listarAssembleias(condominioId),
    ]);
    const itens: ItemAgenda[] = [
      ...eventos.map((e) => ({
        id: `e-${e.id}`,
        titulo: e.titulo,
        descricao: e.descricao,
        quando: e.inicio,
        local: e.local,
        tipo: e.tipo,
      })),
      ...assembleias
        .filter((a) => a.status !== 'cancelada')
        .map((a) => ({
          id: `a-${a.id}`,
          titulo: a.titulo,
          descricao: a.descricao,
          quando: a.data_hora,
          local: a.local,
          tipo: 'assembleia' as TipoEvento,
          rota: `/(app)/assembleias/${a.id}`,
        })),
    ];
    return itens.sort((x, y) => new Date(x.quando).getTime() - new Date(y.quando).getTime());
  }, [condominioId]);

  const itens = data ?? [];
  const agora = Date.now();
  const futuros = itens.filter((i) => new Date(i.quando).getTime() >= agora - 3600_000);

  // Agrupa por mês.
  const grupos: { mes: string; itens: ItemAgenda[] }[] = [];
  for (const it of futuros) {
    const mes = dayjs(it.quando).format('MMMM [de] YYYY');
    const g = grupos.find((x) => x.mes === mes);
    if (g) g.itens.push(it);
    else grupos.push({ mes, itens: [it] });
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Agenda" back subtitle="Eventos e datas importantes" />

        {loading ? (
          <Loading />
        ) : futuros.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Nenhum evento agendado"
            description={gestor ? 'Toque em "Novo evento" para adicionar datas à agenda.' : 'Não há eventos futuros na agenda do condomínio.'}
          />
        ) : (
          grupos.map((g) => (
            <View key={g.mes} style={{ marginBottom: spacing.xl }}>
              <AppText variant="label" color="muted" style={{ textTransform: 'capitalize', marginBottom: spacing.sm }}>
                {g.mes}
              </AppText>
              <View style={{ gap: spacing.md }}>
                {g.itens.map((it) => {
                  const meta = tipoEventoLabel[it.tipo];
                  const t = tone[meta.tone];
                  const d = dayjs(it.quando);
                  return (
                    <Card key={it.id} onPress={it.rota ? () => router.push(it.rota as any) : undefined}>
                      <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <View
                          style={{
                            width: 52,
                            borderRadius: radius.md,
                            backgroundColor: t.bg,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: spacing.sm,
                          }}
                        >
                          <AppText variant="title" style={{ color: t.fg }}>{d.format('DD')}</AppText>
                          <AppText variant="caption" style={{ color: t.fg, textTransform: 'uppercase' }}>{d.format('MMM')}</AppText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Ionicons name={(meta.icon ?? 'ellipse-outline') as any} size={14} color={t.fg} />
                            <AppText variant="caption" style={{ color: t.fg }}>{meta.label}</AppText>
                          </View>
                          <AppText variant="subtitle" numberOfLines={1}>{it.titulo}</AppText>
                          <AppText color="muted" variant="caption">{formatDataHora(it.quando)}</AppText>
                          {it.local ? (
                            <AppText color="subtle" variant="caption" numberOfLines={1}>
                              <Ionicons name="location-outline" size={12} color={palette.textSubtle} /> {it.local}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </Screen>
      {gestor ? <Fab icon="add" label="Novo evento" onPress={() => router.push('/(app)/agenda/novo')} /> : null}
    </View>
  );
}
