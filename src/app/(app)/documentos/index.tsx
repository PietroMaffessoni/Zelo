import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, CarregarMais, EmptyState, Fab, IconButton, Loading, MetaLine, Panel, Row, Screen, SectionHeader } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarDocumentos, removerDocumento } from '@/lib/db';
import { formatData } from '@/lib/format';
import { categoriaDocumento } from '@/lib/labels';
import { urlAssinada } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type Documento } from '@/lib/types';
import { useListaPaginada } from '@/lib/useListaPaginada';

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

  const {
    itens: documentos,
    loading,
    refreshing,
    carregandoMais,
    temMais,
    carregarMais,
    refetch,
  } = useListaPaginada(
    (pagina) => (condominioId ? listarDocumentos(condominioId, undefined, pagina) : Promise.resolve([])),
    [condominioId],
  );
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

  function renderLinha(d: Documento, comCategoria: boolean) {
    return (
      <DocumentoLinha
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
                <View>
                  <SectionHeader title="Regimento interno" />
                  <Panel>{regimento.map((d) => renderLinha(d, false))}</Panel>
                </View>
              ) : null}

              {demais.length > 0 ? (
                <View>
                  {regimento.length > 0 ? <SectionHeader title="Outros documentos" /> : null}
                  <Panel>{demais.map((d) => renderLinha(d, true))}</Panel>
                </View>
              ) : null}
            </View>
          )}
          {/* Rodapé de paginação: some sozinho quando não há mais o que buscar. */}
          <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
        </View>
      </Screen>
      {gestor ? <Fab icon="add" label="Publicar" onPress={() => router.push('/(app)/documentos/novo')} /> : null}
    </View>
  );
}

/**
 * Um documento na lista.
 *
 * Documento é registro de arquivo: título, quando entrou, quanto pesa e o que
 * fazer com ele. Vira linha — o ícone indica se há anexo ou se o texto É o
 * documento, e o seletor de categoria vira metadado em vez de um selo colorido
 * flutuando abaixo do título, que empurrava cada registro para uma altura
 * diferente e quebrava o alinhamento da coluna.
 */
function DocumentoLinha({
  documento: d,
  categoria,
  gestor,
  abrindo,
  removendo,
  onAbrir,
  onRemover,
}: {
  documento: Documento;
  /** Mostra a categoria — desnecessária na seção do regimento. */
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
    <Row onPress={d.arquivo_path ? onAbrir : undefined} accessibilityLabel={d.titulo} compact>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons
          name={(d.arquivo_path ? meta.icon ?? 'document-outline' : 'text-outline') as any}
          size={19}
          color={palette.textSubtle}
          style={{ width: 22, textAlign: 'center' }}
        />
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" numberOfLines={1}>
            {d.titulo}
          </AppText>
          <MetaLine
            style={{ marginTop: 2 }}
            itens={[categoria ? meta.label : null, formatData(d.created_at), formatTamanho(d.tamanho_bytes)]}
          />
          {d.descricao ? (
            // Sem anexo, a descrição É o documento — mostra inteira em vez de resumo.
            <AppText color="muted" variant="caption" style={{ marginTop: 5 }} numberOfLines={d.arquivo_path ? 2 : undefined}>
              {d.descricao}
            </AppText>
          ) : null}
        </View>
        {abrindo ? (
          <Ionicons name="hourglass-outline" size={17} color={palette.textSubtle} />
        ) : gestor ? (
          <IconButton
            icon="trash-outline"
            label={`Remover ${d.titulo}`}
            onPress={onRemover}
            disabled={removendo}
            size={17}
          />
        ) : d.arquivo_path ? (
          <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} />
        ) : null}
      </View>
    </Row>
  );
}
