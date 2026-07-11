import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarReserva, listarAreas } from '@/lib/db';
import { useFetch } from '@/lib/useFetch';

const HORAS = Array.from({ length: 17 }, (_, i) => i + 7); // 07h às 23h

export default function NovaReserva() {
  const router = useRouter();
  const { area: areaParam } = useLocalSearchParams<{ area?: string }>();
  const { condominioId, user, membershipAtual } = useAuth();

  const { data: areas, loading } = useFetch(async () => (condominioId ? listarAreas(condominioId) : []), [condominioId]);

  const [areaId, setAreaId] = useState<string | undefined>(areaParam);
  const [dia, setDia] = useState(dayjs().format('YYYY-MM-DD'));
  const [horaInicio, setHoraInicio] = useState(14);
  const [horaFim, setHoraFim] = useState(18);
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const dias = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const d = dayjs().add(i, 'day');
        return {
          value: d.format('YYYY-MM-DD'),
          label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d.format('ddd DD/MM'),
        };
      }),
    [],
  );

  const areaSelecionada = areas?.find((a) => a.id === areaId);

  async function reservar() {
    if (!areaId) return setErro('Escolha uma área.');
    if (horaFim <= horaInicio) return setErro('O horário final deve ser depois do inicial.');
    if (!condominioId || !user || !areaSelecionada) return;
    setSalvando(true);
    setErro(null);
    try {
      const inicio = dayjs(dia).hour(horaInicio).minute(0).second(0);
      const fim = dayjs(dia).hour(horaFim).minute(0).second(0);
      await criarReserva({
        condominio_id: condominioId,
        area_id: areaId,
        morador_id: user.id,
        unidade_id: membershipAtual?.unidade_id ?? null,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        observacao: obs.trim() || null,
        requer_aprovacao: areaSelecionada.requer_aprovacao,
      });
      router.back();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível reservar.');
      setSalvando(false);
    }
  }

  if (loading) return <Screen><AppHeader title="Nova reserva" back /><Loading /></Screen>;

  return (
    <Screen>
      <AppHeader title="Nova reserva" back />

      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Área</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(areas ?? []).map((a) => (
              <Chip key={a.id} label={a.nome} icon={a.icone as any} selected={areaId === a.id} onPress={() => setAreaId(a.id)} />
            ))}
          </View>
          {areaSelecionada?.requer_aprovacao ? (
            <AppText color="subtle" variant="caption">
              Esta área precisa de aprovação do síndico.
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Dia</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {dias.map((d) => (
              <Chip key={d.value} label={d.label} selected={dia === d.value} onPress={() => setDia(d.value)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Início</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {HORAS.map((h) => (
              <Chip key={h} label={`${h}h`} selected={horaInicio === h} onPress={() => setHoraInicio(h)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Fim</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {HORAS.filter((h) => h > horaInicio).map((h) => (
              <Chip key={h} label={`${h}h`} selected={horaFim === h} onPress={() => setHoraFim(h)} />
            ))}
          </ScrollView>
        </View>

        <Input
          label="Observação (opcional)"
          placeholder="Ex.: aniversário de 20 pessoas"
          value={obs}
          onChangeText={setObs}
          multiline
        />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Confirmar reserva" icon="calendar" onPress={reservar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
