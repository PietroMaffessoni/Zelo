import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, Input, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { contestarInfracao, getInfracao, responderInfracao } from '@/lib/db';
import { formatDataHora, formatMoeda } from '@/lib/format';
import { motivoInfracao, statusInfracao, tipoInfracaoLabel } from '@/lib/labels';
import { isGestor, type StatusInfracao } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function InfracaoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { papel, membershipAtual } = useAuth();
  const gestor = isGestor(papel);

  const { data: inf, loading, refetch } = useFetch(async () => (id ? getInfracao(id) : null), [id]);
  const [texto, setTexto] = useState('');
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (loading || !inf) {
    return (
      <Screen>
        <AppHeader title="Infração" back />
        <Loading />
      </Screen>
    );
  }

  const tMeta = tipoInfracaoLabel[inf.tipo];
  const sMeta = statusInfracao[inf.status];
  const mMeta = motivoInfracao[inf.motivo];
  const daMinhaUnidade = !!membershipAtual?.unidade_id && inf.unidade_id === membershipAtual.unidade_id;
  const podeContestar = daMinhaUnidade && !gestor && inf.status === 'aplicada';

  async function contestar() {
    if (!texto.trim() || !id) return;
    setEnviando(true);
    await contestarInfracao(id, texto.trim());
    setTexto('');
    await refetch();
    setEnviando(false);
  }

  async function responder(status: StatusInfracao) {
    if (!id) return;
    setEnviando(true);
    await responderInfracao(id, status, resposta.trim() || null);
    setResposta('');
    await refetch();
    setEnviando(false);
  }

  return (
    <Screen>
      <AppHeader title={tMeta.label} back subtitle={mMeta.label} />
      <View style={{ gap: spacing.lg }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Badge label={tMeta.label} tone={tMeta.tone} />
            <Badge label={sMeta.label} tone={sMeta.tone} />
            {inf.valor ? <AppText variant="subtitle" style={{ marginLeft: 'auto' }}>{formatMoeda(inf.valor)}</AppText> : null}
          </View>
          <AppText>{inf.descricao}</AppText>
          <AppText color="subtle" variant="caption" style={{ marginTop: spacing.sm }}>
            {inf.unidade ? `${inf.unidade.bloco ? 'Bloco ' + inf.unidade.bloco + ' · ' : ''}Unidade ${inf.unidade.numero} · ` : ''}
            {formatDataHora(inf.created_at)}
          </AppText>
        </Card>

        {inf.contestacao ? (
          <Card>
            <AppText variant="label" color="primary">Contestação da unidade</AppText>
            <AppText style={{ marginTop: 4 }}>{inf.contestacao}</AppText>
            {inf.contestada_em ? (
              <AppText color="subtle" variant="caption" style={{ marginTop: 4 }}>{formatDataHora(inf.contestada_em)}</AppText>
            ) : null}
          </Card>
        ) : null}

        {inf.resposta_gestor ? (
          <Card>
            <AppText variant="label" color="primary">Resposta do síndico</AppText>
            <AppText style={{ marginTop: 4 }}>{inf.resposta_gestor}</AppText>
          </Card>
        ) : null}

        {/* Morador: contestar */}
        {podeContestar ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="subtitle">Contestar</AppText>
            <AppText color="muted" variant="caption">
              Explique por que discorda desta {inf.tipo === 'multa' ? 'multa' : 'advertência'}. O síndico irá avaliar.
            </AppText>
            <Input placeholder="Sua justificativa..." value={texto} onChangeText={setTexto} multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
            <Button title="Enviar contestação" icon="chatbox-ellipses-outline" onPress={contestar} loading={enviando} />
          </View>
        ) : null}

        {/* Gestor: responder / decidir */}
        {gestor && inf.status !== 'anulada' && inf.status !== 'paga' ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="subtitle">Decisão do síndico</AppText>
            <Input placeholder="Resposta (opcional)..." value={resposta} onChangeText={setResposta} multiline />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title="Manter" variant="danger" icon="checkmark-circle-outline" onPress={() => responder('confirmada')} loading={enviando} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Anular" variant="secondary" icon="close-circle-outline" onPress={() => responder('anulada')} loading={enviando} />
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
