import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';

/** Mesma expansão de Fragment do `Panel` — um bloco condicional escrito como
 *  `<>...</>` precisa contar como vários filhos, não como um. */
function achatar(children: ReactNode): ReactNode[] {
  const saida: ReactNode[] = [];
  Children.toArray(children).forEach((filho) => {
    if (isValidElement(filho) && filho.type === Fragment) {
      saida.push(...achatar((filho.props as { children?: ReactNode }).children));
    } else {
      saida.push(filho);
    }
  });
  return saida;
}

/**
 * Par (ou trio) de campos que divide a linha quando há espaço e empilha quando
 * não há.
 *
 * Isto existe porque dezesseis telas escreviam à mão `<View flexDirection="row">`
 * com cada campo dentro de um `<View flex={1}>`. Nessa forma a divisão é fixa:
 * num celular de 320px, "Taxa de uso (R$, opcional)" e "Limite mensal/unidade
 * (opcional)" ficavam com 128px cada, os rótulos quebravam em três linhas e os
 * dois campos terminavam em alturas diferentes.
 *
 * Aqui quem decide é o espaço, não um ponto de corte: cada campo pede `minimo`
 * de largura e cresce para ocupar o resto. Cabem dois? Ficam lado a lado. Não
 * cabem? A própria quebra do flex os empilha, cada um em largura cheia — sem
 * media query e sem um segundo componente só para o celular.
 */
export function FormRow({
  children,
  minimo = 168,
  style,
}: {
  children: ReactNode;
  /**
   * Largura mínima confortável de cada campo antes de empilhar. Um número vale
   * para todos; um array dá a medida de cada campo na ordem — é o caso de
   * "Cidade" com "UF" ao lado, em que o segundo precisa de dois caracteres e
   * dividir a linha ao meio desperdiçaria o espaço do primeiro.
   */
  minimo?: number | number[];
  style?: ViewStyle;
}) {
  const campos = achatar(children);
  const medida = (i: number) => (Array.isArray(minimo) ? (minimo[i] ?? minimo[minimo.length - 1]) : minimo);

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, style]}>
      {campos.map((campo, i) => (
        <View key={i} style={{ flexGrow: 1, flexShrink: 1, flexBasis: medida(i), minWidth: 0 }}>
          {campo}
        </View>
      ))}
    </View>
  );
}

/**
 * Fileira de ações (botões) de um formulário ou de um bloco.
 *
 * Mesmo princípio do `FormRow`, e resolve o estouro mais visível do app: em
 * "Anexar ata" + "Encerrar assembleia" os dois botões somavam ~355px de conteúdo
 * numa tela de 320px e o segundo simplesmente saía pela direita. Cada botão pede
 * `minimo` e quebra para a própria linha quando não cabe, em largura cheia — que
 * é a forma correta de uma ação primária se apresentar no toque.
 */
export function Acoes({
  children,
  minimo = 150,
  style,
}: {
  children: ReactNode;
  minimo?: number;
  style?: ViewStyle;
}) {
  const acoes = achatar(children);

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, style]}>
      {acoes.map((acao, i) => (
        <View key={i} style={{ flexGrow: 1, flexShrink: 1, flexBasis: minimo, minWidth: 0 }}>
          {acao}
        </View>
      ))}
    </View>
  );
}
