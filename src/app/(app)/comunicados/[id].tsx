import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, EmptyState, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { getComunicado, marcarComunicadoLido } from '@/lib/db';
import { formatDataHora } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';

export default function ComunicadoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: c, loading, error } = useFetch(() => getComunicado(id), [id]);

  useEffect(() => {
    if (c && user) marcarComunicadoLido(c.id, user.id).catch(() => undefined);
  }, [c, user]);

  if (loading) return <Screen><AppHeader title="Comunicado" back /><Loading /></Screen>;
  if (error || !c)
    return (
      <Screen>
        <AppHeader title="Comunicado" back />
        <EmptyState icon="alert-circle-outline" title="Não encontrado" description={error ?? undefined} />
      </Screen>
    );

  return (
    <Screen>
      <AppHeader title="Comunicado" back />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        {c.fixado ? <Badge label="Fixado" tone="primary" /> : null}
        {c.prioridade === 'alta' ? <Badge label="Urgente" tone="danger" /> : null}
        {c.categoria ? <Badge label={c.categoria} tone="neutral" /> : null}
      </View>

      <AppText variant="title">{c.titulo}</AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg }}>
        <Avatar nome={c.autor?.nome_completo} url={c.autor?.avatar_url} size={36} />
        <View>
          <AppText variant="label">{c.autor?.nome_completo || 'Administração'}</AppText>
          <AppText color="subtle" variant="caption">
            {formatDataHora(c.created_at)}
          </AppText>
        </View>
      </View>

      <AppText style={{ lineHeight: 24 }}>{c.corpo}</AppText>
    </Screen>
  );
}
