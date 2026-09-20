/**
 * Design tokens da Zelo.
 * Paleta clara e escura, moderna e acessível. Um único ponto de verdade para
 * cores, espaçamentos, tipografia, bordas e sombras.
 */

export type Palette = {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  white: string;
  black: string;
};
export type ModoTema = 'light' | 'dark';

/**
 * Intensidade cromática da paleta.
 *
 * `vivida` é a paleta do Zelo, e é a que está em uso. `suave` fica registrada
 * como alternativa já testada e medida: mantém EXATAMENTE os mesmos matizes — o
 * azul continua o mesmo azul, o verde o mesmo verde — e baixa só a saturação,
 * de 14% a 39% menos croma. Nenhuma outra parte do app precisa saber qual está
 * ativa: trocar esta constante (e recarregar) troca o produto inteiro.
 *
 * Duas coisas foram verificadas em ambas as paletas, e é por isso que a suave
 * não é só a vivida "lavada":
 *
 *  - CONTRASTE: todo texto de status sobre o próprio fundo, e toda cor sobre a
 *    página, ficam em 4,5:1 ou mais (WCAG AA). Para isso, no tema claro as
 *    semânticas ESCURECERAM ao perder croma — dessaturar mantendo a luminosidade
 *    média produz cor lamacenta, não sóbria.
 *  - DISTINÇÃO: com pouco croma, os 19° de matiz que separam o âmbar do vermelho
 *    deixam de bastar e os dois viram o mesmo marrom. Por isso `warning` é bem
 *    mais claro que `danger` aqui: a diferença que o croma deixou de fazer passa
 *    a ser feita pela luminosidade.
 */
export type IntensidadeCor = 'vivida' | 'suave';

export const INTENSIDADE: IntensidadeCor = 'vivida';

/** As cores que carregam croma. Os neutros são os mesmos nas duas intensidades. */
type Acentos = Pick<
  Palette,
  | 'primary' | 'primaryDark' | 'primarySoft'
  | 'success' | 'successSoft'
  | 'warning' | 'warningSoft'
  | 'danger' | 'dangerSoft'
  | 'info' | 'infoSoft'
>;

const acentosClaro: Record<IntensidadeCor, Acentos> = {
  vivida: {
    // Marca — Zelo: azul-marinho profundo (confiança & instituição). Não é o índigo.
    primary: '#12568F',
    primaryDark: '#0E4373',
    primarySoft: '#E2ECF6',
    success: '#2E7D46',
    successSoft: '#DCF0E1',
    warning: '#B45309',
    warningSoft: '#FBEBCB',
    danger: '#C0392B',
    dangerSoft: '#F7E1DD',
    info: '#0E7490',
    infoSoft: '#DEF0F3',
  },
  suave: {
    // Mesmo marinho, um passo atrás na saturação — segue reconhecível como Zelo.
    primary: '#1F5585',
    primaryDark: '#15426D',
    primarySoft: '#E5EBF2',
    success: '#346541',
    successSoft: '#E1EEE4',
    warning: '#995A37',
    warningSoft: '#F6ECD7',
    danger: '#863A30',
    dangerSoft: '#F2E3E0',
    info: '#387286',
    infoSoft: '#E3EFF1',
  },
};

const acentosEscuro: Record<IntensidadeCor, Acentos> = {
  vivida: {
    // Marca — Zelo: azul clareado (azure) para superfícies escuras.
    primary: '#5AA6E8',
    primaryDark: '#84BEF0',
    primarySoft: 'rgba(90, 166, 232, 0.16)',
    success: '#54CC82',
    successSoft: 'rgba(84, 204, 130, 0.16)',
    warning: '#F0B44E',
    warningSoft: 'rgba(240, 180, 78, 0.16)',
    danger: '#E8776B',
    dangerSoft: 'rgba(232, 119, 107, 0.16)',
    info: '#38BECF',
    infoSoft: 'rgba(56, 190, 207, 0.16)',
  },
  suave: {
    // No escuro a cor precisa de luminosidade para ser legível sobre o carvão,
    // então aqui só o croma cai — nenhuma cor passa de 0,80 de luminosidade, que
    // é o limiar em que um tom começa a "acender" contra o fundo.
    primary: '#7AA7D1',
    primaryDark: '#9BC1E4',
    primarySoft: 'rgba(122, 167, 209, 0.16)',
    success: '#83BF95',
    successSoft: 'rgba(131, 191, 149, 0.16)',
    warning: '#DCB77F',
    warningSoft: 'rgba(220, 183, 127, 0.16)',
    danger: '#CC867D',
    dangerSoft: 'rgba(204, 134, 125, 0.16)',
    info: '#78C8D4',
    infoSoft: 'rgba(120, 200, 212, 0.16)',
  },
};

/**
 * Cor de fundo do avatar quando não há foto, sorteada pelo nome.
 *
 * A lista `vivida` é a original. A `suave` troca o arco-íris de sete matizes
 * saturados (violeta, rosa e laranja chegavam a 0,247 de croma — o triplo da
 * cor da marca) por matizes do próprio mundo do Zelo, todos no mesmo croma baixo:
 * uma parede de avatares deixa de ser o elemento mais berrante da tela.
 */
export const coresAvatar: Record<IntensidadeCor, readonly string[]> = {
  vivida: ['#4F46E5', '#0EA5E9', '#16A34A', '#EA580C', '#DB2777', '#7C3AED', '#0891B2'],
  suave: ['#35597E', '#25727B', '#24644F', '#586D3E', '#68521F', '#885641', '#7A4548'],
};

