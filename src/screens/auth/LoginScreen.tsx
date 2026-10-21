import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { apiClient } from '../../services/api/ApiClient';

type Props = NativeStackScreenProps<any>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const [email, setEmail] = useState(apiClient.isConfigured ? '' : 'marco@ilmioGarage.it');
  const [password, setPassword] = useState(apiClient.isConfigured ? '' : '123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async () => {
    if (isSubmitting) return;
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'Inserisci la tua email.';
    if (!password.trim()) nextErrors.password = 'Inserisci la password.';
    const minimumPasswordLength = apiClient.isConfigured ? 8 : 6;
    if (password && password.length < minimumPasswordLength) {
      nextErrors.password = `La password deve avere almeno ${minimumPasswordLength} caratteri.`;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const ok = await login(email, password);
      if (!ok) setDialog({ title: 'Accesso non riuscito', message: 'Controlla email e password e riprova.' });
    } catch (error) {
      setDialog({ title: 'Accesso non riuscito', message: error instanceof Error ? error.message : 'Riprova tra poco.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <Text style={styles.title}>Accedi</Text>
      <Text style={styles.textMuted}>Inserisci le credenziali del tuo account.</Text>

      <View style={styles.formCard}>
        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!errors.email}
          editable={!isSubmitting}
        />
        {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

        <TextInput
          label="Password"
          mode="outlined"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          error={!!errors.password}
          editable={!isSubmitting}
          right={(
            <TextInput.Icon
              accessibilityLabel={showPassword ? 'Nascondi password' : 'Mostra password'}
              onPress={() => setShowPassword((visible) => !visible)}
              icon={({ color, size }) => showPassword
                ? <EyeOff size={size} color={color} />
                : <Eye size={size} color={color} />}
            />
          )}
        />
        {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

        <ActionButton
          title="Accedi"
          loading={isSubmitting}
          loadingTitle="Accesso in corso..."
          onPress={handleLogin}
          style={styles.button}
        />
      </View>

      <Text style={styles.footerText}>
        Non hai un account?{' '}
        <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
          Registrati
        </Text>
      </Text>
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        onDismiss={() => setDialog(null)}
      />
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  textMuted: {
    color: colors.muted,
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: appRadius.lg,
    padding: appSpacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  error: {
    color: colors.danger,
    marginTop: 6,
    fontSize: 12,
    marginBottom: 10,
  },
  button: {
    marginTop: 18,
  },
  footerText: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 20,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});
