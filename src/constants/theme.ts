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

const paletteLight: Palette = {
  // Marca — Zelo: azul-marinho profundo (confiança & instituição). Não é o índigo.
  primary: '#12568F',
  primaryDark: '#0E4373',
  primarySoft: '#E2ECF6',
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

  // Semânticas — agora contrastam com a primária azul (verde/vermelho/âmbar/teal)
  success: '#2E7D46',
  successSoft: '#DCF0E1',
  warning: '#B45309',
  warningSoft: '#FBEBCB',
  danger: '#C0392B',
  dangerSoft: '#F7E1DD',
  info: '#0E7490',
  infoSoft: '#DEF0F3',

  // Utilitárias
  overlay: 'rgba(12, 22, 36, 0.45)',
  white: '#FFFFFF',
  black: '#0C1626',
};

const paletteDark: Palette = {
  // Marca — Zelo: azul clareado (azure) para superfícies escuras.
  primary: '#5AA6E8',
  primaryDark: '#84BEF0',
  primarySoft: 'rgba(90, 166, 232, 0.16)',
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

  // Semânticas
  success: '#54CC82',
  successSoft: 'rgba(84, 204, 130, 0.16)',
  warning: '#F0B44E',
  warningSoft: 'rgba(240, 180, 78, 0.16)',
  danger: '#E8776B',
  dangerSoft: 'rgba(232, 119, 107, 0.16)',
  info: '#38BECF',
  infoSoft: 'rgba(56, 190, 207, 0.16)',

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

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

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

export const shadow = {
  card: {
    shadowColor: '#0B1B2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  soft: {
    shadowColor: '#0B1B2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0A2440',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
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
