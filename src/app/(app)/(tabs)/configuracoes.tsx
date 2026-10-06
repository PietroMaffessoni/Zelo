import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Switch, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Button, Card, ListItem, Panel, Screen, SectionHeader } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { useCopiar } from '@/lib/copiar';
import { gerarCodigoConvite, gerarCodigoPortaria, gerarCodigoZelador } from '@/lib/db';
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
  const [gerando, setGerando] = useState<QualCodigo | null>(null);
  // Código cujo painel de opções está aberto.
  const [aberto, setAberto] = useState<QualCodigo | null>(null);
  const condominio = membershipAtual?.condominio;

  const codigos: Record<QualCodigo, InfoCodigo> = {
    convite: { nome: 'convite', codigo: condominio?.codigo_convite },
    portaria: { nome: 'portaria', codigo: condominio?.codigo_portaria, expiraEm: condominio?.codigo_portaria_expira_em },
    zelador: { nome: 'zeladoria', codigo: condominio?.codigo_zelador, expiraEm: condominio?.codigo_zelador_expira_em },
  };

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

  async function gerar(qual: QualCodigo) {
    if (!condominioId) return;
    setAberto(null);
    // Gerar de novo SOBRESCREVE o código atual: quem ainda não usou o antigo
    // fica sem acesso. Por isso confirma antes. A espera deixa o painel sair da
    // tela — no iOS um Modal não abre enquanto outro ainda está aberto.
    if (codigos[qual].codigo) {
      await new Promise((r) => setTimeout(r, 350));
      const ok = await confirmar({
        titulo: `Gerar novo código de ${codigos[qual].nome}?`,
        mensagem:
          qual === 'convite'
            ? 'O código atual para de funcionar imediatamente. Quem já é morador não perde nada, mas quem ainda vai entrar precisará do código novo.'
            : 'O código atual para de funcionar imediatamente. Quem já entrou mantém o acesso, mas quem ainda não usou vai precisar do código novo.',
        confirmar: 'Gerar novo',
        cancelar: 'Cancelar',
        destrutivo: true,
      });
      if (!ok) return;
    }
    const gerarFn = qual === 'convite' ? gerarCodigoConvite : qual === 'portaria' ? gerarCodigoPortaria : gerarCodigoZelador;
    setGerando(qual);
    await acao(
      async () => {
        await gerarFn(condominioId);
        await recarregar();
      },
      { sucesso: `Novo código de ${codigos[qual].nome} gerado.`, sempre: () => setGerando(null) },
    );
  }

  function copiarAberto() {
    const atual = aberto ? codigos[aberto] : null;
    setAberto(null);
    if (atual?.codigo) copiar(atual.codigo, `Código de ${atual.nome}`);
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
          {/* Tocar abre as opções do código (gerar outro, copiar) em vez de
              agir direto: um toque perdido não pode invalidar um código já
              distribuído, nem copiar algo sem a pessoa perceber. */}
          <Panel style={{ paddingHorizontal: spacing.lg }}>
            <ListItem
              icon="key-outline"
              iconTone="neutral"
              title="Convite (moradores)"
              subtitle={legendaCodigo(codigos.convite, gerando === 'convite')}
              onPress={() => setAberto('convite')}
            />
            <ListItem
              icon="shield-outline"
              iconTone="neutral"
              title="Portaria"
              subtitle={legendaCodigo(codigos.portaria, gerando === 'portaria')}
              onPress={() => setAberto('portaria')}
            />
            <ListItem
              icon="construct-outline"
              iconTone="neutral"
              title="Zeladoria"
              subtitle={legendaCodigo(codigos.zelador, gerando === 'zelador')}
              onPress={() => setAberto('zelador')}
            />
          </Panel>
          <OpcoesCodigo
            info={aberto ? codigos[aberto] : null}
            onFechar={() => setAberto(null)}
            onGerar={() => {
              if (aberto) gerar(aberto);
            }}
            onCopiar={copiarAberto}
          />
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

type QualCodigo = 'convite' | 'portaria' | 'zelador';
type InfoCodigo = { nome: string; codigo?: string | null; expiraEm?: string | null };

/**
 * Legenda de um código: o código e, quando houver prazo, até quando vale.
 * Expirado precisa dizer isso na própria linha — senão o síndico só descobre
 * quando o funcionário não consegue entrar.
 */
function legendaCodigo(info: InfoCodigo, gerando: boolean) {
  if (gerando) return 'Gerando...';
  if (!info.codigo) return 'Nenhum código — toque para gerar';
  const validade = validadeCodigo(info.expiraEm);
  return validade ? `${info.codigo} · ${validade.texto}` : info.codigo;
}

/** Painel inferior com as opções de um código de acesso. */
function OpcoesCodigo({
  info,
  onFechar,
  onGerar,
  onCopiar,
}: {
  info: InfoCodigo | null;
  onFechar: () => void;
  onGerar: () => void;
  onCopiar: () => void;
}) {
  const { palette } = useAppTheme();
  const validade = info?.codigo ? validadeCodigo(info.expiraEm) : null;
  return (
    <Modal visible={!!info} transparent animationType="slide" onRequestClose={onFechar} statusBarTranslucent>
      <Pressable
        style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: 'flex-end' }}
        onPress={onFechar}
        accessibilityRole="button"
        accessibilityLabel="Fechar opções"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
          accessibilityViewIsModal
          style={{
            backgroundColor: palette.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.xl,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          }}
        >
          <AppText variant="overline" color="subtle">
            Código de {info?.nome}
          </AppText>
          {info?.codigo ? (
            <View>
              <AppText variant="title" style={{ letterSpacing: 2 }}>
                {info.codigo}
              </AppText>
              {validade ? (
                <AppText variant="caption" color={validade.expirado ? 'danger' : 'muted'} style={{ marginTop: 2 }}>
                  {validade.texto}
                </AppText>
              ) : null}
            </View>
          ) : (
            <AppText color="muted">Ainda não há código. Gere um para distribuir.</AppText>
          )}

          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button title={info?.codigo ? 'Gerar outro código' : 'Gerar código'} icon="refresh-outline" onPress={onGerar} />
            {info?.codigo ? <Button title="Copiar código" variant="secondary" icon="copy-outline" onPress={onCopiar} /> : null}
            <Button title="Fechar" variant="ghost" onPress={onFechar} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
