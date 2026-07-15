import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, ErrorState, Fab, Screen, SkeletonList } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarComunicados } from '@/lib/db';
import { tempoRelativo } from '@/lib/format';
import { useAppTheme } from '@/lib/theme';
import { isGestor } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function ComunicadosLista() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, user, papel } = useAuth();
  const gestor = isGestor(papel);

  const { data, loading, refreshing, error, refetch } = useFetch(
    async () => (condominioId && user ? listarComunicados(condominioId, user.id) : []),
    [condominioId],
  );

  const comunicados = data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch} maxWidth={920}>
        <AppHeader title="Comunicados" back subtitle="Avisos oficiais do condomínio" onRefresh={refetch} />

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : comunicados.length === 0 ? (
          <EmptyState
            icon="megaphone-outline"
            title="Nenhum comunicado"
            description={gestor ? 'Publique o primeiro aviso para os moradores.' : 'Os avisos do condomínio aparecerão aqui.'}
            actionLabel={gestor ? 'Publicar comunicado' : undefined}
            onAction={gestor ? () => router.push('/(app)/comunicados/novo') : undefined}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {comunicados.map((c) => (
              <Card key={c.id} onPress={() => router.push(`/(app)/comunicados/${c.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 }}>
                  {c.fixado ? <Ionicons name="pin" size={15} color={palette.primary} /> : null}
                  {c.prioridade === 'alta' ? <Badge label="Urgente" tone="danger" /> : null}
                  {!c.lido ? <Badge label="Novo" tone="primary" /> : null}
                  <AppText color="subtle" variant="caption" style={{ marginLeft: 'auto' }}>
                    {tempoRelativo(c.created_at)}
                  </AppText>
                </View>
                <AppText variant="subtitle" numberOfLines={1}>
                  {c.titulo}
                </AppText>
                <AppText color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                  {c.corpo}
                </AppText>
              </Card>
            ))}
          </View>
        )}
      </Screen>
      {gestor ? <Fab icon="add" label="Publicar" onPress={() => router.push('/(app)/comunicados/novo')} /> : null}
    </View>
  );
}
