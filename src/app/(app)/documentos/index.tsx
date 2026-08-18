import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarDocumentos, removerDocumento } from '@/lib/db';
import { formatData } from '@/lib/format';
import { categoriaDocumento } from '@/lib/labels';
import { urlAssinada } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type Documento } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

function formatTamanho(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documentos() {
  const router = useRouter();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarDocumentos(condominioId) : []),
    [condominioId],
  );

  const documentos = data ?? [];
  // O regimento interno é a referência que o morador mais procura: fica fixado no
  // topo, separado do resto. Se ainda não foi publicado, a seção nem aparece.
  const regimento = documentos.filter((d) => d.categoria === 'regimento_interno');
  const demais = documentos.filter((d) => d.categoria !== 'regimento_interno');

  async function abrir(id: string, path: string) {
    setAbrindoId(id);
    try {
      const url = await urlAssinada('documentos', path);
      await WebBrowser.openBrowserAsync(url);
    } finally {
      setAbrindoId(null);
    }
  }

  async function remover(id: string) {
    setRemovendoId(id);
    await removerDocumento(id);
    setRemovendoId(null);
    refetch();
  }

  function renderCard(d: Documento, comCategoria: boolean) {
    return (
      <DocumentoCard
        key={d.id}
        documento={d}
        categoria={comCategoria}
        gestor={gestor}
        abrindo={abrindoId === d.id}
        removendo={removendoId === d.id}
        onAbrir={() => d.arquivo_path && abrir(d.id, d.arquivo_path)}
        onRemover={() => remover(d.id)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Documentos" back subtitle="Documentos do condomínio" />

        <View style={{ marginTop: spacing.lg }}>
          {loading ? (
            <Loading />
          ) : documentos.length === 0 ? (
            <EmptyState
              icon="folder-open-outline"
              title="Nenhum documento publicado"
              description={gestor ? 'Toque em "Publicar" para adicionar o primeiro documento.' : 'O síndico ainda não publicou documentos.'}
            />
          ) : (
            <View style={{ gap: spacing.xl }}>
              {regimento.length > 0 ? (
                <View style={{ gap: spacing.md }}>
                  <SecaoTitulo icone="pin" texto="Regimento interno" />
                  {regimento.map((d) => renderCard(d, false))}
                </View>
              ) : null}

              {demais.length > 0 ? (
                <View style={{ gap: spacing.md }}>
                  {regimento.length > 0 ? <SecaoTitulo icone="folder-outline" texto="Outros documentos" /> : null}
                  {demais.map((d) => renderCard(d, true))}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </Screen>
      {gestor ? <Fab icon="add" label="Publicar" onPress={() => router.push('/(app)/documentos/novo')} /> : null}
    </View>
  );
}

function SecaoTitulo({ icone, texto }: { icone: keyof typeof Ionicons.glyphMap; texto: string }) {
  const { palette } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons name={icone} size={14} color={palette.textMuted} />
      <AppText variant="label" color="muted">{texto}</AppText>
    </View>
  );
}

function DocumentoCard({
  documento: d,
  categoria,
  gestor,
  abrindo,
  removendo,
  onAbrir,
  onRemover,
}: {
  documento: Documento;
  /** Mostra o selo da categoria — desnecessário na seção do regimento. */
  categoria: boolean;
  gestor: boolean;
  abrindo: boolean;
  removendo: boolean;
  onAbrir: () => void;
  onRemover: () => void;
}) {
  const { palette } = useAppTheme();
  const meta = categoriaDocumento[d.categoria];

  return (
    <Card onPress={d.arquivo_path ? onAbrir : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: palette.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={(d.arquivo_path ? meta.icon ?? 'document-outline' : 'text-outline') as any} size={20} color={palette.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" numberOfLines={1}>
            {d.titulo}
          </AppText>
          <AppText color="muted" variant="caption">
            {formatData(d.created_at)}
            {formatTamanho(d.tamanho_bytes) ? ` · ${formatTamanho(d.tamanho_bytes)}` : ''}
          </AppText>
        </View>
        {abrindo ? (
          <Ionicons name="hourglass-outline" size={18} color={palette.textSubtle} />
        ) : gestor ? (
          <Pressable onPress={onRemover} hitSlop={8} disabled={removendo}>
            <Ionicons name="trash-outline" size={18} color={palette.textSubtle} />
          </Pressable>
        ) : d.arquivo_path ? (
          <Ionicons name="chevron-forward" size={18} color={palette.textSubtle} />
        ) : null}
      </View>
      {categoria ? <Badge label={meta.label} tone={meta.tone} style={{ marginTop: spacing.sm }} /> : null}
      {d.descricao ? (
        // Sem anexo, a descrição É o documento — mostra inteira em vez de resumo.
        <AppText color="muted" style={{ marginTop: spacing.sm }} numberOfLines={d.arquivo_path ? 2 : undefined}>
          {d.descricao}
        </AppText>
      ) : null}
    </Card>
  );
}
