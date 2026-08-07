import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fixarComunicado, getComunicado, marcarComunicadoLido } from '@/lib/db';
import { formatDataHora } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useAppTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { isGestor } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function ComunicadoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, papel } = useAuth();
  const gestor = isGestor(papel);
  const { palette } = useAppTheme();
  const toast = useToast();
  const { data: c, loading, error } = useFetch(() => getComunicado(id), [id]);

  // Espelha o `fixado` do servidor para o switch responder na hora; se o update
  // falhar, o valor volta ao anterior.
  const [fixado, setFixado] = useState(false);
  const [salvandoFixado, setSalvandoFixado] = useState(false);

  useEffect(() => {
    if (c) setFixado(!!c.fixado);
  }, [c]);

  useEffect(() => {
    if (c && user) marcarComunicadoLido(c.id, user.id).catch(() => undefined);
  }, [c, user]);

  async function alternarFixado(novo: boolean) {
    if (!c) return;
    setFixado(novo);
    setSalvandoFixado(true);
    try {
      await fixarComunicado(c.id, novo);
      toast.sucesso(novo ? 'Comunicado fixado no topo ✓' : 'Comunicado desafixado ✓');
      hapticSuccess();
    } catch (e: any) {
      setFixado(!novo);
      toast.erro(e?.message ?? 'Não foi possível alterar.');
      hapticError();
    } finally {
      setSalvandoFixado(false);
    }
  }

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
        {fixado ? <Badge label="Fixado" tone="primary" /> : null}
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

      {gestor ? (
        <Card style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Fixar no topo</AppText>
            <AppText color="muted" variant="caption">
              {fixado ? 'Desligue para tirar o aviso do destaque.' : 'Mantém o aviso em destaque na lista.'}
            </AppText>
          </View>
          <Switch
            value={fixado}
            onValueChange={alternarFixado}
            disabled={salvandoFixado}
            trackColor={{ true: palette.primary, false: palette.borderStrong }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
