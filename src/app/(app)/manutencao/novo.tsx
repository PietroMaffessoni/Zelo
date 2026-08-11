import dayjs from 'dayjs';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarEquipamento } from '@/lib/db';
import { mascaraData, parseData } from '@/lib/format';
import { useVoltar } from '@/lib/navegacao';

const PERIODOS = [
  { value: 30, label: 'Mensal' },
  { value: 90, label: 'Trimestral' },
  { value: 180, label: 'Semestral' },
  { value: 365, label: 'Anual' },
];

export default function NovoEquipamento() {
  const voltar = useVoltar();
  const { condominioId } = useAuth();
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [periodicidade, setPeriodicidade] = useState<number | null>(90);
  // "Outra": a periodicidade sai de um campo em dias em vez dos chips.
  const [outraPeriodicidade, setOutraPeriodicidade] = useState(false);
  const [dias, setDias] = useState('');
  const [proxima, setProxima] = useState(dayjs().add(90, 'day').format('DD/MM/YYYY'));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  /** A data sugerida acompanha a periodicidade escolhida — o síndico pode editar. */
  function escolherPeriodo(valor: number | null) {
    setPeriodicidade(valor);
    if (valor) setProxima(dayjs().add(valor, 'day').format('DD/MM/YYYY'));
  }

  function mudarDias(texto: string) {
    const limpo = texto.replace(/\D/g, '').slice(0, 4);
    setDias(limpo);
    escolherPeriodo(limpo ? Number(limpo) : null);
  }

  async function salvar() {
    if (!nome.trim()) return setErro('Informe o nome do equipamento.');
    if (!categoria.trim()) return setErro('Informe a categoria do equipamento.');
    if (outraPeriodicidade && !periodicidade) return setErro('Informe a periodicidade em dias.');
    const data = parseData(proxima);
    if (!data.isValid()) return setErro('Informe a próxima manutenção no formato DD/MM/AAAA.');
    if (!condominioId) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarEquipamento({
        condominio_id: condominioId,
        nome: nome.trim(),
        categoria: categoria.trim(),
        localizacao: localizacao.trim() || null,
        fornecedor: fornecedor.trim() || null,
        periodicidade_dias: periodicidade,
        proxima_manutencao: data.format('YYYY-MM-DD'),
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Novo equipamento" back />
      <View style={{ gap: spacing.lg }}>
        <Input label="Nome" placeholder="Ex.: Elevador social — Torre A" value={nome} onChangeText={setNome} />

        <Input
          label="Categoria"
          placeholder="Ex.: Elevador, Bomba d’água, Portão..."
          value={categoria}
          onChangeText={setCategoria}
          maxLength={40}
        />

        <Input label="Localização (opcional)" placeholder="Ex.: Subsolo, casa de máquinas" value={localizacao} onChangeText={setLocalizacao} />
        <Input label="Fornecedor / empresa (opcional)" placeholder="Ex.: Otis, ThyssenKrupp..." value={fornecedor} onChangeText={setFornecedor} />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Periodicidade da manutenção</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {PERIODOS.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                selected={!outraPeriodicidade && periodicidade === p.value}
                onPress={() => { setOutraPeriodicidade(false); escolherPeriodo(p.value); }}
              />
            ))}
            <Chip
              label="Outra"
              selected={outraPeriodicidade}
              onPress={() => { setOutraPeriodicidade(true); escolherPeriodo(dias ? Number(dias) : null); }}
            />
          </ScrollView>
          {outraPeriodicidade ? (
            <Input
              placeholder="A cada quantos dias? Ex.: 45"
              value={dias}
              onChangeText={mudarDias}
              keyboardType="number-pad"
              hint={periodicidade ? `A cada ${periodicidade} dia(s).` : undefined}
            />
          ) : null}
        </View>

        <Input
          label="Próxima manutenção"
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          maxLength={10}
          value={proxima}
          onChangeText={(v) => setProxima(mascaraData(v))}
          hint="Sugerida pela periodicidade — pode alterar."
        />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
        <Button title="Cadastrar equipamento" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
