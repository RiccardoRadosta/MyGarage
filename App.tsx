import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { AppProvider } from './src/store/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { getAppColors } from './src/theme/theme';
import { ThemeProvider, useThemePreference } from './src/theme/ThemeContext';

const ThemedApp = () => {
  const { isDarkMode } = useThemePreference();
  const colors = getAppColors(isDarkMode);
  const basePaperTheme = isDarkMode ? MD3DarkTheme : MD3LightTheme;
  const paperTheme = {
    ...basePaperTheme,
    colors: {
      ...basePaperTheme.colors,
      primary: colors.primary,
      background: colors.background,
      surface: colors.card,
      onSurface: colors.text,
      onSurfaceVariant: colors.muted,
      outline: colors.border,
    },
    fonts: {
      ...basePaperTheme.fonts,
      bodyLarge: { ...basePaperTheme.fonts.bodyLarge, fontFamily: 'Manrope_500Medium' },
      bodyMedium: { ...basePaperTheme.fonts.bodyMedium, fontFamily: 'Manrope_500Medium' },
      bodySmall: { ...basePaperTheme.fonts.bodySmall, fontFamily: 'Manrope_500Medium' },
      labelLarge: { ...basePaperTheme.fonts.labelLarge, fontFamily: 'Manrope_600SemiBold' },
      labelMedium: { ...basePaperTheme.fonts.labelMedium, fontFamily: 'Manrope_600SemiBold' },
      labelSmall: { ...basePaperTheme.fonts.labelSmall, fontFamily: 'Manrope_500Medium' },
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <AppProvider>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <AppNavigator />
      </AppProvider>
    </PaperProvider>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
