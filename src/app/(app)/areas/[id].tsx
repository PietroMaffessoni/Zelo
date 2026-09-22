import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Chip, FormRow, Input, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { atualizarArea, getArea } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';
import type { AreaComum } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function EditarArea() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: area, loading } = useFetch(() => getArea(id), [id]);

  if (loading || !area)
    return (
      <Screen>
        <AppHeader title="Área comum" back />
        {loading ? <Loading /> : <AppText color="muted" center>Área não encontrada.</AppText>}
      </Screen>
    );

  return (
    <Screen>
      <AppHeader title="Editar área comum" back />
      {/* `key` faz o formulário nascer já preenchido — ver `FormArea`. */}
      <FormArea key={area.id} area={area} />
    </Screen>
  );
}

/**
 * Formulário de edição da área.
 *
 * Separado da tela e montado com `key={area.id}` para que cada campo NASÇA do
 * registro carregado. Antes havia um `useEffect` que, quando os dados chegavam,
 * disparava sete `setState` de uma vez para copiar o registro nos campos: uma
 * renderização a mais a cada carga, o formulário aparecendo vazio por um quadro,
 * e exatamente o que o compilador do React sinaliza — efeito serve para
 * conversar com o mundo de fora, não para copiar dado de um lugar do React para
 * outro.
 */
function FormArea({ area }: { area: AreaComum }) {
  const voltar = useVoltar();
  const acao = useAcao();

  const [nome, setNome] = useState(area.nome);
  const [descricao, setDescricao] = useState(area.descricao ?? '');
  const [capacidade, setCapacidade] = useState(area.capacidade ? String(area.capacidade) : '');
  const [requerAprovacao, setRequerAprovacao] = useState(area.requer_aprovacao);
  const [ativo, setAtivo] = useState(area.ativo);
  const [taxaUso, setTaxaUso] = useState(area.taxa_uso ? String(area.taxa_uso) : '');
  const [limite, setLimite] = useState(
    area.limite_mensal_por_unidade ? String(area.limite_mensal_por_unidade) : '',
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) return setErro('Informe o nome da área.');
    setSalvando(true);
    setErro(null);
    const ok = await acao(
      () =>
        atualizarArea(area.id, {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          capacidade: capacidade.trim() ? Number(capacidade) : null,
          requer_aprovacao: requerAprovacao,
          ativo,
          taxa_uso: taxaUso.trim() ? Number(taxaUso.replace(',', '.')) : 0,
          limite_mensal_por_unidade: limite.trim() ? Number(limite) : null,
        }),
      { sempre: () => setSalvando(false) },
    );
    if (ok) voltar();
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Input label="Nome" value={nome} onChangeText={setNome} />
      <Input label="Descrição (opcional)" value={descricao} onChangeText={setDescricao} multiline />
      <Input label="Capacidade (opcional)" keyboardType="number-pad" value={capacidade} onChangeText={setCapacidade} />

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label">Aprovação</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label="Precisa aprovação" selected={requerAprovacao} onPress={() => setRequerAprovacao(true)} />
          <Chip label="Automática" selected={!requerAprovacao} onPress={() => setRequerAprovacao(false)} />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label">Disponibilidade</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label="Ativa" selected={ativo} onPress={() => setAtivo(true)} />
          <Chip label="Inativa" selected={!ativo} onPress={() => setAtivo(false)} />
        </View>
      </View>

      <FormRow minimo={190}>
        <Input label="Taxa de uso (R$)" keyboardType="decimal-pad" value={taxaUso} onChangeText={setTaxaUso} />
        <Input label="Limite mensal/unidade" keyboardType="number-pad" value={limite} onChangeText={setLimite} />
      </FormRow>

      {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

      <Button title="Salvar alterações" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
    </View>
  );
}
