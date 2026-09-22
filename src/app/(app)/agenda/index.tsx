import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { View } from 'react-native';

import { AppHeader, AppText, EmptyState, Fab, Loading, MetaLine, Panel, Row, Screen, SectionHeader } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarAssembleias, listarEquipamentos, listarEventosAgenda } from '@/lib/db';
import { formatDataHora } from '@/lib/format';
import { tipoEventoLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, veManutencao, type TipoEvento } from '@/lib/types';
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
  const { palette } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);

  const podeVerManutencao = veManutencao(papel);

  const { data, loading, refreshing, refetch } = useFetch(async () => {
    if (!condominioId) return [] as ItemAgenda[];
    const [eventos, assembleias, equipamentos] = await Promise.all([
      listarEventosAgenda(condominioId),
      listarAssembleias(condominioId),
      // Manutenções preventivas entram na agenda para quem a enxerga (gestor,
      // conselho, zelador). Para os demais moradores, lista vazia (RLS bloqueia
      // equipamentos de qualquer forma) — evitamos até a chamada.
      podeVerManutencao ? listarEquipamentos(condominioId) : Promise.resolve([]),
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
      ...equipamentos
        .filter((eq) => eq.proxima_manutencao)
        .map((eq) => ({
          id: `m-${eq.id}`,
          titulo: `Manutenção — ${eq.nome}`,
          descricao: eq.localizacao,
          quando: dayjs(eq.proxima_manutencao).hour(9).minute(0).toISOString(),
          local: eq.localizacao,
          tipo: 'manutencao' as TipoEvento,
          rota: `/(app)/manutencao/${eq.id}`,
        })),
    ];
    // O corte do "futuro" acontece aqui, na carga, e não no render: ler o
     // relógio durante a renderização torna a tela impura e impede a memoização.
     // Uma hora de tolerância mantém à vista o evento que começou agora.
    const limite = Date.now() - 3600_000;
    return itens
      .filter((i) => new Date(i.quando).getTime() >= limite)
      .sort((x, y) => new Date(x.quando).getTime() - new Date(y.quando).getTime());
  }, [condominioId, podeVerManutencao], {
    // Datas do condomínio: conteúdo público, e é o que se consulta longe do
    // sinal (garagem, elevador). Ver a regra de cache em `lib/cache.ts`.
    cache: `agenda:${condominioId}`,
  });

  const futuros = data ?? [];

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
              <SectionHeader title={g.mes} />
              <Panel>
                {g.itens.map((it) => {
                  const meta = tipoEventoLabel[it.tipo];
                  const d = dayjs(it.quando);
                  return (
                    <Row
                      key={it.id}
                      onPress={it.rota ? () => router.push(it.rota as any) : undefined}
                      accessibilityLabel={it.titulo}
                      compact
                    >
                      {/*
                        O bloco de data continua — numa agenda ele é a âncora que
                        permite varrer a coluna pelo dia. O que saiu foi a cor: com
                        um fundo diferente por tipo de evento, a régua de datas virava
                        um mosaico e deixava de funcionar como régua.
                      */}
                      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                        <View
                          style={{
                            width: 46,
                            borderRadius: radius.md,
                            backgroundColor: palette.surfaceAlt,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 6,
                          }}
                        >
                          <AppText variant="subtitle" style={{ fontVariant: ['tabular-nums'] }}>
                            {d.format('DD')}
                          </AppText>
                          <AppText variant="caption" color="muted" style={{ textTransform: 'uppercase' }}>
                            {d.format('MMM')}
                          </AppText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <AppText variant="subtitle" numberOfLines={1}>
                            {it.titulo}
                          </AppText>
                          <MetaLine
                            style={{ marginTop: 2 }}
                            itens={[meta.label, formatDataHora(it.quando), it.local]}
                          />
                        </View>
                        {it.rota ? <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} /> : null}
                      </View>
                    </Row>
                  );
                })}
              </Panel>
            </View>
          ))
        )}
      </Screen>
      {gestor ? <Fab icon="add" label="Novo evento" onPress={() => router.push('/(app)/agenda/novo')} /> : null}
    </View>
  );
}
