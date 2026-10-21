import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppColors } from './theme';

const THEME_PREFERENCE_KEY = 'mygarage-theme-dark';

type ThemeContextValue = {
  isDarkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((storedValue) => setIsDarkMode(storedValue === 'true'))
      .catch(() => setIsDarkMode(false));
  }, []);

  const setDarkMode = (enabled: boolean) => {
    setIsDarkMode(enabled);
    AsyncStorage.setItem(THEME_PREFERENCE_KEY, String(enabled)).catch(() => undefined);
  };

  const value = useMemo(() => ({ isDarkMode, setDarkMode }), [isDarkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemePreference = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference must be used within ThemeProvider');
  }
  return context;
};

export const useAppColors = () => getAppColors(useThemePreference().isDarkMode);