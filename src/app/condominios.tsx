import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Brand } from '@/components/Brand';
import { AppText, Badge, Button, Loading, MetaLine, Panel, Row, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { papelLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type Membership } from '@/lib/types';

function unidadeDe(m: Membership) {
  if (!m.unidade) return null;
  return `${m.unidade.bloco ? `Bloco ${m.unidade.bloco} · ` : ''}Unidade ${m.unidade.numero}`;
}

function localDe(m: Membership) {
  const { cidade, uf } = m.condominio ?? {};
  return [cidade, uf].filter(Boolean).join('/') || null;
}

/**
 * Escolha do condomínio logo depois do login.
 *
 * Quem administra um prédio e mora em outro entrava direto no último usado e
 * precisava saber que a troca mora no Perfil — para quem não sabia, o outro
 * condomínio parecia ter sumido. Aqui aparecem todos, com o papel em cada um,
 * inclusive os que ainda aguardam aprovação do síndico.
 */
export default function Condominios() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const {
    ready,
    session,
    memberships,
    membershipsPendentes,
    condominioId,
    selecionarCondominio,
    concluirEscolhaCondominio,
    signOut,
  } = useAuth();

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (memberships.length === 0) return <Redirect href="/onboarding" />;

  async function entrar(id: string) {
    await selecionarCondominio(id);
    concluirEscolhaCondominio();
    router.replace('/(app)/(tabs)/inicio');
  }

  return (
    <Screen maxWidth={480}>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Brand />
      </View>

      <View style={{ gap: spacing.lg }}>
        <View>
          <AppText variant="heading">Seus condomínios</AppText>
          <AppText variant="caption" color="muted" style={{ marginTop: 4 }}>
            Escolha onde entrar. Dá para trocar depois, em Perfil.
          </AppText>
        </View>

        <Panel>
          {memberships.map((m) => {
            const ultimo = m.condominio_id === condominioId;
            return (
              <Row
                key={m.id}
                onPress={() => entrar(m.condominio_id)}
                accessibilityLabel={`${m.condominio?.nome ?? 'Condomínio'}, ${papelLabel[m.papel]}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={isGestor(m.papel) ? palette.primary : palette.textSubtle}
                    style={{ width: 22, textAlign: 'center' }}
                  />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText variant="subtitle" numberOfLines={1}>
                      {m.condominio?.nome ?? 'Condomínio'}
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
                      <Badge label={papelLabel[m.papel]} tone={isGestor(m.papel) ? 'primary' : 'neutral'} />
                      {ultimo ? <Badge label="Último acesso" tone="neutral" /> : null}
                    </View>
                    <MetaLine itens={[unidadeDe(m), localDe(m)]} />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textSubtle} />
                </View>
              </Row>
            );
          })}

          {/* Sem `onPress`: ainda não há o que abrir — o síndico precisa aprovar. */}
          {membershipsPendentes.map((m) => (
            <Row key={m.id} accessibilityLabel={`${m.condominio?.nome ?? 'Condomínio'}, aguardando aprovação`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: 0.7 }}>
                <Ionicons name="time-outline" size={20} color={palette.textSubtle} style={{ width: 22, textAlign: 'center' }} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <AppText variant="subtitle" numberOfLines={1}>
                    {m.condominio?.nome ?? 'Condomínio'}
                  </AppText>
                  <View style={{ flexDirection: 'row' }}>
                    <Badge label="Aguardando aprovação" tone="warning" />
                  </View>
                  <MetaLine itens={[unidadeDe(m), localDe(m)]} />
                </View>
              </View>
            </Row>
          ))}
        </Panel>

        <Button title="Sair da conta" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
