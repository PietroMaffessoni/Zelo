import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ZeloWordmark } from '@/components/Brand';
import { Avatar } from '@/components/ui/Avatar';
import { focusRing } from '@/components/ui/controls';
import { AppText } from '@/components/ui/Text';
import { radius, SIDEBAR_LARGURA, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { gerarCodigoPortaria, gerarCodigoZelador } from '@/lib/db';
import { papelLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { isGestor as ehGestor, veManutencao } from '@/lib/types';

type Item = { label: string; icon: keyof typeof Ionicons.glyphMap; href: Href; match: string };

/** Navegação lateral fixa para telas largas (web ≥ 1024px). Substitui a tab bar
 *  inferior e absorve os itens do menu "Mais", que deixa de existir no desktop. */
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const confirmar = useConfirm();
  const { palette } = useAppTheme();
  const { profile, papel, membershipAtual, signOut } = useAuth();
  const gestor = ehGestor(papel);
  const porteiro = papel === 'porteiro';
  const zelador = papel === 'zelador';
  const morador = !gestor && !porteiro && !zelador;
  const equipe = porteiro || zelador;
  const unidadeId = membershipAtual?.unidade_id ?? null;

  const principais: Item[] = [
    { label: gestor ? 'Painel' : 'Início', icon: gestor ? 'grid-outline' : 'home-outline', href: '/(app)/(tabs)/inicio', match: 'inicio' },
    ...(morador || gestor || zelador ? [{ label: 'Chamados', icon: 'construct-outline', href: '/(app)/(tabs)/chamados', match: 'chamados' } as Item] : []),
    ...(morador ? [{ label: 'Reservas', icon: 'calendar-outline', href: '/(app)/(tabs)/reservas', match: 'reservas' } as Item] : []),
    ...(gestor || porteiro ? [{ label: 'Portaria', icon: 'people-circle-outline', href: '/(app)/(tabs)/portaria', match: 'portaria' } as Item] : []),
  ];

  const secundarios: Item[] = [
    { label: 'Comunicados', icon: 'megaphone-outline', href: '/(app)/comunicados', match: 'comunicados' },
    ...(!equipe
      ? ([
          { label: 'Central do morador', icon: 'documents-outline', href: '/(app)/central', match: 'central' },
          { label: 'Financeiro', icon: 'cash-outline', href: '/(app)/financeiro', match: 'financeiro' },
          { label: 'Assembleias', icon: 'podium-outline', href: '/(app)/assembleias', match: 'assembleias' },
          { label: 'Advertências e multas', icon: 'alert-circle-outline', href: '/(app)/infracoes', match: 'infracoes' },
        ] as Item[])
      : []),
    ...(veManutencao(papel) ? [{ label: 'Manutenção', icon: 'build-outline', href: '/(app)/manutencao', match: 'manutencao' } as Item] : []),
    { label: 'Documentos', icon: 'book-outline', href: '/(app)/documentos', match: 'documentos' },
    { label: 'Agenda', icon: 'calendar-number-outline', href: '/(app)/agenda', match: 'agenda' },
    { label: 'Achados e perdidos', icon: 'cube-outline', href: '/(app)/achados', match: 'achados' },
    ...(unidadeId
      ? ([
          { label: 'Visitantes', icon: 'people-outline', href: '/(app)/visitantes', match: 'visitantes' },
          { label: 'Veículos', icon: 'car-outline', href: '/(app)/veiculos', match: 'veiculos' },
        ] as Item[])
      : []),
  ];

  const admin: Item[] = gestor
    ? [
        { label: 'Moradores e unidades', icon: 'people-outline', href: '/(app)/unidades', match: 'unidades' },
        { label: 'Áreas comuns', icon: 'business-outline', href: '/(app)/areas', match: 'areas' },
        { label: 'Inadimplência', icon: 'trending-down-outline', href: '/(app)/financeiro/inadimplencia', match: 'inadimplencia' },
        { label: 'Contas a pagar', icon: 'briefcase-outline', href: '/(app)/financeiro/administradora', match: 'administradora' },
      ]
    : [];

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
        width: SIDEBAR_LARGURA,
        backgroundColor: palette.surface,
        borderRightWidth: 1,
        borderRightColor: palette.border,
      }}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 2, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.md }}>
          <ZeloWordmark size={24} />
        </View>

        {principais.map((it) => (
          <NavLink key={it.match} item={it} pathname={pathname} onPress={() => router.push(it.href)} />
        ))}

        <SectionLabel>MENU</SectionLabel>
        {secundarios.map((it) => (
          <NavLink key={it.match} item={it} pathname={pathname} onPress={() => router.push(it.href)} />
        ))}

        {admin.length > 0 ? (
          <>
            <SectionLabel>ADMINISTRAÇÃO</SectionLabel>
            {admin.map((it) => (
              <NavLink key={it.match} item={it} pathname={pathname} onPress={() => router.push(it.href)} />
            ))}
          </>
        ) : null}

        {gestor ? <CodigosAcesso /> : null}

        <View style={{ flex: 1, minHeight: spacing.lg }} />

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
        <NavLink
          item={{ label: 'Sair', icon: 'log-out-outline', href: '/(app)/perfil', match: '__sair' }}
          pathname={pathname}
          danger
          onPress={sair}
        />
      </ScrollView>
    </View>
  );
}

