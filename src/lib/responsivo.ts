import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Responsividade do Zelo em TRÊS EIXOS INDEPENDENTES.
 *
 * A primeira versão deste módulo tinha só um: a largura. Dela saíam tanto o
 * número de colunas quanto o tamanho dos alvos de toque, o que junta duas
 * perguntas que não têm a mesma resposta — um tablet de 800px é largo E é
 * tocado com o dedo; um notebook de 800px é largo e é usado com ponteiro. Pelo
 * critério antigo os dois recebiam botão de ponteiro. A altura não era
 * consultada em lugar nenhum, então um celular deitado no navegador (844×390)
 * era tratado como desktop e ganhava barra lateral permanente comendo 264px de
 * uma tela que já tinha pouca altura.
 *
 * O Material 3 separa exatamente esses eixos (classe de largura, classe de
 * altura, modalidade de entrada), e é o modelo adotado aqui:
 *
 *   1. CLASSE DE LARGURA — quantas colunas cabem e qual navegação usar.
 *   2. CLASSE DE ALTURA  — quanto respiro vertical a tela comporta.
 *   3. MODALIDADE        — dedo ou ponteiro, que decide tamanho de alvo.
 *
 * Os cortes de largura e altura são os do Material 3, não números inventados:
 * eles vêm de medições de parque de aparelhos (a faixa de altura compacta, por
 * exemplo, cobre ~99,8% dos celulares deitados). Usar os mesmos valores também
 * significa que o comportamento do app coincide com o que o usuário já
 * encontra no resto do sistema.
 */

/** Cortes de largura do Material 3 (window size classes). */
export const LARGURA = {
  compacta: 0, // celular em pé
  media: 600, // tablet em pé, celular deitado, navegador em meia tela
  expandida: 840, // tablet deitado, desktop
  grande: 1200,
  enorme: 1600,
} as const;

/** Cortes de altura do Material 3. */
export const ALTURA = {
  compacta: 0, // < 480: celular deitado
  media: 480,
  expandida: 900,
} as const;

export type ClasseLargura = keyof typeof LARGURA;
export type ClasseAltura = keyof typeof ALTURA;

const ORDEM_LARGURA: ClasseLargura[] = ['compacta', 'media', 'expandida', 'grande', 'enorme'];
const ORDEM_ALTURA: ClasseAltura[] = ['compacta', 'media', 'expandida'];

function classeDe<T extends string>(valor: number, cortes: Record<T, number>, ordem: T[]): T {
  let atual = ordem[0];
  for (const c of ordem) if (valor >= cortes[c]) atual = c;
  return atual;
}

/**
 * Abaixo de 360px o recuo do Material (16dp) come 10% da largura útil, então
 * aqui ele cede 2px. É a única divergência deliberada da tabela de margens do
 * M3 (16 em compacta, 24 em média e acima) — no desktop ela sobe para 32, que é
 * o que mantém a coluna de conteúdo descolada das bordas numa tela larga.
 */
const GUTTER: Record<ClasseLargura, number> = {
  compacta: 16,
  media: 24,
  expandida: 24,
  grande: 32,
  enorme: 32,
};

const GUTTER_ESTREITO = 14;
const LARGURA_ESTREITA = 360;

/**
 * Modalidade de entrada: o dedo precisa de alvo grande, o ponteiro não.
 *
 * No nativo é sempre toque. No web, `pointer: coarse` descreve o dispositivo
 * apontador PRIMÁRIO — um notebook com tela sensível ao toque, mas cujo
 * principal é o trackpad, responde `fine` e continua recebendo a densidade de
 * ponteiro, que é o correto. Sem `matchMedia`, assume toque: errar para o lado
 * do alvo maior é o erro barato.
 */
function lerToque(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(pointer: coarse)').matches;
}

