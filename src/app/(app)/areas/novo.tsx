import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarArea } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';

export default function NovaArea() {
  const voltar = useVoltar();
  const { condominioId } = useAuth();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [requerAprovacao, setRequerAprovacao] = useState(true);
  const [taxaUso, setTaxaUso] = useState('');
  const [limite, setLimite] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) return setErro('Informe o nome da área.');
    if (!condominioId) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarArea({
        condominio_id: condominioId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        capacidade: capacidade.trim() ? Number(capacidade) : null,
        requer_aprovacao: requerAprovacao,
        taxa_uso: taxaUso.trim() ? Number(taxaUso.replace(',', '.')) : 0,
        limite_mensal_por_unidade: limite.trim() ? Number(limite) : null,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível cadastrar a área.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Nova área comum" back />
      <View style={{ gap: spacing.lg }}>
        <Input label="Nome" placeholder="Ex.: Salão de festas" value={nome} onChangeText={setNome} />
        <Input label="Descrição (opcional)" placeholder="Detalhes sobre a área..." value={descricao} onChangeText={setDescricao} multiline />
        <Input label="Capacidade (opcional)" placeholder="Ex.: 40 pessoas" keyboardType="number-pad" value={capacidade} onChangeText={setCapacidade} />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Aprovação</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label="Precisa aprovação" selected={requerAprovacao} onPress={() => setRequerAprovacao(true)} />
            <Chip label="Automática" selected={!requerAprovacao} onPress={() => setRequerAprovacao(false)} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Taxa de uso (R$, opcional)" placeholder="0,00" keyboardType="decimal-pad" value={taxaUso} onChangeText={setTaxaUso} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Limite mensal/unidade (opcional)" placeholder="Ex.: 2" keyboardType="number-pad" value={limite} onChangeText={setLimite} />
          </View>
        </View>

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Cadastrar área" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
