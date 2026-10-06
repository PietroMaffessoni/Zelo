import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ZeloWordmark } from '@/components/Brand';
import { itemAtivo, montarMenu } from '@/components/navegacao/itensMenu';
import { Avatar } from '@/components/ui/Avatar';
import { focusRing } from '@/components/ui/controls';
import { AppText } from '@/components/ui/Text';
import { radius, SIDEBAR_LARGURA, SIDEBAR_LARGURA_TABLET, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { useCopiar } from '@/lib/copiar';
import { gerarCodigoConvite, gerarCodigoPortaria, gerarCodigoZelador } from '@/lib/db';
import { validadeCodigo } from '@/lib/format';
import { papelLabel } from '@/lib/labels';
import { useLayout } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { isGestor as ehGestor } from '@/lib/types';

type Item = { label: string; icon: keyof typeof Ionicons.glyphMap; href: Href; match: string };

/** Navegação lateral fixa para telas largas — desktop e tablet (inclusive iPad).
 *  Substitui a barra de abas inferior e absorve os itens do menu "Mais", que
 *  deixa de existir nessas larguras. Quem decide se ela entra é `useLayout`. */
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const confirmar = useConfirm();
  const { palette } = useAppTheme();
  const { acimaDe } = useLayout();
  // No web a barra começa no topo da janela e acabou. Num tablet ela começa
  // embaixo da barra de status e termina na barra de gestos — sem isto, a marca
  // fica atrás do relógio e o botão "Sair" atrás da faixa inferior.
  const insets = useSafeAreaInsets();
  const { profile, papel, membershipAtual, signOut } = useAuth();
  const gestor = ehGestor(papel);
  // Mesma lista do menu lateral do celular — ver `montarMenu`.
  const secoes = montarMenu(papel, membershipAtual?.unidade_id ?? null);
  const todos = secoes.flatMap((sec) => sec.itens);

  async function sair() {
    const ok = await confirmar({
      titulo: 'Sair da conta?',
      mensagem: 'Você precisará entrar novamente com e-mail e senha.',
      confirmar: 'Sair',
      destrutivo: true,
    });
    if (ok) await signOut();
  }

  return (
    <View
      style={{
        // Encolhe na faixa expandida (840–1199): 264px num tablet deitado seriam
        // quase um terço da tela. A largura cheia entra na faixa grande (1200+).
        width: acimaDe('grande') ? SIDEBAR_LARGURA : SIDEBAR_LARGURA_TABLET,
        backgroundColor: palette.surface,
        borderRightWidth: 1,
        borderRightColor: palette.border,
      }}
    >
      {/* A marca vive fora da área de rolagem e é separada por um fio: identidade
          do produto não é item de menu, e fixá-la evita que suma ao rolar. */}
      <View
        style={{
          paddingHorizontal: spacing.md + spacing.sm,
          paddingTop: spacing.lg + insets.top,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        }}
      >
        <ZeloWordmark size={22} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.sm, paddingBottom: spacing.sm + insets.bottom, gap: 1, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >

        {secoes.map((secao) => (
          <View key={secao.titulo ?? 'principal'} style={{ gap: 1 }}>
            {secao.titulo ? <SectionLabel>{secao.titulo.toUpperCase()}</SectionLabel> : null}
            {secao.itens.map((it) => (
              <NavLink
                key={it.match}
                item={it}
                ativo={itemAtivo(it, pathname, todos)}
                onPress={() => router.push(it.href)}
              />
            ))}
          </View>
        ))}

        {gestor ? <CodigosAcesso /> : null}

        <View style={{ flex: 1, minHeight: spacing.xl }} />

        {/* Rodapé da conta, apartado da navegação por um fio. */}
        <View style={{ height: 1, backgroundColor: palette.border, marginBottom: spacing.sm }} />

        <Pressable
          onPress={() => router.push('/(app)/perfil')}
          style={({ hovered, focused }: any) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: hovered ? palette.surfaceAlt : 'transparent',
            },
            focusRing(focused, palette.primary, true),
          ]}
        >
          <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={36} />
          <View style={{ flex: 1 }}>
            <AppText variant="label" numberOfLines={1}>
              {profile?.nome_completo || 'Meu perfil'}
            </AppText>
            <AppText color="subtle" variant="caption" numberOfLines={1}>
              {papel ? papelLabel[papel] : 'Morador'}
            </AppText>
          </View>
        </Pressable>
        {/* No celular estes dois moram na aba "Configurações"; aqui não existe aba "Mais",
            e sem esta entrada a política de privacidade ficaria inalcançável na
            versão de desktop — exigência das lojas e direito do titular na LGPD. */}
        <NavLink
          item={{ label: 'Termos de Uso', icon: 'document-text-outline', href: '/termos', match: 'termos' }}
          onPress={() => router.push('/termos')}
        />
        <NavLink
          item={{ label: 'Privacidade', icon: 'shield-checkmark-outline', href: '/privacidade', match: 'privacidade' }}
          onPress={() => router.push('/privacidade')}
        />
        <NavLink
          item={{ label: 'Sair', icon: 'log-out-outline', href: '/(app)/perfil', match: '__sair' }}
          danger
          onPress={sair}
        />
      </ScrollView>
    </View>
  );
}

