import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarEquipamento } from '@/lib/db';
import { categoriaEquipamento, opcoes } from '@/lib/labels';
import { type CategoriaEquipamento } from '@/lib/types';

const PERIODOS = [
  { value: 30, label: 'Mensal' },
  { value: 90, label: 'Trimestral' },
  { value: 180, label: 'Semestral' },
  { value: 365, label: 'Anual' },
];

export default function NovoEquipamento() {
  const router = useRouter();
  const { condominioId } = useAuth();
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaEquipamento>('elevador');
  const [localizacao, setLocalizacao] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [periodicidade, setPeriodicidade] = useState<number | null>(90);
  const [dias, setDias] = useState(30);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const proximaData = useMemo(() => dayjs().add(dias, 'day').format('YYYY-MM-DD'), [dias]);

  async function salvar() {
    if (!nome.trim()) return setErro('Informe o nome do equipamento.');
    if (!condominioId) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarEquipamento({
        condominio_id: condominioId,
        nome: nome.trim(),
        categoria,
        localizacao: localizacao.trim() || null,
        fornecedor: fornecedor.trim() || null,
        periodicidade_dias: periodicidade,
        proxima_manutencao: proximaData,
      });
      router.back();
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

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Categoria</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {opcoes(categoriaEquipamento).map((o) => (
              <Chip key={o.value} label={o.label} icon={categoriaEquipamento[o.value].icon as any} selected={categoria === o.value} onPress={() => setCategoria(o.value)} />
            ))}
          </ScrollView>
        </View>

        <Input label="Localização (opcional)" placeholder="Ex.: Subsolo, casa de máquinas" value={localizacao} onChangeText={setLocalizacao} />
        <Input label="Fornecedor / empresa (opcional)" placeholder="Ex.: Otis, ThyssenKrupp..." value={fornecedor} onChangeText={setFornecedor} />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Periodicidade da manutenção</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {PERIODOS.map((p) => (
              <Chip key={p.value} label={p.label} selected={periodicidade === p.value} onPress={() => { setPeriodicidade(p.value); setDias(p.value); }} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Próxima manutenção em</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {[7, 15, 30, 60, 90, 180].map((d) => (
              <Chip key={d} label={dayjs().add(d, 'day').format('DD/MM/YY')} selected={dias === d} onPress={() => setDias(d)} />
            ))}
          </ScrollView>
        </View>

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
        <Button title="Cadastrar equipamento" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
