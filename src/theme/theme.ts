export type AppColors = {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  secondary: string;
  accentLight: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  dangerStrong: string;
  background: string;
  white: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  shadow: string;
};

export const appColors: AppColors = {
  primary: '#1677C8',
  primaryDark: '#1263A6',
  primarySoft: '#EAF5FD',
  secondary: '#3199E0',
  accentLight: '#75BCEB',
  accent: '#75BCEB',
  success: '#15803D',
  warning: '#B76A2E',
  danger: '#B64444',
  dangerStrong: '#C62832',
  background: '#F5F8FC',
  white: '#FFFFFF',
  card: '#FFFFFF',
  text: '#172337',
  muted: '#687586',
  border: '#DFE8F1',
  shadow: 'rgba(23, 35, 55, 0.06)',
};

export const darkAppColors: AppColors = {
  primary: '#4DA8EC',
  primaryDark: '#1263A6',
  primarySoft: '#162C46',
  secondary: '#3199E0',
  accentLight: '#75BCEB',
  accent: '#75BCEB',
  success: '#34D399',
  warning: '#E3A66F',
  danger: '#E58A82',
  dangerStrong: '#B8323B',
  background: '#0D1520',
  white: '#F1F5F9',
  card: '#152132',
  text: '#F1F5F9',
  muted: '#8FA0B5',
  border: '#22344B',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export const getAppColors = (isDarkMode: boolean): AppColors =>
  isDarkMode ? darkAppColors : appColors;

export const appSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const appRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
};

export const appTypography = {
  display: {
    fontSize: 30,
    fontWeight: '800' as const,
    fontFamily: 'Manrope_800ExtraBold',
    lineHeight: 36,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 26,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'Manrope_600SemiBold',
    lineHeight: 22,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800' as const,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.8,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700' as const,
    fontFamily: 'Manrope_700Bold',
  },
};

export const appShadows = {
  subtle: {
    shadowColor: 'rgba(23, 35, 55, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: 'rgba(23, 35, 55, 0.10)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
};
