import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarReserva, listarAreas, reservasDaArea } from '@/lib/db';
import { formatMoeda } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useAppTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useFetch } from '@/lib/useFetch';
import type { AreaComum } from '@/lib/types';

/** Converte 'HH:MM:SS' (hora de abertura/fechamento da área) em hora inteira, com padrão. */
function horaDe(valor: string | null | undefined, padrao: number): number {
  if (!valor) return padrao;
  const h = parseInt(valor.slice(0, 2), 10);
  return Number.isFinite(h) ? h : padrao;
}

export default function NovaReserva() {
  const router = useRouter();
  const toast = useToast();
  const { palette, tone } = useAppTheme();
  const { area: areaParam } = useLocalSearchParams<{ area?: string }>();
  const { condominioId, user, membershipAtual } = useAuth();

  const { data: areas, loading } = useFetch(async () => (condominioId ? listarAreas(condominioId) : []), [condominioId]);

  const [areaId, setAreaId] = useState<string | undefined>(areaParam);
  const [dia, setDia] = useState(dayjs().format('YYYY-MM-DD'));
  // Faixa selecionada em horas inteiras [inicio, fim). null = nada selecionado.
  const [inicio, setInicio] = useState<number | null>(null);
  const [fim, setFim] = useState<number | null>(null);
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  const areaSelecionada = areas?.find((a) => a.id === areaId);
  const abertura = horaDe(areaSelecionada?.hora_abertura, 7);
  const fechamento = horaDe(areaSelecionada?.hora_fechamento, 23);
  const horas = useMemo(
    () => Array.from({ length: Math.max(0, fechamento - abertura) }, (_, i) => abertura + i),
    [abertura, fechamento],
  );

  const dias = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const d = dayjs().add(i, 'day');
        return { value: d.format('YYYY-MM-DD'), label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d.format('ddd DD/MM') };
      }),
    [],
  );

  // Reservas ativas da área no dia escolhido — para pintar os horários ocupados.
  const { data: ocupadasReservas, loading: carregandoDisp } = useFetch(async () => {
    if (!areaId) return [];
    const de = dayjs(dia).startOf('day').toISOString();
    const ate = dayjs(dia).endOf('day').toISOString();
    return reservasDaArea(areaId, de, ate);
  }, [areaId, dia]);

  // Conjunto de horas ocupadas (a hora h cobre o intervalo [h, h+1)).
  const ocupadas = useMemo(() => {
    const set = new Set<number>();
    for (const h of horas) {
      const slotIni = dayjs(dia).hour(h).minute(0).second(0);
      const slotFim = slotIni.add(1, 'hour');
      const conflito = (ocupadasReservas ?? []).some(
        (r) => new Date(r.inicio) < slotFim.toDate() && new Date(r.fim) > slotIni.toDate(),
      );
      if (conflito) set.add(h);
    }
    return set;
  }, [ocupadasReservas, horas, dia]);

  // Passou uma hora e não sobra livre entre inicio e uma nova hora final?
  function intervaloLivre(a: number, b: number): boolean {
    for (let h = a; h < b; h++) if (ocupadas.has(h)) return false;
    return true;
  }

  function tocarHora(h: number) {
    if (ocupadas.has(h)) return; // ocupado, não seleciona
    if (inicio === null || fim === null) {
      setInicio(h);
      setFim(h + 1);
      return;
    }
    // Clicar de novo na única hora selecionada → limpa.
    if (inicio === h && fim === h + 1) {
      setInicio(null);
      setFim(null);
      return;
    }
    if (h < inicio) {
      if (intervaloLivre(h, fim)) setInicio(h);
      else {
        setInicio(h);
        setFim(h + 1);
      }
    } else {
      // estende o fim até h+1 se tudo entre inicio e h estiver livre
      if (intervaloLivre(inicio, h + 1)) setFim(h + 1);
      else {
        setInicio(h);
        setFim(h + 1);
      }
    }
  }

  function selecionarDiaInteiro() {
    if (intervaloLivre(abertura, fechamento)) {
      setInicio(abertura);
      setFim(fechamento);
    } else {
      hapticError();
      toast.erro('Há horários ocupados neste dia. Selecione um intervalo livre.');
    }
  }

  async function reservar() {
    if (!areaId || !areaSelecionada) {
      hapticError();
      return toast.erro('Escolha uma área.');
    }
    if (inicio === null || fim === null || fim <= inicio) {
      hapticError();
      return toast.erro('Selecione o horário da reserva.');
    }
    if (!intervaloLivre(inicio, fim)) {
      hapticError();
      return toast.erro('Esse intervalo tem horários já reservados.');
    }
    if (!condominioId || !user) return;
    setSalvando(true);
    try {
      const ini = dayjs(dia).hour(inicio).minute(0).second(0);
      const f = dayjs(dia).hour(fim).minute(0).second(0);
      await criarReserva({
        condominio_id: condominioId,
        area_id: areaId,
        morador_id: user.id,
        unidade_id: membershipAtual?.unidade_id ?? null,
        inicio: ini.toISOString(),
        fim: f.toISOString(),
        observacao: obs.trim() || null,
        requer_aprovacao: areaSelecionada.requer_aprovacao,
        taxa_cobrada: areaSelecionada.taxa_uso > 0 ? areaSelecionada.taxa_uso : null,
      });
      toast.sucesso(areaSelecionada.requer_aprovacao ? 'Reserva enviada para aprovação ✓' : 'Reserva confirmada ✓');
      hapticSuccess();
      router.back();
    } catch (e: any) {
      toast.erro(e?.message ?? 'Não foi possível reservar.');
      hapticError();
      setSalvando(false);
    }
  }

  function trocarArea(a: AreaComum) {
    setAreaId(a.id);
    setInicio(null);
    setFim(null);
  }

  function trocarDia(d: string) {
    setDia(d);
    setInicio(null);
    setFim(null);
  }

  if (loading) return <Screen><AppHeader title="Nova reserva" back /><Loading /></Screen>;

  const temSelecao = inicio !== null && fim !== null;

  return (
    <Screen>
      <AppHeader title="Nova reserva" back />

      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Área</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(areas ?? []).map((a) => (
              <Chip key={a.id} label={a.nome} icon={a.icone as any} selected={areaId === a.id} onPress={() => trocarArea(a)} />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Dia</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {dias.map((d) => (
              <Chip key={d.value} label={d.label} selected={dia === d.value} onPress={() => trocarDia(d.value)} />
            ))}
          </ScrollView>
        </View>

        {!areaId ? (
          <AppText color="subtle" variant="caption">Escolha uma área para ver os horários disponíveis.</AppText>
        ) : carregandoDisp ? (
          <Loading />
        ) : (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label" color="muted">Horários</AppText>
              <Pressable onPress={selecionarDiaInteiro} hitSlop={8}>
                <AppText color="primary" variant="caption">Dia inteiro</AppText>
              </Pressable>
            </View>

            {/* Grade de horas: verde=livre, cinza=ocupado, primária=selecionado. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {horas.map((h) => {
                const ocupado = ocupadas.has(h);
                const selecionado = temSelecao && h >= (inicio as number) && h < (fim as number);
                const bg = ocupado ? palette.surfaceAlt : selecionado ? palette.primary : tone.success.bg;
                const fg = ocupado ? palette.textSubtle : selecionado ? palette.onPrimary : tone.success.fg;
                return (
                  <Pressable
                    key={h}
                    onPress={() => tocarHora(h)}
                    disabled={ocupado}
                    accessibilityRole="button"
                    accessibilityLabel={`${h} horas, ${ocupado ? 'ocupado' : selecionado ? 'selecionado' : 'livre'}`}
                    style={{
                      width: 64,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: bg,
                      alignItems: 'center',
                      opacity: ocupado ? 0.7 : 1,
                    }}
                  >
                    <AppText variant="label" style={{ color: fg }}>{h}h</AppText>
                    <AppText variant="caption" style={{ color: fg, fontSize: 10 }}>
                      {ocupado ? 'ocupado' : selecionado ? '•' : 'livre'}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs }}>
              <Legenda cor={tone.success.bg} label="Livre" />
              <Legenda cor={palette.primary} label="Selecionado" />
              <Legenda cor={palette.surfaceAlt} label="Ocupado" />
            </View>

            {temSelecao ? (
              <View style={{ marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: palette.primarySoft }}>
                <AppText variant="label" color="primary">
                  {dayjs(dia).format('ddd, DD/MM')} · {inicio}h às {fim}h ({(fim as number) - (inicio as number)}h)
                </AppText>
                {areaSelecionada?.requer_aprovacao ? (
                  <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>Precisa de aprovação do síndico.</AppText>
                ) : null}
                {areaSelecionada && areaSelecionada.taxa_uso > 0 ? (
                  <AppText color="muted" variant="caption">Taxa de uso: {formatMoeda(areaSelecionada.taxa_uso)}</AppText>
                ) : null}
              </View>
            ) : (
              <AppText color="subtle" variant="caption" style={{ marginTop: spacing.xs }}>
                Toque no horário inicial e depois no final para selecionar a faixa.
              </AppText>
            )}
          </View>
        )}

        <Input
          label="Observação (opcional)"
          placeholder="Ex.: aniversário de 20 pessoas"
          value={obs}
          onChangeText={setObs}
          multiline
        />

        <Button title="Confirmar reserva" icon="calendar" onPress={reservar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: cor }} />
      <AppText color="muted" variant="caption">{label}</AppText>
    </View>
  );
}