const paletteLight: Palette = {
  ...acentosClaro[INTENSIDADE],
  onPrimary: '#FFFFFF',

  // Neutros frios e limpos (papel levemente azulado)
  background: '#F3F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EBEFF6',
  border: '#E0E5EE',
  borderStrong: '#C8D0DE',

  // Texto (quase-preto anavajado)
  text: '#111C2B',
  textMuted: '#516175',
  textSubtle: '#7B8798',

  // Utilitárias
  overlay: 'rgba(12, 22, 36, 0.45)',
  white: '#FFFFFF',
  black: '#0C1626',
};

const paletteDark: Palette = {
  ...acentosEscuro[INTENSIDADE],
  onPrimary: '#08121E',

  // Neutros escuros frios (azul-carvão)
  background: '#0C121C',
  surface: '#151D28',
  surfaceAlt: '#1E2836',
  border: '#2A3646',
  borderStrong: '#3A4759',

  // Texto
  text: '#EAF0F7',
  textMuted: '#A2AEC0',
  textSubtle: '#7E8B9E',

  // Utilitárias
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  black: '#0C121C',
};

/**
 * `palette` é um objeto MUTÁVEL: o mesmo objeto é compartilhado por todo o app
 * (todo `import { palette }` aponta para esta mesma referência). Trocar de tema
 * não reatribui `palette` — muta suas propriedades in-place via `aplicarTema()`.
 * Isso funciona porque os componentes leem `palette.x` durante a própria função
 * de render (nunca capturam o valor em um `StyleSheet.create` no escopo do módulo),
 * então a próxima renderização já reflete os novos valores. `ThemeProvider`
 * (`@/lib/theme`) é quem dispara essa re-renderização ao trocar de modo.
 */
export const palette: Palette = { ...paletteLight };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Raio de canto. A escala é curta e fechada de propósito: o Zelo é um produto
 * institucional, não um app de bolhas. A regra é "quanto maior a superfície,
 * MENOS proporcionalmente ela arredonda" — um painel de lista inteiro usa `lg`,
 * um controle isolado usa `md`, um selo usa `sm`. `full` fica reservado ao que é
 * genuinamente circular (avatar, ponto de status), nunca para caixas e botões.
 */
export const radius = {
  sm: 5,
  md: 7,
  lg: 9,
  xl: 12,
  full: 999,
} as const;

/**
 * Largura da navegação lateral fixa.
 *
 * Duas medidas porque a barra passou a aparecer também no tablet (a partir de
 * 768px): lá 264px consumiriam mais de um terço da largura da tela e sobraria
 * pouco para o conteúdo, então ela encolhe para 228 — o suficiente para os
 * rótulos mais longos ("Advertências e multas") sem virar uma régua de ícones.
 */
export const SIDEBAR_LARGURA = 264;
export const SIDEBAR_LARGURA_TABLET = 228;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Famílias de fonte. Os títulos e o wordmark usam Plus Jakarta Sans (humanista,
 * arredondada) — carregada no boot em src/app/_layout.tsx. O corpo segue no tipo
 * do sistema (performance + legibilidade). Como cada arquivo já é de um peso
 * específico, usa-se fontFamily (não fontWeight) para não gerar "falso-negrito".
 */
export const fonts = {
  display: 'PlusJakartaSans_800ExtraBold',
  bold: 'PlusJakartaSans_700Bold',
  semibold: 'PlusJakartaSans_600SemiBold',
} as const;

/**
 * Sombra = profundidade real, não decoração. Só quem de fato flutua SOBRE o
 * conteúdo recebe sombra: modal, toast e FAB (`floating`). Superfícies que vivem
 * no plano da página — painéis, listas, campos — se separam por borda e por
 * contraste de fundo (`background` vs `surface`), que é o que uma ferramenta de
 * trabalho faz. `soft` e `card` sobrevivem para hover no web, onde um leve
 * levantar comunica "isto é clicável"; em repouso ambos são praticamente nulos.
 */
export const shadow = {
  /** Hover de superfície clicável (web). Discreto de propósito. */
  card: {
    shadowColor: '#0B1B2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  /** Elevação mínima. Reservado a poucos casos; a maioria das superfícies não usa. */
  soft: {
    shadowColor: '#0B1B2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  /** Camada que flutua sobre o conteúdo: modal, toast, FAB. */
  floating: {
    shadowColor: '#0A2440',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

/** Cor de destaque por tipo de status (badges). Também mutável — ver `palette`. */
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

function construirTone(p: Palette): Record<Tone, { bg: string; fg: string }> {
  return {
    neutral: { bg: p.surfaceAlt, fg: p.textMuted },
    primary: { bg: p.primarySoft, fg: p.primary },
    success: { bg: p.successSoft, fg: p.success },
    warning: { bg: p.warningSoft, fg: p.warning },
    danger: { bg: p.dangerSoft, fg: p.danger },
    info: { bg: p.infoSoft, fg: p.info },
  };
}

export const tone: Record<Tone, { bg: string; fg: string }> = construirTone(paletteLight);

const paletasPorModo: Record<ModoTema, Palette> = { light: paletteLight, dark: paletteDark };

/** Muta `palette` e `tone` in-place para refletir o modo escolhido. Ver `@/lib/theme`. */
export function aplicarTema(modo: ModoTema) {
  const nova = paletasPorModo[modo];
  Object.assign(palette, nova);
  const novoTone = construirTone(nova);
  (Object.keys(novoTone) as Tone[]).forEach((k) => Object.assign(tone[k], novoTone[k]));
}

export const theme = { palette, spacing, radius, fontSize, fontWeight, shadow, tone };
export type AppTheme = typeof theme;
