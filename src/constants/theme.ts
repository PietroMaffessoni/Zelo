/**
 * Design tokens do CondoOS.
 * Paleta clara, moderna e acessível. Um único ponto de verdade para
 * cores, espaçamentos, tipografia, bordas e sombras.
 */

export const palette = {
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
  textSubtle: '#98A2B3',

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
} as const;

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

/** Cor de destaque por tipo de status (badges). */
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export const tone: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: palette.surfaceAlt, fg: palette.textMuted },
  primary: { bg: palette.primarySoft, fg: palette.primary },
  success: { bg: palette.successSoft, fg: palette.success },
  warning: { bg: palette.warningSoft, fg: palette.warning },
  danger: { bg: palette.dangerSoft, fg: palette.danger },
  info: { bg: palette.infoSoft, fg: palette.info },
};

export const theme = { palette, spacing, radius, fontSize, fontWeight, shadow, tone };
export type AppTheme = typeof theme;
