import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { appColors, darkAppColors } from '../../theme/theme';
import { useThemePreference } from '../../theme/ThemeContext';

const LOGO_DARK = require('../../../assets/branding/generated/logo-dark.png');

type LoadingScreenProps = {
  isFontLoading?: boolean;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isFontLoading = false }) => {
  let isDarkMode = false;
  try {
    const theme = useThemePreference();
    isDarkMode = theme.isDarkMode;
  } catch {
    isDarkMode = false;
  }

  const backgroundColor = isDarkMode ? darkAppColors.background : appColors.primaryDark;
  const accentColor = isDarkMode ? darkAppColors.primary : appColors.accentLight;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style="light" />

      <View style={styles.centerContent}>
        <View style={styles.logoWrapper}>
          <Image
            source={LOGO_DARK}
            style={styles.logo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="MyGarage Logo"
          />
        </View>

        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text
            style={[
              styles.subtitle,
              !isFontLoading && styles.subtitleFont,
            ]}
          >
            Il tuo garage, sempre con te
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.versionText, !isFontLoading && styles.versionFont]}>
          MYGARAGE
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 240,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitleFont: {
    fontFamily: 'Manrope_500Medium',
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  versionFont: {
    fontFamily: 'Manrope_700Bold',
  },
});