/** Códigos de acesso do condomínio. No mobile eles moram na aba "Mais"; como no
 *  desktop essa aba não existe, a sidebar precisa expô-los — sem isso o síndico
 *  não tem por onde gerar o código da portaria nem o da zeladoria. */
function CodigosAcesso() {
  const { condominioId, membershipAtual } = useAuth();
  const condominio = membershipAtual?.condominio;

  return (
    <>
      <SectionLabel>CÓDIGOS DE ACESSO</SectionLabel>
      <CodigoLinha icon="key-outline" label="Convite (morador)" codigo={condominio?.codigo_convite} />
      <CodigoLinha
        icon="shield-checkmark-outline"
        label="Portaria"
        codigo={condominio?.codigo_portaria}
        gerar={condominioId ? () => gerarCodigoPortaria(condominioId) : undefined}
      />
      <CodigoLinha
        icon="construct-outline"
        label="Zeladoria"
        codigo={condominio?.codigo_zelador}
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
  gerar,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  codigo?: string | null;
  /** Ausente no código de convite, que nasce junto com o condomínio. */
  gerar?: () => Promise<string>;
}) {
  const { palette } = useAppTheme();
  const { recarregar } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
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
    // A sidebar só roda no web, então a Clipboard API do navegador resolve —
    // não compensa trazer expo-clipboard só por isso. Sem permissão, o toast
    // mostra o código por mais tempo para copiar à mão.
    const clipboard = (globalThis as any)?.navigator?.clipboard;
    try {
      if (!clipboard?.writeText) throw new Error('sem clipboard');
      await clipboard.writeText(codigo);
      toast.sucesso('Código copiado.');
    } catch {
      toast.show(codigo, { duracao: 6000 });
    }
  }

  const interativo = !!codigo || !!gerar;
  const texto = ocupado ? 'Gerando...' : (codigo ?? (gerar ? 'Gerar código' : '—'));

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
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="subtle" numberOfLines={1}>
            {label}
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
    <AppText variant="caption" color="subtle" style={{ paddingHorizontal: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xs, letterSpacing: 0.5 }}>
      {children}
    </AppText>
  );
}

function NavLink({
  item,
  pathname,
  onPress,
  danger,
}: {
  item: Item;
  pathname: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { palette } = useAppTheme();
  const ativo = item.match !== '__sair' && pathname.includes(item.match);
  const cor = danger ? palette.danger : ativo ? palette.primary : palette.textMuted;
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
          gap: spacing.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: 10,
          borderRadius: radius.md,
          backgroundColor: ativo ? palette.primarySoft : hovered ? palette.surfaceAlt : 'transparent',
        },
        focusRing(focused, palette.primary, true),
      ]}
    >
      <Ionicons name={item.icon} size={20} color={cor} />
      <AppText variant="label" style={{ color: cor }} numberOfLines={1}>
        {item.label}
      </AppText>
    </Pressable>
  );
}
