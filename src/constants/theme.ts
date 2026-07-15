/**
 * Design tokens do CondoOS.
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
  // Marca
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primarySoft: '#EEF0FF',
  onPrimary: '#FFFFFF',

  // Neutros
  background: '#F5F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F9',
  border: '#E6E8F0',
  borderStrong: '#D3D7E4',

  // Texto
  text: '#101828',
  textMuted: '#5B6478',
  // #667085 ~5:1 sobre branco (WCAG AA); o antigo #98A2B3 ficava em ~2.7:1
  textSubtle: '#667085',

  // Semânticas
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',

  // Utilitárias
  overlay: 'rgba(16, 24, 40, 0.45)',
  white: '#FFFFFF',
  black: '#101828',
};

const paletteDark: Palette = {
  // Marca
  primary: '#818CF8',
  primaryDark: '#A5B4FC',
  primarySoft: 'rgba(129, 140, 248, 0.18)',
  onPrimary: '#111127',

  // Neutros
  background: '#0B0E16',
  surface: '#161A26',
  surfaceAlt: '#1F2433',
  border: '#2B3142',
  borderStrong: '#3B4257',

  // Texto
  text: '#F1F2F6',
  textMuted: '#A2A9BD',
  // Clareado de #6E7488 para ~4.6:1 sobre as superfícies escuras
  textSubtle: '#868FA5',

  // Semânticas
  success: '#4ADE80',
  successSoft: 'rgba(74, 222, 128, 0.16)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.16)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.16)',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.16)',

  // Utilitárias
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  black: '#0B0E16',
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

export const shadow = {
  card: {
    shadowColor: '#0B1221',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  soft: {
    shadowColor: '#0B1221',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#312E81',
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
