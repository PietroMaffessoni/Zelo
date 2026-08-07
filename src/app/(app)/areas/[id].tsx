import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { atualizarArea, getArea } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';
import { useFetch } from '@/lib/useFetch';

export default function EditarArea() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const voltar = useVoltar();
  const { data: area, loading } = useFetch(() => getArea(id), [id]);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [requerAprovacao, setRequerAprovacao] = useState(true);
  const [ativo, setAtivo] = useState(true);
  const [taxaUso, setTaxaUso] = useState('');
  const [limite, setLimite] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!area) return;
    setNome(area.nome);
    setDescricao(area.descricao ?? '');
    setCapacidade(area.capacidade ? String(area.capacidade) : '');
    setRequerAprovacao(area.requer_aprovacao);
    setAtivo(area.ativo);
    setTaxaUso(area.taxa_uso ? String(area.taxa_uso) : '');
    setLimite(area.limite_mensal_por_unidade ? String(area.limite_mensal_por_unidade) : '');
  }, [area]);

  async function salvar() {
    if (!nome.trim()) return setErro('Informe o nome da área.');
    setSalvando(true);
    setErro(null);
    try {
      await atualizarArea(id, {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        capacidade: capacidade.trim() ? Number(capacidade) : null,
        requer_aprovacao: requerAprovacao,
        ativo,
        taxa_uso: taxaUso.trim() ? Number(taxaUso.replace(',', '.')) : 0,
        limite_mensal_por_unidade: limite.trim() ? Number(limite) : null,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

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
      <View style={{ gap: spacing.lg }}>
        <Input label="Nome" value={nome} onChangeText={setNome} />
        <Input label="Descrição (opcional)" value={descricao} onChangeText={setDescricao} multiline />
        <Input label="Capacidade (opcional)" keyboardType="number-pad" value={capacidade} onChangeText={setCapacidade} />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Aprovação</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label="Precisa aprovação" selected={requerAprovacao} onPress={() => setRequerAprovacao(true)} />
            <Chip label="Automática" selected={!requerAprovacao} onPress={() => setRequerAprovacao(false)} />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Disponibilidade</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label="Ativa" selected={ativo} onPress={() => setAtivo(true)} />
            <Chip label="Inativa" selected={!ativo} onPress={() => setAtivo(false)} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Taxa de uso (R$)" keyboardType="decimal-pad" value={taxaUso} onChangeText={setTaxaUso} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Limite mensal/unidade" keyboardType="number-pad" value={limite} onChangeText={setLimite} />
          </View>
        </View>

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Salvar alterações" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
