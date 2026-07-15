import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarDocumentos, removerDocumento } from '@/lib/db';
import { formatData } from '@/lib/format';
import { urlAssinada } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme';
import { isGestor } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

function formatTamanho(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RegimentoInterno() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarDocumentos(condominioId, 'regimento_interno') : []),
    [condominioId],
  );

  const documentos = data ?? [];

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

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Regimento interno" back subtitle="Regimento interno do condomínio" />

        <View style={{ marginTop: spacing.lg }}>
          {loading ? (
            <Loading />
          ) : documentos.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="Nenhum regimento publicado"
              description={gestor ? 'Toque em "Enviar" para publicar o regimento interno.' : 'O síndico ainda não publicou o regimento interno.'}
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {documentos.map((d) => (
                <Card key={d.id} onPress={() => abrir(d.id, d.arquivo_path)}>
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
                      <Ionicons name="book-outline" size={20} color={palette.textMuted} />
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
                    {abrindoId === d.id ? (
                      <Ionicons name="hourglass-outline" size={18} color={palette.textSubtle} />
                    ) : gestor ? (
                      <Pressable onPress={() => remover(d.id)} hitSlop={8} disabled={removendoId === d.id}>
                        <Ionicons name="trash-outline" size={18} color={palette.textSubtle} />
                      </Pressable>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={palette.textSubtle} />
                    )}
                  </View>
                  {d.descricao ? (
                    <AppText color="muted" style={{ marginTop: spacing.sm }} numberOfLines={2}>
                      {d.descricao}
                    </AppText>
                  ) : null}
                </Card>
              ))}
            </View>
          )}
        </View>
      </Screen>
      {gestor ? (
        <Fab icon="add" label="Enviar" onPress={() => router.push('/(app)/documentos/novo?categoria=regimento_interno')} />
      ) : null}
    </View>
  );
}
