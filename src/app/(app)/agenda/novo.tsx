import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarEvento } from '@/lib/db';
import { opcoes, tipoEventoLabel } from '@/lib/labels';
import { useVoltar } from '@/lib/navegacao';
import { type TipoEvento } from '@/lib/types';

const HORAS = Array.from({ length: 17 }, (_, i) => i + 7);

export default function NovoEvento() {
  const voltar = useVoltar();
  const { condominioId, user } = useAuth();
  const [tipo, setTipo] = useState<TipoEvento>('evento');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [dia, setDia] = useState(dayjs().format('YYYY-MM-DD'));
  const [hora, setHora] = useState(19);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const dias = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const d = dayjs().add(i, 'day');
        return { value: d.format('YYYY-MM-DD'), label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d.format('ddd DD/MM') };
      }),
    [],
  );

  async function salvar() {
    if (!titulo.trim()) return setErro('Informe o título do evento.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      const inicio = dayjs(dia).hour(hora).minute(0).second(0);
      await criarEvento({
        condominio_id: condominioId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo,
        inicio: inicio.toISOString(),
        local: local.trim() || null,
        criado_por: user.id,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível salvar o evento.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Novo evento" back />
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Tipo</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {opcoes(tipoEventoLabel).map((o) => (
              <Chip key={o.value} label={o.label} icon={tipoEventoLabel[o.value].icon as any} selected={tipo === o.value} onPress={() => setTipo(o.value)} />
            ))}
          </ScrollView>
        </View>

        <Input label="Título" placeholder="Ex.: Reunião de condomínio" value={titulo} onChangeText={setTitulo} />
        <Input label="Local (opcional)" placeholder="Ex.: Salão de festas" value={local} onChangeText={setLocal} />
        <Input label="Descrição (opcional)" placeholder="Detalhes do evento..." value={descricao} onChangeText={setDescricao} multiline />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Dia</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {dias.map((d) => (
              <Chip key={d.value} label={d.label} selected={dia === d.value} onPress={() => setDia(d.value)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Horário</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {HORAS.map((h) => (
              <Chip key={h} label={`${h}h`} selected={hora === h} onPress={() => setHora(h)} />
            ))}
          </ScrollView>
        </View>

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
        <Button title="Salvar evento" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
