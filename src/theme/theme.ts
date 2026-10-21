export type AppColors = {
  primary: string;
  primaryDark: string;
  primarySoft: string;
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
  primary: '#176B50',
  primaryDark: '#104C3A',
  primarySoft: '#E7F1EB',
  accent: '#D7ED79',
  success: '#247A59',
  warning: '#B76A2E',
  danger: '#B64444',
  dangerStrong: '#C62832',
  background: '#F4F6F3',
  white: '#FFFFFF',
  card: '#FFFFFF',
  text: '#17221C',
  muted: '#6B7770',
  border: '#E1E7E1',
  shadow: 'rgba(25, 44, 34, 0.06)',
};

export const darkAppColors: AppColors = {
  primary: '#83CBA5',
  primaryDark: '#203A2D',
  primarySoft: '#263B30',
  accent: '#D7ED79',
  success: '#83CBA5',
  warning: '#E3A66F',
  danger: '#E58A82',
  dangerStrong: '#B8323B',
  background: '#111713',
  white: '#F1F5F2',
  card: '#1A231E',
  text: '#F1F5F2',
  muted: '#A5B0A9',
  border: '#303C35',
  shadow: 'rgba(0, 0, 0, 0.24)',
};

export const getAppColors = (isDarkMode: boolean): AppColors =>
  isDarkMode ? darkAppColors : appColors;

export const appSpacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const appRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
};

export const appTypography = {
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily: 'Manrope_700Bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily: 'Manrope_700Bold',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'Manrope_600SemiBold',
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: 'Manrope_400Regular',
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: 'Manrope_500Medium',
  },
};
