import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Button, EmptyState, Fab, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';
import { alterarStatusAchado, listarAchados } from '@/lib/db';
import { formatData } from '@/lib/format';
import * as L from '@/lib/labels';
import { urlsAssinadas } from '@/lib/storage';
import { isGestor, type AchadoPerdido } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function AchadosLista() {
  const { palette } = useAppTheme();
  const router = useRouter();
  const { condominioId, papel, user } = useAuth();
  const gestor = isGestor(papel);
  const [processando, setProcessando] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(async () => {
    if (!condominioId) return { itens: [] as AchadoPerdido[], fotoUrls: {} as Record<string, string> };
    const itens = await listarAchados(condominioId);
    const paths = itens.map((a) => a.foto_url).filter((p): p is string => !!p);
    const fotoUrls = await urlsAssinadas('achados', paths);
    return { itens, fotoUrls };
  }, [condominioId]);

  const itens = data?.itens ?? [];
  const fotoUrls = data?.fotoUrls ?? {};

  async function marcarDevolvido(a: AchadoPerdido) {
    setProcessando(a.id);
    await alterarStatusAchado(a.id, 'devolvido');
    setProcessando(null);
    refetch();
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Achados e perdidos" back subtitle="Objetos encontrados no condomínio" />

        {loading ? (
          <Loading />
        ) : itens.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="Nada por aqui"
            description="Encontrou algo? Registre para que o dono possa recuperar."
            actionLabel="Registrar objeto"
            onAction={() => router.push('/(app)/achados/novo')}
          />
        ) : (
          <Panel>
            {itens.map((a) => {
              const st = L.achadoStatus[a.status];
              const podeEditar = gestor || a.registrado_por === user?.id;
              return (
                <Row key={a.id}>
                  {/*
                    Lista com miniatura: a foto identifica o objeto mais rápido que
                    qualquer texto, então ela abre a linha e todas ficam na mesma
                    coluna. A miniatura caiu de 72 para 56px — o suficiente para
                    reconhecer, sem que a lista vire um mural de imagens.
                  */}
                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    {a.foto_url && fotoUrls[a.foto_url] ? (
                      <Image
                        source={{ uri: fotoUrls[a.foto_url] }}
                        style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: palette.surfaceAlt }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: radius.md,
                          backgroundColor: palette.surfaceAlt,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="cube-outline" size={22} color={palette.textSubtle} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                        <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
                          {a.titulo}
                        </AppText>
                        <Badge label={st.label} tone={st.tone} />
                      </View>
                      <MetaLine
                        style={{ marginTop: 2 }}
                        itens={[a.local_encontrado, a.data_encontrado ? formatData(a.data_encontrado) : null]}
                      />
                      {a.descricao ? (
                        <AppText color="muted" variant="caption" style={{ marginTop: 4 }} numberOfLines={2}>
                          {a.descricao}
                        </AppText>
                      ) : null}
                      {podeEditar && a.status === 'guardado' ? (
                        <View style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
                          <Button
                            title="Marcar como devolvido"
                            variant="secondary"
                            size="sm"
                            fullWidth={false}
                            icon="checkmark-circle-outline"
                            onPress={() => marcarDevolvido(a)}
                            loading={processando === a.id}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Row>
              );
            })}
          </Panel>
        )}
      </Screen>
      <Fab icon="add" label="Registrar" onPress={() => router.push('/(app)/achados/novo')} />
    </View>
  );
}