function useToque(): boolean {
  const [toque, setToque] = useState(lerToque);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const aoMudar = () => setToque(mq.matches);
    // `addListener` é o caminho legado; Safari só ganhou `addEventListener` em
    // matchMedia na 14, e ainda há iPad em versões anteriores.
    if (mq.addEventListener) {
      mq.addEventListener('change', aoMudar);
      return () => mq.removeEventListener('change', aoMudar);
    }
    mq.addListener(aoMudar);
    return () => mq.removeListener(aoMudar);
  }, []);

  return toque;
}

export type Layout = {
  largura: number;
  altura: number;
  classeLargura: ClasseLargura;
  classeAltura: ClasseAltura;
  /** Recuo lateral da página nesta largura. */
  gutter: number;
  /** Abaixo de 360px: economiza cada pixel horizontal. */
  estreito: boolean;
  /** O alvo é o dedo. Decide tamanho de botão e de área clicável — nunca a largura. */
  toque: boolean;
  /** Tela baixa (celular deitado): corta respiro vertical, não conteúdo. */
  alturaCurta: boolean;
  /**
   * Navegação lateral fixa em vez de barra de abas.
   *
   * Decidido aqui, e não em cada layout, porque a barra lateral e a barra de
   * abas precisam trocar no MESMO ponto: quando os dois arquivos calculavam o
   * corte por conta própria, bastava um deles mudar para a tela ficar sem
   * navegação nenhuma ou com as duas ao mesmo tempo.
   *
   * Exige três coisas: web (no nativo a convenção é a barra de abas), largura
   * expandida (840+, o corte em que o M3 libera a gaveta permanente — abaixo
   * dela os 264px da barra espremem demais o conteúdo) e altura pelo menos
   * média. Esse último é o que impede um celular deitado, que tem largura de
   * sobra e altura de menos, de receber uma barra lateral de tela cheia.
   */
  navegacaoLateral: boolean;
  /** `true` da classe informada para cima. */
  acimaDe: (classe: ClasseLargura) => boolean;
  /** `true` abaixo da classe informada. */
  abaixoDe: (classe: ClasseLargura) => boolean;
};

/**
 * Estado responsivo atual. É a única fonte de verdade do app — nenhum
 * componente deve comparar `width` com um número solto.
 */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const toque = useToque();

  const classeLargura = classeDe(width, LARGURA, ORDEM_LARGURA);
  const classeAltura = classeDe(height, ALTURA, ORDEM_ALTURA);
  const estreito = width < LARGURA_ESTREITA;

  return {
    largura: width,
    altura: height,
    classeLargura,
    classeAltura,
    gutter: estreito ? GUTTER_ESTREITO : GUTTER[classeLargura],
    estreito,
    toque,
    alturaCurta: classeAltura === 'compacta',
    navegacaoLateral:
      Platform.OS === 'web' && width >= LARGURA.expandida && height >= ALTURA.media,
    acimaDe: (classe) => width >= LARGURA[classe],
    abaixoDe: (classe) => width < LARGURA[classe],
  };
}

/**
 * Quantas colunas cabem para um item de largura mínima `minimo`, dentro de uma
 * área de largura `disponivel`. Usado pelas grades que precisam reduzir o número
 * de colunas em vez de encolher os itens até ficarem ilegíveis.
 */
export function colunasQueCabem(disponivel: number, minimo: number, gap: number, maximo = 4): number {
  if (disponivel <= 0) return 1;
  const n = Math.floor((disponivel + gap) / (minimo + gap));
  return Math.max(1, Math.min(maximo, n));
}

/**
 * Alvo mínimo de toque.
 *
 * A WCAG 2.2 exige 24×24 no nível AA (critério 2.5.8) e 44×44 no AAA (2.5.5);
 * o HIG da Apple pede 44pt e o Material, 48dp. 44 atende o nível AAA e fica no
 * meio das duas plataformas — por isso é o piso usado nos controles pequenos.
 * Um ícone de 18px num `Pressable` sem dimensão própria vira um alvo de 18px.
 */
export const TOQUE_MINIMO = 44;