/** Códigos de acesso do condomínio. No celular eles moram na aba "Configurações"; como no
 *  desktop essa aba não existe, a sidebar precisa expô-los — sem isso o síndico
 *  não tem por onde gerar o código da portaria nem o da zeladoria. */
function CodigosAcesso() {
  const { condominioId, membershipAtual } = useAuth();
  const condominio = membershipAtual?.condominio;

  return (
    <>
      <SectionLabel>CÓDIGOS DE ACESSO</SectionLabel>
      <CodigoLinha
        icon="key-outline"
        label="Convite (morador)"
        codigo={condominio?.codigo_convite}
        gerar={condominioId ? () => gerarCodigoConvite(condominioId) : undefined}
      />
      <CodigoLinha
        icon="shield-checkmark-outline"
        label="Portaria"
        codigo={condominio?.codigo_portaria}
        expiraEm={condominio?.codigo_portaria_expira_em}
        gerar={condominioId ? () => gerarCodigoPortaria(condominioId) : undefined}
      />
      <CodigoLinha
        icon="construct-outline"
        label="Zeladoria"
        codigo={condominio?.codigo_zelador}
        expiraEm={condominio?.codigo_zelador_expira_em}
        gerar={condominioId ? () => gerarCodigoZelador(condominioId) : undefined}
      />
    </>
  );
}

/**
 * Uma linha de código. Toque copia; gerar só acontece quando ainda não há código,
 * ou pelo botão de reciclar — que confirma antes, porque as RPCs `gerar_codigo_*`
 * sobrescrevem o código anterior e invalidam o que já foi distribuído.
 */
