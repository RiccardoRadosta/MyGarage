import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors, useThemePreference } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useAppColors();
  const { isDarkMode } = useThemePreference();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const logoSource = isDarkMode
    ? require('../../../assets/branding/generated/logo-dark.png')
    : require('../../../assets/branding/generated/logo-light.png');

  return (
    <ScreenShell>
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <Text style={styles.eyebrow}>BENVENUTO IN</Text>
          <View style={styles.brandLogoWrap}>
            <Image
              source={logoSource}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Logo MyGarage"
            />
          </View>
          <Text style={styles.subtitle}>Il tuo garage sempre sotto controllo.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <ShieldCheck size={22} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>Gestione Completa</Text>
              <Text style={styles.featureText}>
                Registra veicoli, interventi, scadenze e costi in un unico posto sicuro e ordinato.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionBlock}>
          <ActionButton
            title="Accedi"
            onPress={() => navigation.navigate('Login')}
            fullWidth
            style={styles.button}
          />
          <ActionButton
            title="Crea account"
            variant="secondary"
            onPress={() => navigation.navigate('Register')}
            fullWidth
            style={styles.buttonSecondary}
          />
        </View>
      </View>
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      paddingTop: appSpacing.md,
      paddingBottom: appSpacing.xl,
    },
    logoWrap: {
      alignItems: 'center',
      marginTop: appSpacing.lg,
      marginBottom: appSpacing.xl,
    },
    eyebrow: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: appSpacing.sm,
    },
    brandLogoWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: appSpacing.sm + 2,
    },
    brandLogo: {
      width: 240,
      height: 70,
    },
    subtitle: {
      ...appTypography.caption,
      fontSize: 15,
      lineHeight: 22,
      color: colors.muted,
      textAlign: 'center',
      fontFamily: 'Manrope_500Medium',
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.lg,
      marginBottom: appSpacing.xl,
      ...appShadows.subtle,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: appSpacing.md,
    },
    featureIconWrap: {
      width: 40,
      height: 40,
      borderRadius: appRadius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureCopy: {
      flex: 1,
    },
    featureTitle: {
      ...appTypography.cardTitle,
      fontSize: 15,
      lineHeight: 20,
      fontFamily: 'Manrope_700Bold',
      color: colors.text,
      marginBottom: 2,
    },
    featureText: {
      ...appTypography.caption,
      fontSize: 13,
      lineHeight: 19,
      color: colors.muted,
      fontFamily: 'Manrope_500Medium',
    },
    actionBlock: {
      gap: appSpacing.sm,
    },
    button: {
      marginBottom: 0,
    },
    buttonSecondary: {
      marginTop: 0,
    },
  });
