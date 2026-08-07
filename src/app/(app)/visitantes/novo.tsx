import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarVisitanteAutorizado } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';

export default function NovoVisitante() {
  const voltar = useVoltar();
  const { condominioId, user, membershipAtual } = useAuth();
  const unidadeId = membershipAtual?.unidade_id ?? null;

  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataInicio, setDataInicio] = useState(dayjs().format('YYYY-MM-DD'));
  const [variosDias, setVariosDias] = useState(false);
  const [dataFim, setDataFim] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const dias = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = dayjs().add(i, 'day');
        return {
          value: d.format('YYYY-MM-DD'),
          label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d.format('ddd DD/MM'),
        };
      }),
    [],
  );

  async function autorizar() {
    if (!nome.trim()) return setErro('Informe o nome do visitante.');
    if (!condominioId || !user || !unidadeId) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarVisitanteAutorizado({
        condominio_id: condominioId,
        unidade_id: unidadeId,
        autorizado_por: user.id,
        nome_visitante: nome.trim(),
        documento: documento.trim() || null,
        observacao: observacao.trim() || null,
        data_inicio: dataInicio,
        data_fim: variosDias ? dataFim : null,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível autorizar o visitante.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Autorizar visitante" back />
      <View style={{ gap: spacing.lg }}>
        <Input label="Nome do visitante" placeholder="Nome completo" value={nome} onChangeText={setNome} />
        <Input label="Documento (opcional)" placeholder="RG ou CPF" value={documento} onChangeText={setDocumento} />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Data da visita</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {dias.map((d) => (
              <Chip key={d.value} label={d.label} selected={dataInicio === d.value} onPress={() => setDataInicio(d.value)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Chip
            label={variosDias ? 'Vários dias' : 'Só esse dia'}
            icon={variosDias ? 'calendar' : 'calendar-outline'}
            selected={variosDias}
            onPress={() => {
              setVariosDias((v) => !v);
              if (!variosDias) setDataFim(dataInicio);
            }}
          />
          {variosDias ? (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" color="muted">Válido até</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {dias
                  .filter((d) => d.value >= dataInicio)
                  .map((d) => (
                    <Chip key={d.value} label={d.label} selected={dataFim === d.value} onPress={() => setDataFim(d.value)} />
                  ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <Input label="Observação (opcional)" placeholder="Ex.: motorista de app, prestador..." value={observacao} onChangeText={setObservacao} multiline />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Autorizar" icon="checkmark" onPress={autorizar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
