import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarUnidade } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';

export default function NovaUnidade() {
  const voltar = useVoltar();
  const { condominioId } = useAuth();
  const [bloco, setBloco] = useState('');
  const [numero, setNumero] = useState('');
  const [fracaoIdeal, setFracaoIdeal] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!numero.trim()) return setErro('Informe o número da unidade.');
    if (!condominioId) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarUnidade({
        condominio_id: condominioId,
        bloco: bloco.trim() || null,
        numero: numero.trim(),
        fracao_ideal: fracaoIdeal.trim() ? Number(fracaoIdeal.replace(',', '.')) : null,
        observacoes: observacoes.trim() || null,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message?.includes('duplicate') ? 'Essa unidade já existe.' : e?.message ?? 'Não foi possível cadastrar.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Nova unidade" back />
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Bloco (opcional)" placeholder="A" value={bloco} onChangeText={setBloco} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Apto/Casa" placeholder="101" value={numero} onChangeText={setNumero} />
          </View>
        </View>
        <Input
          label="Fração ideal (opcional)"
          placeholder="Ex.: 0.0125"
          value={fracaoIdeal}
          onChangeText={setFracaoIdeal}
          keyboardType="decimal-pad"
        />
        <Input label="Observações (opcional)" placeholder="Anotações internas..." value={observacoes} onChangeText={setObservacoes} multiline />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Cadastrar unidade" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