function CodigoLinha({
  icon,
  label,
  codigo,
  expiraEm,
  gerar,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  codigo?: string | null;
  /** Só os códigos de equipe expiram; o de convite não tem prazo. */
  expiraEm?: string | null;
  /** Troca o código. O de convite também pode ser trocado desde a migration 0015. */
  gerar?: () => Promise<string>;
}) {
  const { palette } = useAppTheme();
  const { recarregar } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
  const copiar = useCopiar();
  const [ocupado, setOcupado] = useState(false);

  async function executarGeracao() {
    if (!gerar || ocupado) return;
    setOcupado(true);
    try {
      await gerar();
      await recarregar();
      toast.sucesso(`Código de ${label.toLowerCase()} gerado.`);
    } catch (e) {
      // O finally garante que a linha nunca fica presa em "Gerando..." — é o que
      // acontece quando a RPC não existe (seção do setup.sql ainda não aplicada).
      toast.erro(e instanceof Error ? e.message : 'Não foi possível gerar o código.');
    } finally {
      setOcupado(false);
    }
  }

  async function regerar() {
    const ok = await confirmar({
      titulo: `Gerar novo código de ${label.toLowerCase()}?`,
      mensagem:
        'O código atual para de funcionar imediatamente. Quem já entrou mantém o acesso, mas quem ainda não usou vai precisar do código novo.',
      confirmar: 'Gerar novo',
      cancelar: 'Cancelar',
      destrutivo: true,
    });
    if (ok) await executarGeracao();
  }

  async function aoTocar() {
    if (ocupado) return;
    if (!codigo) return executarGeracao();
    await copiar(codigo, `Código de ${label.toLowerCase()}`);
  }

  const interativo = !!codigo || !!gerar;
  const texto = ocupado ? 'Gerando...' : (codigo ?? (gerar ? 'Gerar código' : '—'));
  const validade = codigo ? validadeCodigo(expiraEm) : null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Pressable
        onPress={aoTocar}
        disabled={!interativo}
        accessibilityRole="button"
        accessibilityLabel={codigo ? `Copiar código de ${label}` : `Gerar código de ${label}`}
        style={({ hovered, focused }: any) => [
          {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.sm,
            paddingVertical: 8,
            borderRadius: radius.md,
            backgroundColor: hovered && interativo ? palette.surfaceAlt : 'transparent',
          },
          focusRing(focused, palette.primary, true),
        ]}
      >
        <Ionicons name={icon} size={20} color={palette.textMuted} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="caption" color="subtle" numberOfLines={1}>
            {validade ? `${label} · ${validade.texto}` : label}
          </AppText>
          <AppText
            variant="label"
            numberOfLines={1}
            style={{ color: codigo && !ocupado ? palette.text : palette.textSubtle, letterSpacing: codigo ? 1 : 0 }}
          >
            {texto}
          </AppText>
        </View>
        {codigo && !ocupado ? <Ionicons name="copy-outline" size={16} color={palette.textSubtle} /> : null}
      </Pressable>

      {codigo && gerar ? (
        <Pressable
          onPress={regerar}
          disabled={ocupado}
          accessibilityRole="button"
          accessibilityLabel={`Gerar novo código de ${label}`}
          style={({ hovered, focused }: any) => [
            {
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: hovered ? palette.surfaceAlt : 'transparent',
            },
            focusRing(focused, palette.primary, true),
          ]}
        >
          <Ionicons name="refresh-outline" size={16} color={palette.textSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <AppText
      variant="overline"
      color="subtle"
      style={{ paddingHorizontal: spacing.sm + 2, marginTop: spacing.lg, marginBottom: spacing.xs + 2 }}
    >
      {children}
    </AppText>
  );
}

/**
 * Item de navegação.
 *
 * O ativo é marcado com a primária — fundo tênue e rótulo na cor da marca. É para
 * isto que a cor principal serve num software: dizer onde você está e o que está
 * selecionado. Por isso ela quase não aparece em outro lugar da sidebar; se cada
 * ícone do menu fosse colorido, o item ativo não teria como se destacar.
 *
 * "Sair" fica neutro em repouso e só assume o vermelho sob o ponteiro: uma ação
 * destrutiva precisa avisar na hora do gesto, não pintar a navegação o tempo todo.
 */
function NavLink({
  item,
  ativo = false,
  onPress,
  danger,
}: {
  item: Item;
  ativo?: boolean;
  onPress: () => void;
  danger?: boolean;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: ativo }}
      style={({ hovered, focused }: any) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md - 2,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: 8,
          borderRadius: radius.md,
          backgroundColor: ativo ? palette.primarySoft : hovered ? palette.surfaceAlt : 'transparent',
        },
        focusRing(focused, palette.primary, true),
      ]}
    >
      {({ hovered }: any) => {
        const cor = danger
          ? hovered
            ? palette.danger
            : palette.textMuted
          : ativo
            ? palette.primary
            : palette.textMuted;
        return (
          <>
            <Ionicons name={item.icon} size={18} color={cor} />
            <AppText variant="label" style={{ color: cor, flex: 1 }} numberOfLines={1}>
              {item.label}
            </AppText>
          </>
        );
      }}
    </Pressable>
  );
}
