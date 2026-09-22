import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Input, Loading, MetaLine, Panel, Row, Screen, Section, SectionHeader } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';
import { alterarStatusChamado, comentarChamado, getChamado, listarEventos } from '@/lib/db';
import { formatDataHora, primeiroNome, tempoRelativo } from '@/lib/format';
import * as L from '@/lib/labels';
import { urlsAssinadas } from '@/lib/storage';
import { isGestor, type ChamadoEvento, type ChamadoStatus } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const statusOrdem: ChamadoStatus[] = ['aberto', 'em_andamento', 'resolvido', 'cancelado'];

/**
 * Detalhe de um chamado.
 *
 * Vive fora da rota para poder ser usado nos dois lugares: como página própria
 * (`chamados/[id]`) e, em telas grandes, como a coluna da direita ao lado da
 * lista. Antes o conteúdo morava dentro do arquivo de rota e só existia como
 * página — o que obrigava o síndico num monitor de 1920px a navegar e voltar
 * para ler cada chamado, enquanto metade da tela ficava em branco.
 *
 * `embutido` diz qual dos dois papéis ele está cumprindo: como coluna, não
 * desenha o próprio `Screen` nem o cabeçalho com "voltar" — quem cuida do
 * enquadramento é a tela que o contém.
 */
export function DetalheChamado({ id, embutido = false }: { id: string; embutido?: boolean }) {
  const { palette, tone: tones } = useAppTheme();
  const { user, papel } = useAuth();
  const acao = useAcao();
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
    const ok = await acao(() => alterarStatusChamado(id, user.id, novo), {
      sempre: () => setMudando(false),
    });
    if (ok) refetch();
  }

  if (loading || !chamado) {
    const vazio = loading ? <Loading /> : <AppText color="muted" center>Chamado não encontrado.</AppText>;
    return embutido ? <View style={{ paddingTop: spacing.xl }}>{vazio}</View> : (
      <Screen>
        <AppHeader title="Chamado" back />
        {vazio}
      </Screen>
    );
  }

  const cat = L.chamadoCategoria[chamado.categoria];
  const st = L.chamadoStatus[chamado.status];

  const conteudo = (
    <>

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

      {/* Quem abriu e quando: contexto do registro, marcado por fios em vez de
          mais uma caixa dentro da página. */}
      <View
        style={{
          marginTop: spacing.lg,
          paddingVertical: spacing.md,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Avatar nome={chamado.autor?.nome_completo} url={chamado.autor?.avatar_url} size={32} />
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" numberOfLines={1}>
            {chamado.autor?.nome_completo || 'Morador'}
          </AppText>
          <MetaLine
            color="subtle"
            style={{ marginTop: 1 }}
            itens={[
              chamado.unidade
                ? `${chamado.unidade.bloco ? chamado.unidade.bloco + ' · ' : ''}${chamado.unidade.numero}`
                : null,
              formatDataHora(chamado.created_at),
            ]}
          />
        </View>
      </View>

      {/* Controle de status (gestor) */}
      {gestor ? (
        <Section>
          <SectionHeader title="Alterar status" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {statusOrdem.map((s) => {
              const meta = L.chamadoStatus[s];
              const ativo = chamado.status === s;
              return (
                <Pressable
                  key={s}
                  disabled={mudando}
                  onPress={() => mudarStatus(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={meta.label}
                  style={({ hovered }: any) => ({
                    minHeight: 32,
                    justifyContent: 'center',
                    paddingHorizontal: spacing.md - 1,
                    paddingVertical: 6,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: ativo ? tones[meta.tone].fg : hovered ? palette.borderStrong : palette.border,
                    backgroundColor: ativo ? tones[meta.tone].bg : hovered ? palette.surfaceAlt : palette.surface,
                  })}
                >
                  <AppText variant="label" style={{ color: ativo ? tones[meta.tone].fg : palette.textMuted }}>
                    {meta.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Section>
      ) : null}

      {/* Histórico */}
      <Section>
        <SectionHeader title="Histórico" />
        <Panel>
          {eventos.map((e) => (
            <Row key={e.id} compact>
              <EventoLinha evento={e} />
            </Row>
          ))}
        </Panel>
      </Section>

      {/* Novo comentário */}
      <View style={{ marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Input placeholder="Escreva um comentário..." value={comentario} onChangeText={setComentario} multiline />
        </View>
        <Pressable
          onPress={enviarComentario}
          disabled={enviando || !comentario.trim()}
          accessibilityRole="button"
          accessibilityLabel="Enviar comentário"
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: comentario.trim() ? palette.primary : palette.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="send" size={17} color={comentario.trim() ? palette.onPrimary : palette.textSubtle} />
        </Pressable>
      </View>
    </>
  );

  if (embutido) return <View>{conteudo}</View>;

  return (
    <Screen>
      <AppHeader title="Chamado" back />
      {conteudo}
    </Screen>
  );
}

function EventoLinha({ evento }: { evento: ChamadoEvento }) {
  const { palette } = useAppTheme();
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
      {/* O disco cinza atrás de cada ícone virava uma coluna de bolhas ao longo
          do histórico. O ícone sozinho já ancora a linha. */}
      <View style={{ width: 20, alignItems: 'center', paddingTop: 2 }}>
        <Ionicons name={icon as any} size={15} color={palette.textSubtle} />
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
