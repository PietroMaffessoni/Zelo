import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Card, ListItem, Panel, Screen, SectionHeader } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { useCopiar } from '@/lib/copiar';
import { gerarCodigoPortaria, gerarCodigoZelador } from '@/lib/db';
import { validadeCodigo } from '@/lib/format';
import { papelLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor as ehGestor } from '@/lib/types';

/**
 * Aba "Configurações".
 *
 * Herdou da antiga aba "Mais" tudo o que é da CONTA e do aparelho — perfil,
 * unidade, aparência, códigos de acesso, termos e saída. Os serviços do
 * condomínio (comunicados, financeiro, documentos...) foram para o menu lateral,
 * onde estão todos os destinos do app; repeti-los aqui faria desta tela uma
 * segunda cópia do menu.
 */
export default function Configuracoes() {
  const router = useRouter();
  const confirmar = useConfirm();
  const { palette, escuro, alternar } = useAppTheme();
  const { profile, papel, membershipAtual, memberships, condominioId, recarregar, signOut } = useAuth();
  const acao = useAcao();
  const copiar = useCopiar();
  const gestor = ehGestor(papel);
  const [gerandoPortaria, setGerandoPortaria] = useState(false);
  const [gerandoZelador, setGerandoZelador] = useState(false);
  const condominio = membershipAtual?.condominio;

  async function sair() {
    const ok = await confirmar({
      titulo: 'Sair da conta?',
      mensagem: 'Você precisará entrar novamente com e-mail e senha.',
      confirmar: 'Sair',
      cancelar: 'Cancelar',
      destrutivo: true,
    });
    if (ok) await signOut();
  }

  async function gerar(qual: 'portaria' | 'zelador') {
    if (!condominioId) return;
    // Gerar de novo SOBRESCREVE o código atual: quem ainda não usou o antigo
    // fica sem acesso. Por isso confirma antes, como na barra lateral.
    const atual = qual === 'portaria' ? condominio?.codigo_portaria : condominio?.codigo_zelador;
    if (atual) {
      const ok = await confirmar({
        titulo: `Gerar novo código de ${qual === 'portaria' ? 'portaria' : 'zeladoria'}?`,
        mensagem:
          'O código atual para de funcionar imediatamente. Quem já entrou mantém o acesso, mas quem ainda não usou vai precisar do código novo.',
        confirmar: 'Gerar novo',
        cancelar: 'Cancelar',
        destrutivo: true,
      });
      if (!ok) return;
    }
    const marcar = qual === 'portaria' ? setGerandoPortaria : setGerandoZelador;
    marcar(true);
    await acao(
      async () => {
        await (qual === 'portaria' ? gerarCodigoPortaria(condominioId) : gerarCodigoZelador(condominioId));
        await recarregar();
      },
      { sempre: () => marcar(false) },
    );
  }

  return (
    <Screen>
      <AppHeader title="Configurações" />

      <Card onPress={() => router.push('/(app)/perfil')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={42} />
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" numberOfLines={1}>
              {profile?.nome_completo || 'Meu perfil'}
            </AppText>
            <View style={{ flexDirection: 'row', marginTop: 5 }}>
              <Badge label={papel ? papelLabel[papel] : 'Morador'} tone={gestor ? 'primary' : 'neutral'} />
            </View>
          </View>
        </View>
      </Card>

      <SectionHeader title="Conta" style={{ marginTop: spacing.xl }} />
      <Panel style={{ paddingHorizontal: spacing.lg }}>
        <ListItem
          icon="person-outline"
          iconTone="neutral"
          title="Meu perfil"
          subtitle="Nome, foto e telefone"
          onPress={() => router.push('/(app)/perfil')}
        />
        <ListItem
          icon="shield-checkmark-outline"
          iconTone="neutral"
          title="Segurança"
          subtitle="Senha e verificação em duas etapas"
          onPress={() => router.push('/(app)/perfil')}
        />
        <ListItem
          icon="notifications-outline"
          iconTone="neutral"
          title="Preferências de notificação"
          subtitle="Escolha o que deve avisar você"
          onPress={() => router.push('/(app)/perfil')}
        />
        {membershipAtual?.unidade_id ? (
          <ListItem
            icon="id-card-outline"
            iconTone="neutral"
            title="Cadastros da unidade"
            subtitle="Moradores, visitantes e veículos"
            onPress={() => router.push('/(app)/cadastros')}
          />
        ) : null}
        {memberships.length > 1 ? (
          <ListItem
            icon="swap-horizontal-outline"
            iconTone="neutral"
            title="Trocar de condomínio"
            subtitle={condominio?.nome}
            onPress={() => router.push('/(app)/perfil')}
          />
        ) : null}
      </Panel>

      <SectionHeader title="Aparência" style={{ marginTop: spacing.xl }} />
      <Panel style={{ paddingHorizontal: spacing.lg }}>
        <ListItem
          icon={escuro ? 'moon-outline' : 'sunny-outline'}
          iconTone="neutral"
          title="Modo escuro"
          chevron={false}
          onPress={alternar}
          right={
            <Switch value={escuro} onValueChange={alternar} trackColor={{ true: palette.primary, false: palette.borderStrong }} />
          }
        />
      </Panel>

      {gestor ? (
        <>
          <SectionHeader title="Códigos de acesso" style={{ marginTop: spacing.xl }} />
          <Panel style={{ paddingHorizontal: spacing.lg }}>
            <ListItem
              icon="key-outline"
              iconTone="neutral"
              title="Convite (moradores)"
              subtitle={condominio?.codigo_convite ? `${condominio.codigo_convite} · toque para copiar` : '—'}
              chevron={false}
              onPress={condominio?.codigo_convite ? () => copiar(condominio.codigo_convite!, 'Código de convite') : undefined}
              right={condominio?.codigo_convite ? <Ionicons name="copy-outline" size={16} color={palette.textSubtle} /> : undefined}
            />
            <ListItem
              icon="shield-outline"
              iconTone="neutral"
              title="Portaria"
              subtitle={legendaCodigo(condominio?.codigo_portaria, condominio?.codigo_portaria_expira_em, gerandoPortaria)}
              onPress={() => gerar('portaria')}
            />
            <ListItem
              icon="construct-outline"
              iconTone="neutral"
              title="Zeladoria"
              subtitle={legendaCodigo(condominio?.codigo_zelador, condominio?.codigo_zelador_expira_em, gerandoZelador)}
              onPress={() => gerar('zelador')}
            />
          </Panel>
        </>
      ) : null}

      {/* Jurídico: Apple e Google exigem a política de privacidade acessível
          DENTRO do app, e a LGPD (art. 9º) dá ao titular o direito de consultar
          o que aceitou a qualquer momento. */}
      <SectionHeader title="Sobre" style={{ marginTop: spacing.xl }} />
      <Panel style={{ paddingHorizontal: spacing.lg }}>
        <ListItem icon="document-text-outline" iconTone="neutral" title="Termos de Uso" onPress={() => router.push('/termos')} />
        <ListItem
          icon="lock-closed-outline"
          iconTone="neutral"
          title="Política de Privacidade"
          onPress={() => router.push('/privacidade')}
        />
      </Panel>

      <Panel style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        <ListItem icon="log-out-outline" iconTone="danger" title="Sair da conta" chevron={false} onPress={sair} />
      </Panel>

      <AppText color="subtle" center variant="caption" style={{ marginTop: spacing.xxl }}>
        Zelo · versão {Constants.expoConfig?.version ?? '—'}
      </AppText>
    </Screen>
  );
}

/**
 * Legenda de um código de equipe: o código e, quando houver prazo, até quando
 * vale. Expirado precisa dizer isso na própria linha — senão o síndico só
 * descobre quando o funcionário não consegue entrar.
 */
function legendaCodigo(codigo: string | null | undefined, expiraEm: string | null | undefined, gerando: boolean) {
  if (gerando) return 'Gerando...';
  if (!codigo) return 'Toque para gerar';
  const validade = validadeCodigo(expiraEm);
  return validade ? `${codigo} · ${validade.texto}` : `${codigo} · toque para gerar outro`;
}
