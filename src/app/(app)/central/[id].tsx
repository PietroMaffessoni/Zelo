import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Button, Card, Input, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing, tone as tones } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { getSolicitacao, responderSolicitacao } from '@/lib/db';
import { formatDataHora } from '@/lib/format';
import * as L from '@/lib/labels';
import { isGestor, type SolicitacaoStatus } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const statuses: SolicitacaoStatus[] = ['aberta', 'em_analise', 'concluida', 'recusada'];

export default function SolicitacaoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { papel } = useAuth();
  const gestor = isGestor(papel);
  const { data: s, loading, refetch } = useFetch(() => getSolicitacao(id), [id]);

  const [status, setStatus] = useState<SolicitacaoStatus>('em_analise');
  const [resposta, setResposta] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (s) {
      setStatus(s.status === 'aberta' ? 'em_analise' : s.status);
      setResposta(s.resposta ?? '');
    }
  }, [s]);

  async function salvar() {
    setSalvando(true);
    await responderSolicitacao(id, status, resposta.trim() || undefined);
    setSalvando(false);
    refetch();
  }

  if (loading || !s)
    return (
      <Screen>
        <AppHeader title="Solicitação" back />
        {loading ? <Loading /> : <AppText color="muted" center>Não encontrada.</AppText>}
      </Screen>
    );

  const cat = L.solicitacaoCategoria[s.categoria];
  const st = L.solicitacaoStatus[s.status];

  return (
    <Screen>
      <AppHeader title="Solicitação" back />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Badge label={cat.label} tone={cat.tone} />
        <Badge label={st.label} tone={st.tone} />
      </View>

      <AppText variant="title">{s.titulo}</AppText>
      <AppText color="muted" style={{ marginTop: spacing.sm, lineHeight: 22 }}>
        {s.descricao}
      </AppText>

      <Card style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Avatar nome={s.morador?.nome_completo} url={s.morador?.avatar_url} size={36} />
        <View>
          <AppText variant="label">{s.morador?.nome_completo || 'Morador'}</AppText>
          <AppText color="subtle" variant="caption">{formatDataHora(s.created_at)}</AppText>
        </View>
      </Card>

      {/* Resposta existente (visão do morador) */}
      {!gestor && s.resposta ? (
        <Card style={{ marginTop: spacing.lg, backgroundColor: palette.primarySoft, borderColor: palette.primarySoft }}>
          <AppText variant="label" color="primary">Resposta da administração</AppText>
          <AppText style={{ marginTop: spacing.xs }}>{s.resposta}</AppText>
        </Card>
      ) : null}

      {/* Painel de resposta (gestor) */}
      {gestor ? (
        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <AppText variant="subtitle">Responder</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {statuses.map((s2) => {
              const meta = L.solicitacaoStatus[s2];
              const ativo = status === s2;
              return (
                <Pressable
                  key={s2}
                  onPress={() => setStatus(s2)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.full,
                    borderWidth: 1.5,
                    borderColor: ativo ? tones[meta.tone].fg : palette.border,
                    backgroundColor: ativo ? tones[meta.tone].bg : palette.surface,
                  }}
                >
                  <AppText variant="label" style={{ color: ativo ? tones[meta.tone].fg : palette.textMuted }}>
                    {meta.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <Input
            label="Mensagem ao morador"
            placeholder="Escreva a resposta..."
            value={resposta}
            onChangeText={setResposta}
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <Button title="Salvar resposta" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
        </View>
      ) : null}
    </Screen>
  );
}
