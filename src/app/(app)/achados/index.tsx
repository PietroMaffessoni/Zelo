import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { alterarStatusAchado, listarAchados } from '@/lib/db';
import { formatData } from '@/lib/format';
import * as L from '@/lib/labels';
import { isGestor, type AchadoPerdido } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function AchadosLista() {
  const router = useRouter();
  const { condominioId, papel, user } = useAuth();
  const gestor = isGestor(papel);
  const [processando, setProcessando] = useState<string | null>(null);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarAchados(condominioId) : []),
    [condominioId],
  );

  const itens = data ?? [];

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
          <View style={{ gap: spacing.md }}>
            {itens.map((a) => {
              const st = L.achadoStatus[a.status];
              const podeEditar = gestor || a.registrado_por === user?.id;
              return (
                <Card key={a.id}>
                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    {a.foto_url ? (
                      <Image source={{ uri: a.foto_url }} style={{ width: 72, height: 72, borderRadius: radius.md }} contentFit="cover" />
                    ) : (
                      <View
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: radius.md,
                          backgroundColor: palette.surfaceAlt,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="cube-outline" size={28} color={palette.textSubtle} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
                          {a.titulo}
                        </AppText>
                        <Badge label={st.label} tone={st.tone} />
                      </View>
                      {a.local_encontrado ? (
                        <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
                          <Ionicons name="location-outline" size={12} /> {a.local_encontrado}
                        </AppText>
                      ) : null}
                      {a.data_encontrado ? (
                        <AppText color="subtle" variant="caption">
                          {formatData(a.data_encontrado)}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                  {a.descricao ? (
                    <AppText color="muted" style={{ marginTop: spacing.sm }} numberOfLines={2}>
                      {a.descricao}
                    </AppText>
                  ) : null}
                  {podeEditar && a.status === 'guardado' ? (
                    <View style={{ marginTop: spacing.md }}>
                      <Button
                        title="Marcar como devolvido"
                        variant="secondary"
                        size="sm"
                        icon="checkmark-circle-outline"
                        onPress={() => marcarDevolvido(a)}
                        loading={processando === a.id}
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      <Fab icon="add" label="Registrar" onPress={() => router.push('/(app)/achados/novo')} />
    </View>
  );
}
