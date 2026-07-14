import { useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, Divider, Input, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { getEquipamento, listarManutencoes, registrarManutencao } from '@/lib/db';
import { formatData, formatMoeda } from '@/lib/format';
import { categoriaEquipamento } from '@/lib/labels';
import { isGestor, manutencaoVencida } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function EquipamentoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { condominioId, user, papel } = useAuth();
  const gestor = isGestor(papel);

  const { data, loading, refetch } = useFetch(async () => {
    if (!id) return null;
    const [equipamento, historico] = await Promise.all([getEquipamento(id), listarManutencoes(id)]);
    return { equipamento, historico };
  }, [id]);

  const [descricao, setDescricao] = useState('');
  const [custo, setCusto] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (loading || !data?.equipamento) {
    return (
      <Screen>
        <AppHeader title="Equipamento" back />
        <Loading />
      </Screen>
    );
  }

  const { equipamento: eq, historico } = data;
  const meta = categoriaEquipamento[eq.categoria];
  const vencida = manutencaoVencida(eq.proxima_manutencao);

  async function registrar() {
    if (!descricao.trim()) return setErro('Descreva o serviço realizado.');
    if (!condominioId || !user || !id) return;
    setSalvando(true);
    setErro(null);
    try {
      await registrarManutencao({
        condominio_id: condominioId,
        equipamento_id: id,
        descricao: descricao.trim(),
        custo: custo ? Number(custo.replace(',', '.')) : null,
        realizada_em: dayjs().format('YYYY-MM-DD'),
        responsavel: responsavel.trim() || null,
        registrado_por: user.id,
        periodicidade_dias: eq.periodicidade_dias,
      });
      setDescricao('');
      setCusto('');
      setResponsavel('');
      await refetch();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível registrar.');
    }
    setSalvando(false);
  }

  return (
    <Screen>
      <AppHeader title={eq.nome} back subtitle={meta.label} />
      <View style={{ gap: spacing.lg }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="label" color="muted">Próxima manutenção</AppText>
            {eq.proxima_manutencao ? (
              <Badge label={vencida ? `Vencida — ${formatData(eq.proxima_manutencao)}` : formatData(eq.proxima_manutencao)} tone={vencida ? 'danger' : 'success'} />
            ) : (
              <Badge label="Sem plano" tone="neutral" />
            )}
          </View>
          {eq.ultima_manutencao ? (
            <AppText color="subtle" variant="caption" style={{ marginTop: spacing.sm }}>
              Última: {formatData(eq.ultima_manutencao)}
            </AppText>
          ) : null}
          {eq.localizacao ? <AppText color="muted" variant="caption">Local: {eq.localizacao}</AppText> : null}
          {eq.fornecedor ? <AppText color="muted" variant="caption">Fornecedor: {eq.fornecedor}</AppText> : null}
        </Card>

        {gestor ? (
          <Card>
            <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>Registrar manutenção</AppText>
            <View style={{ gap: spacing.sm }}>
              <Input label="Serviço realizado" placeholder="Ex.: Troca de óleo e revisão" value={descricao} onChangeText={setDescricao} multiline />
              <Input label="Custo (R$, opcional)" placeholder="Ex.: 350,00" value={custo} onChangeText={setCusto} keyboardType="decimal-pad" />
              <Input label="Responsável (opcional)" placeholder="Empresa ou técnico" value={responsavel} onChangeText={setResponsavel} />
              {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
              <Button title="Registrar e reprogramar" icon="checkmark-done" onPress={registrar} loading={salvando} />
            </View>
          </Card>
        ) : null}

        <View>
          <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>Histórico</AppText>
          {historico.length === 0 ? (
            <Card>
              <AppText color="muted" center>Nenhuma manutenção registrada ainda.</AppText>
            </Card>
          ) : (
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {historico.map((m, i) => (
                <View key={m.id}>
                  {i > 0 ? <Divider /> : null}
                  <View style={{ paddingVertical: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AppText variant="label">{formatData(m.realizada_em)}</AppText>
                      {m.custo ? <AppText color="muted" variant="caption">{formatMoeda(m.custo)}</AppText> : null}
                    </View>
                    <AppText style={{ marginTop: 2 }}>{m.descricao}</AppText>
                    {m.responsavel ? <AppText color="subtle" variant="caption">{m.responsavel}</AppText> : null}
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}
