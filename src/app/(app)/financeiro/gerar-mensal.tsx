import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { gerarBoletosMensais } from '@/lib/db';
import { mascaraCompetencia, mascaraData, parseData } from '@/lib/format';
import { categoriaFinanceira } from '@/lib/labels';
import { type CategoriaFinanceira } from '@/lib/types';

const categorias: CategoriaFinanceira[] = ['taxa_condominial', 'fundo_reserva', 'agua', 'luz', 'manutencao', 'outros'];

export default function GerarBoletosMensais() {
  const router = useRouter();
  const { condominioId } = useAuth();
  const [categoria, setCategoria] = useState<CategoriaFinanceira>('taxa_condominial');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [competencia, setCompetencia] = useState(dayjs().format('MM/YYYY'));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function gerar() {
    if (!descricao.trim()) return setErro('Descreva a cobrança.');
    const valorNumero = Number(valor.replace(',', '.'));
    if (!valor || Number.isNaN(valorNumero) || valorNumero <= 0) return setErro('Informe um valor válido.');
    const dataVencimento = parseData(vencimento);
    if (!dataVencimento.isValid()) return setErro('Informe o vencimento no formato DD/MM/AAAA.');
    if (!condominioId) return;

    setSalvando(true);
    setErro(null);
    try {
      await gerarBoletosMensais({
        condominio_id: condominioId,
        categoria,
        descricao: descricao.trim(),
        valor: valorNumero,
        vencimento: dataVencimento.format('YYYY-MM-DD'),
        competencia: competencia.trim() || null,
      });
      router.replace('/(app)/financeiro');
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível gerar os boletos.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Gerar cobrança mensal" back subtitle="Lança a mesma cobrança para todas as unidades" />
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Categoria</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {categorias.map((c) => (
              <Chip key={c} label={categoriaFinanceira[c].label} selected={categoria === c} onPress={() => setCategoria(c)} />
            ))}
          </ScrollView>
        </View>

        <Input label="Descrição" placeholder="Ex.: Taxa condominial" value={descricao} onChangeText={setDescricao} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Valor (R$)" placeholder="350,00" keyboardType="decimal-pad" value={valor} onChangeText={setValor} />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Vencimento"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
              value={vencimento}
              onChangeText={(v) => setVencimento(mascaraData(v))}
            />
          </View>
        </View>
        <Input
          label="Competência (opcional)"
          placeholder="MM/AAAA"
          keyboardType="number-pad"
          maxLength={7}
          value={competencia}
          onChangeText={(v) => setCompetencia(mascaraCompetencia(v))}
        />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Gerar para todas as unidades" icon="checkmark-done" onPress={gerar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
