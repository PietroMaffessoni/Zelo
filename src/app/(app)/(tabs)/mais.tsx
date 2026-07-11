import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Card, Divider, ListItem, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { papelLabel } from '@/lib/labels';
import { isGestor as ehGestor } from '@/lib/types';

export default function Mais() {
  const router = useRouter();
  const { profile, papel, membershipAtual, memberships, signOut } = useAuth();
  const gestor = ehGestor(papel);

  return (
    <Screen>
      <AppHeader title="Mais" />

      {/* Perfil */}
      <Card onPress={() => router.push('/(app)/perfil')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={52} />
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" numberOfLines={1}>
              {profile?.nome_completo || 'Meu perfil'}
            </AppText>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <Badge label={papel ? papelLabel[papel] : 'Morador'} tone={gestor ? 'primary' : 'neutral'} />
            </View>
          </View>
        </View>
      </Card>

      {/* Serviços */}
      <AppText variant="label" color="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
        SERVIÇOS
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        <ListItem icon="megaphone-outline" iconTone="primary" title="Comunicados" subtitle="Avisos do condomínio" onPress={() => router.push('/(app)/comunicados')} />
        <Divider />
        <ListItem icon="documents-outline" iconTone="info" title="Central do morador" subtitle="Solicitações à administração" onPress={() => router.push('/(app)/central')} />
        <Divider />
        <ListItem icon="cube-outline" iconTone="warning" title="Achados e perdidos" subtitle="Objetos encontrados no condomínio" onPress={() => router.push('/(app)/achados')} />
      </Card>

      {/* Administração */}
      {gestor ? (
        <>
          <AppText variant="label" color="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
            ADMINISTRAÇÃO
          </AppText>
          <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
            <ListItem icon="add-circle-outline" iconTone="primary" title="Publicar comunicado" onPress={() => router.push('/(app)/comunicados/novo')} />
            <Divider />
            <ListItem
              icon="key-outline"
              iconTone="success"
              title="Código de convite"
              subtitle={membershipAtual?.condominio?.codigo_convite ?? '—'}
              chevron={false}
            />
          </Card>
        </>
      ) : null}

      {/* Conta */}
      <AppText variant="label" color="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
        CONTA
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        <ListItem icon="person-outline" iconTone="neutral" title="Meu perfil" onPress={() => router.push('/(app)/perfil')} />
        {memberships.length > 1 ? (
          <>
            <Divider />
            <ListItem icon="swap-horizontal-outline" iconTone="info" title="Trocar de condomínio" onPress={() => router.push('/(app)/perfil')} />
          </>
        ) : null}
        <Divider />
        <ListItem icon="log-out-outline" iconTone="danger" title="Sair" chevron={false} onPress={signOut} />
      </Card>

      <AppText color="subtle" center variant="caption" style={{ marginTop: spacing.xxl }}>
        CondoOS · versão 1.0
      </AppText>
    </Screen>
  );
}
