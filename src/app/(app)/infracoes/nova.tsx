import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Loading, Screen, Segmented } from '@/components/ui';
import { UnidadeSeletor } from '@/components/UnidadeSeletor';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarInfracao, listarUnidades } from '@/lib/db';
import { motivoInfracao, opcoes } from '@/lib/labels';
import { useVoltar } from '@/lib/navegacao';
import { type MotivoInfracao, type TipoInfracao } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function NovaInfracao() {
  const voltar = useVoltar();
  const { condominioId, user } = useAuth();
  const { data: unidades, loading } = useFetch(async () => (condominioId ? listarUnidades(condominioId) : []), [condominioId]);

  const [unidadeId, setUnidadeId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoInfracao>('advertencia');
  const [motivo, setMotivo] = useState<MotivoInfracao>('barulho');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function aplicar() {
    if (!unidadeId) return setErro('Selecione a unidade.');
    if (!descricao.trim()) return setErro('Descreva a infração.');
    const valorNum = tipo === 'multa' ? Number(valor.replace(',', '.')) : null;
    if (tipo === 'multa' && (!valorNum || valorNum <= 0)) return setErro('Informe o valor da multa.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarInfracao({
        condominio_id: condominioId,
        unidade_id: unidadeId,
        tipo,
        motivo,
        descricao: descricao.trim(),
        valor: valorNum,
        aplicada_por: user.id,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível aplicar a infração.');
      setSalvando(false);
    }
  }

  if (loading) return <Screen><AppHeader title="Aplicar infração" back /><Loading /></Screen>;

  return (
    <Screen>
      <AppHeader title="Aplicar infração" back />
      <View style={{ gap: spacing.lg }}>
        <Segmented
          value={tipo}
          onChange={setTipo}
          options={[
            { value: 'advertencia', label: 'Advertência' },
            { value: 'multa', label: 'Multa' },
          ]}
        />

        <UnidadeSeletor unidades={unidades ?? []} value={unidadeId} onChange={setUnidadeId} />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Motivo</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {opcoes(motivoInfracao).map((o) => (
              <Chip key={o.value} label={o.label} icon={motivoInfracao[o.value].icon as any} selected={motivo === o.value} onPress={() => setMotivo(o.value)} />
            ))}
          </ScrollView>
        </View>

        <Input
          label="Descrição"
          placeholder="Descreva o ocorrido, data e local..."
          value={descricao}
          onChangeText={setDescricao}
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />

        {tipo === 'multa' ? (
          <Input
            label="Valor da multa (R$)"
            placeholder="Ex.: 150,00"
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
            hint="Gera automaticamente um boleto de multa para a unidade."
          />
        ) : null}

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
        <Button
          title={tipo === 'multa' ? 'Aplicar multa' : 'Aplicar advertência'}
          icon="checkmark"
          onPress={aplicar}
          loading={salvando}
          size="lg"
        />
      </View>
    </Screen>
  );
}
