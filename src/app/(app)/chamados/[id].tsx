import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Card, Divider, Input, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing, tone as tones } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { alterarStatusChamado, comentarChamado, getChamado, listarEventos } from '@/lib/db';
import { formatDataHora, primeiroNome, tempoRelativo } from '@/lib/format';
import * as L from '@/lib/labels';
import { urlsAssinadas } from '@/lib/storage';
import { isGestor, type ChamadoEvento, type ChamadoStatus } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const statusOrdem: ChamadoStatus[] = ['aberto', 'em_andamento', 'resolvido', 'cancelado'];

export default function ChamadoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, papel } = useAuth();
  const gestor = isGestor(papel);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mudando, setMudando] = useState(false);

  const { data, loading, refetch } = useFetch(async () => {
    const [chamado, eventos] = await Promise.all([getChamado(id), listarEventos(id)]);
    const fotoUrls = await urlsAssinadas('chamados', chamado.fotos ?? []);
    return { chamado, eventos, fotoUrls };
  }, [id]);

  const chamado = data?.chamado;
  const eventos = data?.eventos ?? [];
  const fotoUrls = data?.fotoUrls ?? {};

  async function enviarComentario() {
    if (!comentario.trim() || !user) return;
    setEnviando(true);
    await comentarChamado(id, user.id, comentario.trim());
    setComentario('');
    setEnviando(false);
    refetch();
  }

  async function mudarStatus(novo: ChamadoStatus) {
    if (!user || !chamado || novo === chamado.status) return;
    setMudando(true);
    await alterarStatusChamado(id, user.id, novo);
    setMudando(false);
    refetch();
  }

  if (loading || !chamado)
    return (
      <Screen>
        <AppHeader title="Chamado" back />
        {loading ? <Loading /> : <AppText color="muted" center>Chamado não encontrado.</AppText>}
      </Screen>
    );

  const cat = L.chamadoCategoria[chamado.categoria];
  const st = L.chamadoStatus[chamado.status];

  return (
    <Screen>
      <AppHeader title="Chamado" back />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Badge label={cat.label} tone={cat.tone} />
        <Badge label={st.label} tone={st.tone} />
        <Badge label={L.prioridade[chamado.prioridade].label} tone={L.prioridade[chamado.prioridade].tone} />
      </View>

      <AppText variant="title">{chamado.titulo}</AppText>
      <AppText color="muted" style={{ marginTop: spacing.sm, lineHeight: 22 }}>
        {chamado.descricao}
      </AppText>

      {chamado.fotos?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.md }}>
          {chamado.fotos.filter((path) => fotoUrls[path]).map((path) => (
            <Image key={path} source={{ uri: fotoUrls[path] }} style={{ width: 120, height: 120, borderRadius: radius.md }} contentFit="cover" />
          ))}
        </ScrollView>
      ) : null}

      <Card style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Avatar nome={chamado.autor?.nome_completo} url={chamado.autor?.avatar_url} size={38} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">{chamado.autor?.nome_completo || 'Morador'}</AppText>
          <AppText color="subtle" variant="caption">
            {chamado.unidade ? `${chamado.unidade.bloco ? chamado.unidade.bloco + ' · ' : ''}${chamado.unidade.numero} · ` : ''}
            {formatDataHora(chamado.created_at)}
          </AppText>
        </View>
      </Card>

      {/* Controle de status (gestor) */}
      {gestor ? (
        <View style={{ marginTop: spacing.lg }}>
          <AppText variant="label" color="muted" style={{ marginBottom: spacing.sm }}>
            Alterar status
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {statusOrdem.map((s) => {
              const meta = L.chamadoStatus[s];
              const ativo = chamado.status === s;
              return (
                <Pressable
                  key={s}
                  disabled={mudando}
                  onPress={() => mudarStatus(s)}
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
        </View>
      ) : null}

      {/* Histórico */}
      <AppText variant="subtitle" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
        Histórico
      </AppText>
      <Card>
        {eventos.map((e, i) => (
          <View key={e.id}>
            {i > 0 ? <Divider style={{ marginVertical: spacing.sm }} /> : null}
            <EventoLinha evento={e} />
          </View>
        ))}
      </Card>

      {/* Novo comentário */}
      <View style={{ marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Input placeholder="Escreva um comentário..." value={comentario} onChangeText={setComentario} multiline />
        </View>
        <Pressable
          onPress={enviarComentario}
          disabled={enviando || !comentario.trim()}
          style={{
            width: 50,
            height: 50,
            borderRadius: radius.md,
            backgroundColor: comentario.trim() ? palette.primary : palette.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="send" size={20} color={palette.white} />
        </Pressable>
      </View>
    </Screen>
  );
}

function EventoLinha({ evento }: { evento: ChamadoEvento }) {
  const icon =
    evento.tipo === 'criacao'
      ? 'flag-outline'
      : evento.tipo === 'status'
        ? 'sync-outline'
        : evento.tipo === 'responsavel'
          ? 'person-outline'
          : 'chatbubble-outline';
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: 4 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.full,
          backgroundColor: palette.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon as any} size={16} color={palette.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{primeiroNome(evento.autor?.nome_completo) || 'Sistema'}</AppText>
        {evento.texto ? <AppText color="muted" variant="caption">{evento.texto}</AppText> : null}
        <AppText color="subtle" variant="caption" style={{ marginTop: 2 }}>
          {tempoRelativo(evento.created_at)}
        </AppText>
      </View>
    </View>
  );
}
