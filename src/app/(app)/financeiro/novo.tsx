import dayjs from 'dayjs';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { UnidadeSeletor } from '@/components/UnidadeSeletor';
import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarLancamento, listarUnidades } from '@/lib/db';
import { categoriaFinanceira } from '@/lib/labels';
import { useVoltar } from '@/lib/navegacao';
import { enviarArquivo, escolherDocumento } from '@/lib/storage';
import { type CategoriaFinanceira, type TipoLancamento } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const categorias: CategoriaFinanceira[] = [
  'taxa_condominial',
  'fundo_reserva',
  'multa',
  'agua',
  'luz',
  'manutencao',
  'servicos',
  'outros',
];

export default function NovoLancamento() {
  const voltar = useVoltar();
  const { condominioId, user } = useAuth();
  const [tipo, setTipo] = useState<TipoLancamento>('boleto');
  const [unidadeId, setUnidadeId] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<CategoriaFinanceira>('taxa_condominial');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [observacao, setObservacao] = useState('');
  const [anexo, setAnexo] = useState<{ uri: string; nome: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const { data: unidades } = useFetch(async () => (condominioId ? listarUnidades(condominioId) : []), [condominioId]);

  async function selecionarAnexo() {
    const arquivo = await escolherDocumento();
    if (arquivo) setAnexo(arquivo);
  }

  async function salvar() {
    if (!descricao.trim()) return setErro('Descreva o lançamento.');
    const valorNumero = Number(valor.replace(',', '.'));
    if (!valor || Number.isNaN(valorNumero) || valorNumero <= 0) return setErro('Informe um valor válido.');
    const dataVencimento = dayjs(vencimento, 'DD/MM/YYYY', true);
    if (!dataVencimento.isValid()) return setErro('Informe o vencimento no formato DD/MM/AAAA.');
    if (tipo === 'boleto' && !unidadeId) return setErro('Selecione a unidade do boleto.');
    if (!condominioId || !user) return;

    setSalvando(true);
    setErro(null);
    try {
      const anexo_path = anexo ? await enviarArquivo('financeiro', anexo.uri, condominioId, anexo.nome) : null;
      await criarLancamento({
        condominio_id: condominioId,
        unidade_id: tipo === 'boleto' ? unidadeId : null,
        tipo,
        categoria,
        descricao: descricao.trim(),
        valor: valorNumero,
        vencimento: dataVencimento.format('YYYY-MM-DD'),
        anexo_path,
        observacao: observacao.trim() || null,
        criado_por: user.id,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível salvar o lançamento.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Novo lançamento" back />
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label="Boleto (unidade)" selected={tipo === 'boleto'} onPress={() => setTipo('boleto')} />
          <Chip label="Despesa geral" selected={tipo === 'despesa'} onPress={() => setTipo('despesa')} />
        </View>

        {tipo === 'boleto' ? (
          <UnidadeSeletor unidades={unidades ?? []} value={unidadeId} onChange={setUnidadeId} />
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Categoria</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {categorias.map((c) => (
              <Chip key={c} label={categoriaFinanceira[c].label} selected={categoria === c} onPress={() => setCategoria(c)} />
            ))}
          </ScrollView>
        </View>

        <Input label="Descrição" placeholder="Ex.: Taxa condominial de julho" value={descricao} onChangeText={setDescricao} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Valor (R$)" placeholder="350,00" keyboardType="decimal-pad" value={valor} onChangeText={setValor} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Vencimento" placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" value={vencimento} onChangeText={setVencimento} />
          </View>
        </View>
        <Input label="Observação (opcional)" placeholder="Detalhes adicionais..." value={observacao} onChangeText={setObservacao} multiline />

        <Button
          title={anexo ? anexo.nome : 'Anexar comprovante/boleto (opcional)'}
          variant="secondary"
          icon="document-attach-outline"
          onPress={selecionarAnexo}
        />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Salvar lançamento" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
