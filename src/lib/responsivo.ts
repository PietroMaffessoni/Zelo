import { useWindowDimensions } from 'react-native';

/**
 * Faixas de largura do Zelo.
 *
 * Antes existia UM único ponto de corte no app inteiro (`width >= 1024`, escrito
 * à mão em dois arquivos) e ele só respondia a uma pergunta: "mostro a barra
 * lateral ou a barra de abas?". Todo o resto — colunas de formulário, fileiras de
 * botão, recuo da página, densidade de lista — era desenhado num tamanho só e
 * apenas espremia nos demais.
 *
 * As faixas abaixo são as que de fato mudam uma decisão de layout neste produto,
 * não uma tabela genérica copiada de um framework:
 *
 *  - `xs`  até 359  — celular pequeno (iPhone SE, Android de entrada). Recuo menor,
 *                     tudo em uma coluna, nada lado a lado.
 *  - `sm`  360–479  — celular comum. A medida de referência do app.
 *  - `md`  480–767  — celular grande e celular deitado. Já cabe um par de campos
 *                     curtos lado a lado.
 *  - `lg`  768–1023 — tablet. Ganha a navegação lateral e recuo maior.
 *  - `xl`  1024–1439— desktop.
 *  - `xxl` 1440+    — telas grandes.
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 360,
  md: 480,
  lg: 768,
  xl: 1024,
  xxl: 1440,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const ORDEM: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

function faixaDe(largura: number): Breakpoint {
  let atual: Breakpoint = 'xs';
  for (const bp of ORDEM) if (largura >= BREAKPOINTS[bp]) atual = bp;
  return atual;
}

/**
 * Recuo lateral da página por faixa.
 *
 * Cresce com a tela em vez de ficar travado em 16px: num celular pequeno 16px de
 * cada lado comem 10% da largura útil, e num tablet os mesmos 16px deixam o
 * conteúdo colado na borda.
 */
const GUTTER: Record<Breakpoint, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 32,
};

export type Layout = {
  largura: number;
  altura: number;
  bp: Breakpoint;
  /** Recuo lateral da página nesta largura. */
  gutter: number;
  /** Formato de celular: uma coluna, campos empilhados, ações em largura cheia. */
  compacto: boolean;
  /** Celular pequeno: economiza cada pixel horizontal. */
  estreito: boolean;
  /** Tablet ou maior: cabe navegação lateral e conteúdo em duas colunas. */
  amplo: boolean;
  /** `true` da faixa informada para cima. `acima('lg')` = tablet, tablet+ e desktop. */
  acima: (bp: Breakpoint) => boolean;
  /** `true` abaixo da faixa informada. */
  abaixo: (bp: Breakpoint) => boolean;
};

/**
 * Faixa de largura atual. É a única fonte de verdade de responsividade do app —
 * nenhum componente deve comparar `width` com um número solto.
 */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const bp = faixaDe(width);

  return {
    largura: width,
    altura: height,
    bp,
    gutter: GUTTER[bp],
    compacto: width < BREAKPOINTS.lg,
    estreito: width < BREAKPOINTS.sm,
    amplo: width >= BREAKPOINTS.lg,
    acima: (alvo) => width >= BREAKPOINTS[alvo],
    abaixo: (alvo) => width < BREAKPOINTS[alvo],
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
 * Alvo mínimo de toque (Material: 48dp, HIG: 44pt). Usado como `minHeight`/
 * `minWidth` em controles pequenos — um ícone de 18px num `Pressable` sem
 * dimensão própria vira um alvo de 18px, impossível de acertar com o polegar.
 */
export const TOQUE_MINIMO = 44;
