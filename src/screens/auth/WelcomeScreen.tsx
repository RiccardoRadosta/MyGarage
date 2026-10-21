import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CarFront, ShieldCheck } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <ScreenShell>
      <View style={styles.logoWrap}>
        <View style={styles.logoCircle}>
          <CarFront size={40} color={colors.primary} />
        </View>
        <Text style={styles.appName}>Il Mio Garage</Text>
        <Text style={styles.subtitle}>Il tuo garage sempre sotto controllo.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.featureRow}>
          <ShieldCheck size={20} color={colors.success} />
          <Text style={styles.featureText}>Gestisci veicoli, manutenzioni e costi in un solo posto.</Text>
        </View>
      </View>

      <ActionButton title="Accedi" onPress={() => navigation.navigate('Login')} style={styles.button} />
      <ActionButton title="Crea account" variant="secondary" onPress={() => navigation.navigate('Register')} style={styles.button} />
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  logoWrap: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: appRadius.lg,
    padding: appSpacing.lg,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  button: {
    marginBottom: appSpacing.sm,
  },
});
