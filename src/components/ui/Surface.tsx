import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View, type TextStyle, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { focusRing } from '@/components/ui/controls';
import { useLayout } from '@/lib/responsivo';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/lib/theme';

/**
 * Expande Fragments para que cada linha dentro deles conte como um filho do
 * painel.
 *
 * `Children.toArray` descarta `null`/`false`, mas trata `<>...</>` como UM filho
 * só — então um bloco condicional escrito como fragmento (`{gestor ? <><A/><B/></> : null}`)
 * entraria no painel sem nenhum fio entre A e B. Como agrupar linhas em fragmento
 * é a forma natural de escrever isso em JSX, quem achata é o painel, e não cada
 * chamada.
 */
function achatarFilhos(children: ReactNode): ReactNode[] {
  const saida: ReactNode[] = [];
  Children.toArray(children).forEach((filho) => {
    if (isValidElement(filho) && filho.type === Fragment) {
      saida.push(...achatarFilhos((filho.props as { children?: ReactNode }).children));
    } else {
      saida.push(filho);
    }
  });
  return saida;
}

/**
 * Painel: UMA superfície que agrupa itens relacionados, com fios de divisão por
 * dentro.
 *
 * É a alternativa à pilha de cards soltos. Uma lista de vinte registros como
 * vinte caixas com borda, sombra e vão entre elas custa ao olho vinte decisões
 * de "onde começa e termina cada coisa"; como um painel só, a lista é um objeto
 * e as linhas são leitura contínua — que é como toda ferramenta de trabalho
 * madura apresenta dados. Cards seguem valendo para o que é de fato uma unidade
 * isolada (um destaque, um bloco único); o que é registro repetido vira linha.
 *
 * Quem insere os divisores é o painel, não as linhas — ver `achatarFilhos` para
 * por que linhas condicionais nunca deixam um fio órfão nem um fio faltando.
 */
export function Panel({
  children,
  style,
  padded = false,
}: {
  children: ReactNode;
  style?: ViewStyle;
  /** Para conteúdo livre (não uma lista de `Row`), que precisa do respiro interno. */
  padded?: boolean;
}) {
  const { palette } = useAppTheme();
  const itens = achatarFilhos(children);

  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: palette.border,
          overflow: 'hidden',
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {padded
        ? children
        : itens.map((filho, i) => (
            <Fragment key={i}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: palette.border }} /> : null}
              {filho}
            </Fragment>
          ))}
    </View>
  );
}

/**
 * Linha de painel. O respiro horizontal casa com o padding do `Panel` para que
 * o fundo de hover cubra a linha de ponta a ponta, sem a "ilha" que sobra quando
 * o realce é menor que a linha.
 */
export function Row({
  children,
  onPress,
  style,
  accessibilityLabel,
  compact,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
  /** Densidade maior para listas longas e homogêneas. */
  compact?: boolean;
}) {
  const { palette } = useAppTheme();
  const base: ViewStyle = {
    paddingVertical: compact ? spacing.md : spacing.lg - 2,
    paddingHorizontal: spacing.lg,
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed, hovered, focused }: any) => [
        base,
        hovered ? { backgroundColor: palette.surfaceAlt } : null,
        pressed ? { backgroundColor: palette.surfaceAlt, opacity: 0.9 } : null,
        focusRing(focused, palette.primary, true),
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Nome de uma seção da página, com ação opcional à direita. Em `overline`: ordena
 * a leitura sem disputar tamanho com os títulos dos itens que a seção contém.
 */
export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  /** Texto do atalho à direita (ex.: "Ver todos"). */
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  const { palette } = useAppTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
          minHeight: 20,
        },
        style,
      ]}
    >
      <AppText variant="overline" color="subtle">
        {title}
      </AppText>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
          style={({ hovered, focused }: any) => [
            {
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
              marginRight: -spacing.xs,
              borderRadius: radius.sm,
              backgroundColor: hovered ? palette.surfaceAlt : 'transparent',
            },
            focusRing(focused, palette.primary, true),
          ]}
        >
          <AppText variant="label" color="primary">
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Faixa de metadados de uma linha: itens curtos separados por ponto médio.
 * Centraliza o padrão `a · b · c` que cada tela vinha montando na mão com
 * concatenação — aqui os vazios somem sozinhos, sem separador solto na ponta.
 */
export function MetaLine({
  itens,
  color = 'muted',
  style,
}: {
  itens: (string | null | undefined | false)[];
  color?: 'muted' | 'subtle';
  style?: TextStyle;
}) {
  const { compacto } = useLayout();
  const texto = itens.filter(Boolean).join(' · ');
  if (!texto) return null;
  // No celular a faixa ganha uma segunda linha: numa só, "12 boletos vencidos ·
  // há 45 dias · desde 12/01/2026" cabia em ~180px e sumia no primeiro item.
  // Estes metadados são o que distingue uma linha da outra na lista — truncá-los
  // devolve todas ao mesmo texto.
  return (
    <AppText variant="caption" color={color} numberOfLines={compacto ? 2 : 1} style={style}>
      {texto}
    </AppText>
  );
}

/** Espaço entre blocos de uma página. Mantém o mesmo ritmo vertical em toda tela. */
export function Section({
  children,
  style,
  first,
}: {
  children: ReactNode;
  style?: ViewStyle;
  /** Primeira seção após o cabeçalho: não recebe a margem superior. */
  first?: boolean;
}) {
  return <View style={[{ marginTop: first ? 0 : spacing.xl }, style]}>{children}</View>;
}

/**
 * Linha de dado: rótulo à esquerda, valor à direita.
 *
 * Duas telas de detalhe (boleto e reserva) declaravam este mesmo componente à
 * mão, ambas como `justifyContent: 'space-between'` com os dois textos soltos.
 * No React Native o padrão de `flexShrink` é 0 — ao contrário da web —, então
 * nenhum dos dois cedia: "Unidade / Despesa geral do condomínio" simplesmente
 * transbordava a borda do cartão num celular, sem reticências e sem quebra.
 *
 * Aqui o rótulo mantém sua largura natural e o valor ocupa o resto, alinhado à
 * direita e podendo quebrar em duas linhas dentro da própria coluna. A linha
 * nunca estoura, em nenhuma largura, e continua se lendo como um extrato.
 */
export function DataRow({
  label,
  valor,
  children,
  style,
}: {
  label: string;
  /** Texto do valor. Para um valor composto (selo, botão), use `children`. */
  valor?: string | null;
  children?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, style]}>
      <AppText color="muted" variant="label" style={{ flexShrink: 0 }}>
        {label}
      </AppText>
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
        {children ?? (
          <AppText variant="label" numberOfLines={2} style={{ textAlign: 'right' }}>
            {valor}
          </AppText>
        )}
      </View>
    </View>
  );
}
