import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, CarregarMais, EmptyState, ErrorState, Fab, Panel, Row, Screen, SkeletonList } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarComunicados } from '@/lib/db';
import { tempoRelativo } from '@/lib/format';
import { useAppTheme } from '@/lib/theme';
import { isGestor } from '@/lib/types';
import { useListaPaginada } from '@/lib/useListaPaginada';

export default function ComunicadosLista() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, user, papel } = useAuth();
  const gestor = isGestor(papel);

  const {
    itens: comunicados,
    loading,
    refreshing,
    error,
    carregandoMais,
    temMais,
    carregarMais,
    refetch,
  } = useListaPaginada(
    (pagina) => (condominioId && user ? listarComunicados(condominioId, user.id, pagina) : Promise.resolve([])),
    [condominioId, user?.id],
    // Guardado em disco: é o que o morador abre ao receber o push, muitas vezes
    // no elevador ou na garagem. Conteúdo publicado a todo o condomínio, sem
    // dado pessoal — ver a regra em `lib/cache.ts`.
    { cache: `comunicados:${condominioId}` },
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
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
          <Panel>
            {comunicados.map((c) => (
              <Row key={c.id} onPress={() => router.push(`/(app)/comunicados/${c.id}`)} accessibilityLabel={c.titulo}>
                {/* Selos e data acima do título: dizem "isto mudou" antes da leitura. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2, marginBottom: 4 }}>
                  {c.fixado ? <Ionicons name="pin" size={12} color={palette.textSubtle} /> : null}
                  {c.prioridade === 'alta' ? <Badge label="Urgente" tone="danger" /> : null}
                  {!c.lido ? <Badge label="Novo" tone="primary" /> : null}
                  <AppText color="subtle" variant="caption" style={{ marginLeft: 'auto' }}>
                    {tempoRelativo(c.created_at)}
                  </AppText>
                </View>
                <AppText variant="subtitle" numberOfLines={1}>
                  {c.titulo}
                </AppText>
                <AppText color="muted" variant="caption" numberOfLines={2} style={{ marginTop: 3 }}>
                  {c.corpo}
                </AppText>
              </Row>
            ))}
          </Panel>
        )}
        {/* Rodapé de paginação: some sozinho quando não há mais o que buscar. */}
        <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
      </Screen>
      {gestor ? <Fab icon="add" label="Publicar" onPress={() => router.push('/(app)/comunicados/novo')} /> : null}
    </View>
  );
}
