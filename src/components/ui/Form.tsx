import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';
import { useLayout } from '@/lib/responsivo';

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

type LinhaProps = {
  children: ReactNode;
  /**
   * Largura mínima confortável de cada item antes de quebrar. Um número vale
   * para todos; um array dá a medida de cada item na ordem — é o caso de
   * "Cidade" com "UF" ao lado, em que o segundo precisa de dois caracteres e
   * dividir a linha ao meio desperdiçaria o espaço do primeiro.
   */
  minimo?: number | number[];
  style?: ViewStyle;
};

/**
 * Fileira que se reorganiza sozinha: cada item pede uma largura mínima e cresce
 * para ocupar o resto. Cabem dois lado a lado? Ficam lado a lado. Não cabem? A
 * própria quebra do flex os empilha, cada um em largura cheia.
 *
 * É o mecanismo por trás de `FormRow`, `Acoes` e `Grade` — os três diferem
 * apenas no respiro entre os itens, não no comportamento. Existe porque o app
 * inteiro resolvia isto com `flexDirection: 'row'` e `flex: 1` em cada filho,
 * uma divisão fixa que num celular de 320px dá 128px por coluna: rótulo quebrado
 * em três linhas, campos terminando em alturas diferentes, botão saindo pela
 * borda. Aqui quem decide é o espaço, não um ponto de corte — e por isso a mesma
 * tela atende de 320px a 1440px sem uma media query sequer.
 */
function LinhaFlexivel({
  children,
  minimo = 168,
  gap,
  style,
  crescer = 'sempre',
}: LinhaProps & { gap: number; crescer?: 'sempre' | 'no-toque' }) {
  const itens = achatar(children);
  const { compacto } = useLayout();
  const medida = (i: number) => (Array.isArray(minimo) ? (minimo[i] ?? minimo[minimo.length - 1]) : minimo);
  const ocupaSobra = crescer === 'sempre' || compacto;

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap }, style]}>
      {itens.map((item, i) => (
        <View
          key={i}
          style={{
            // `flexGrow` proporcional ao mínimo, e não 1 para todos: com 1, a
            // sobra era repartida em partes iguais e "UF" — que pede 76px —
            // terminava quase do tamanho de "Cidade", que pede 170. Usando a
            // própria medida como peso, a linha cresce mantendo a proporção
            // pedida em qualquer largura.
            flexGrow: ocupaSobra ? medida(i) : 0,
            flexShrink: 1,
            flexBasis: ocupaSobra ? medida(i) : 'auto',
            minWidth: 0,
          }}
        >
          {item}
        </View>
      ))}
    </View>
  );
}

/** Campos de formulário que dividem a linha quando há espaço e empilham quando não há. */
export function FormRow(props: LinhaProps) {
  return <LinhaFlexivel {...props} gap={spacing.md} />;
}

/**
 * Fileira de ações (botões) de um formulário ou de um bloco.
 *
 * Só estica no toque. Num celular, uma ação que desceu para a própria linha deve
 * ocupá-la inteira — é o alvo mais confortável e a convenção da plataforma. Com
 * ponteiro, esticar "Anexar ata" até meia tela não a torna mais clicável, só
 * pesada; lá o botão fica do tamanho do próprio rótulo, como estava.
 */
export function Acoes({ minimo = 150, ...props }: LinhaProps) {
  return <LinhaFlexivel {...props} minimo={minimo} gap={spacing.sm} crescer="no-toque" />;
}

/**
 * Grade de blocos iguais (atalhos do painel). Ao contrário de uma grade de
 * colunas fixas, o número de colunas é consequência da largura: três atalhos
 * num celular pequeno viram dois em cima e um embaixo em vez de três colunas de
 * 90px com o rótulo picado.
 */
export function Grade({ minimo = 104, ...props }: LinhaProps) {
  return <LinhaFlexivel {...props} minimo={minimo} gap={spacing.sm} />;
}
