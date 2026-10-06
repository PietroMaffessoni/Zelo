import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { itemAtivo, montarMenu, type ItemMenu } from '@/components/navegacao/itensMenu';
import { Avatar } from '@/components/ui/Avatar';
import { focusRing } from '@/components/ui/controls';
import { AppText } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCaixaEntrada } from '@/lib/caixaEntrada';
import { useConfirm } from '@/lib/confirm';
import { papelLabel } from '@/lib/labels';
import { TOQUE_MINIMO } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';

const DURACAO = 220;

/**
 * Menu lateral do celular, aberto pelo ícone de menu do cabeçalho.
 *
 * Entra pela DIREITA porque é desse lado que fica o botão que o abre: o painel
 * sai de onde o dedo tocou. Reúne todos os destinos do app (ver `montarMenu`),
 * inclusive os que não cabem nas quatro abas de baixo.
 *
 * É um `Modal` e não uma camada dentro da tela: assim ele cobre também a barra
 * de abas e o cabeçalho, prende o foco do leitor de tela enquanto aberto, e o
 * botão "voltar" do Android o fecha (`onRequestClose`) em vez de sair da tela.
 */
export function MenuLateral({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const confirmar = useConfirm();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, papel, membershipAtual, memberships, signOut } = useAuth();
  const { naoLidas } = useCaixaEntrada();

  // O Modal continua montado durante a animação de saída: `visivel` só desliga
  // depois que o painel terminou de sair, senão ele sumiria de uma vez.
  const [visivel, setVisivel] = useState(aberto);
  // Em estado, e não em ref: o valor animado é lido na renderização (no
  // `interpolate`), e o compilador do React proíbe ler ref durante o render.
  const [progresso] = useState(() => new Animated.Value(0));
  const largura = Math.min(320, Math.round(width * 0.86));

  // Abrir monta o Modal na hora; fechar espera a animação de saída. O estado
  // acompanha a prop durante a renderização, sem efeito para copiá-la.
  if (aberto && !visivel) setVisivel(true);

  useEffect(() => {
    if (!visivel) return;
    const animacao = Animated.timing(progresso, {
      toValue: aberto ? 1 : 0,
      duration: DURACAO,
      easing: aberto ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animacao.start(({ finished }) => {
      if (finished && !aberto) setVisivel(false);
    });
    return () => animacao.stop();
  }, [aberto, visivel, progresso]);

  const secoes = montarMenu(papel, membershipAtual?.unidade_id ?? null);
  const todos = secoes.flatMap((s) => s.itens);

  function ir(href: Href) {
    onFechar();
    router.push(href);
  }

  async function sair() {
    onFechar();
    // Espera o menu terminar de sair: no iOS um Modal não abre enquanto outro
    // ainda está na tela, e o diálogo de confirmação simplesmente não apareceria.
    await new Promise((r) => setTimeout(r, DURACAO + 50));
    const ok = await confirmar({
      titulo: 'Sair da conta?',
      mensagem: 'Você precisará entrar novamente com e-mail e senha.',
      confirmar: 'Sair',
      cancelar: 'Cancelar',
      destrutivo: true,
    });
    if (ok) await signOut();
  }

  const conta: ItemMenu[] = [
    { label: 'Configurações', icon: 'settings-outline', href: '/(app)/(tabs)/configuracoes', match: '/configuracoes' },
    { label: 'Meu perfil', icon: 'person-outline', href: '/(app)/perfil', match: '/perfil' },
  ];

  return (
    <Modal visible={visivel} transparent animationType="none" onRequestClose={onFechar} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay, opacity: progresso }]}>
          <Pressable
            style={{ flex: 1 }}
            onPress={onFechar}
            accessibilityRole="button"
            accessibilityLabel="Fechar menu"
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: largura,
            backgroundColor: palette.surface,
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderLeftColor: palette.border,
            transform: [{ translateX: progresso.interpolate({ inputRange: [0, 1], outputRange: [largura, 0] }) }],
          }}
        >
          {/* Quem está usando e em qual condomínio — com mais de um, é a primeira
              coisa a conferir antes de abrir qualquer tela. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingTop: insets.top + spacing.md,
              paddingBottom: spacing.md,
              paddingLeft: spacing.lg,
              paddingRight: spacing.xs + insets.right,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: palette.border,
            }}
          >
            <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="subtitle" numberOfLines={1}>
                {profile?.nome_completo || 'Meu perfil'}
              </AppText>
              <AppText variant="caption" color="muted" numberOfLines={1}>
                {[papel ? papelLabel[papel] : 'Morador', membershipAtual?.condominio?.nome].filter(Boolean).join(' · ')}
              </AppText>
            </View>
            <Pressable
              onPress={onFechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar menu"
              style={({ pressed, focused }: any) => [
                {
                  width: TOQUE_MINIMO,
                  height: TOQUE_MINIMO,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? palette.surfaceAlt : 'transparent',
                },
                focusRing(focused, palette.primary),
              ]}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.sm,
              paddingTop: spacing.sm,
              paddingBottom: spacing.lg + insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
          >
            {secoes.map((secao) => (
              <View key={secao.titulo ?? 'principal'}>
                {secao.titulo ? <Rotulo>{secao.titulo}</Rotulo> : null}
                {secao.itens.map((it) => (
                  <ItemLinha
                    key={it.match}
                    item={it}
                    ativo={itemAtivo(it, pathname, todos)}
                    contador={it.match === '/notificacoes' ? naoLidas : 0}
                    onPress={() => ir(it.href)}
                  />
                ))}
              </View>
            ))}

            <Rotulo>Conta</Rotulo>
            {conta.map((it) => (
              <ItemLinha key={it.match} item={it} ativo={itemAtivo(it, pathname, conta)} onPress={() => ir(it.href)} />
            ))}
            {memberships.length > 1 ? (
              <ItemLinha
                item={{ label: 'Trocar de condomínio', icon: 'swap-horizontal-outline', href: '/(app)/perfil', match: '__trocar' }}
                ativo={false}
                onPress={() => ir('/(app)/perfil')}
              />
            ) : null}
            <ItemLinha
              item={{ label: 'Sair', icon: 'log-out-outline', href: '/(app)/perfil', match: '__sair' }}
              ativo={false}
              perigo
              onPress={sair}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Rotulo({ children }: { children: string }) {
  return (
    <AppText
      variant="overline"
      color="subtle"
      style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xs }}
    >
      {children.toUpperCase()}
    </AppText>
  );
}

/**
 * Linha do menu. O ativo usa a primária (fundo tênue, ícone e texto na cor da
 * marca), como na barra lateral do computador: é para isso que a cor serve aqui.
 * 44px de altura — alvo de toque inteiro, não só o texto.
 */
function ItemLinha({
  item,
  ativo,
  contador = 0,
  perigo,
  onPress,
}: {
  item: ItemMenu;
  ativo: boolean;
  contador?: number;
  perigo?: boolean;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  const cor = perigo ? palette.danger : ativo ? palette.primary : palette.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={contador ? `${item.label}, ${contador} não lidas` : item.label}
      accessibilityState={{ selected: ativo }}
      style={({ pressed, focused }: any) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: TOQUE_MINIMO,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          backgroundColor: ativo ? palette.primarySoft : pressed ? palette.surfaceAlt : 'transparent',
        },
        focusRing(focused, palette.primary, true),
      ]}
    >
      <Ionicons name={item.icon} size={20} color={perigo ? palette.danger : ativo ? palette.primary : palette.textMuted} />
      <AppText variant="label" weight={ativo ? 'semibold' : undefined} style={{ color: cor, flex: 1 }} numberOfLines={1}>
        {item.label}
      </AppText>
      {contador > 0 ? (
        <View
          style={{
            minWidth: 20,
            height: 20,
            paddingHorizontal: 6,
            borderRadius: radius.full,
            backgroundColor: palette.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="caption" weight="semibold" style={{ color: palette.onPrimary, fontSize: 11, lineHeight: 14 }}>
            {contador > 99 ? '99+' : String(contador)}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
