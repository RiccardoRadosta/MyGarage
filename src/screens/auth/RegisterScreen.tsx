import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { apiClient } from '../../services/api/ApiClient';

export const RegisterScreen: React.FC = () => {
  const { register } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});

  const handleRegister = async () => {
    if (isSubmitting) return;
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = 'Inserisci il tuo nome.';
    if (!email.trim()) nextErrors.email = 'Inserisci una email valida.';
    if (!password.trim()) nextErrors.password = 'Inserisci una password.';
    const minimumPasswordLength = apiClient.isConfigured ? 8 : 6;
    if (password && password.length < minimumPasswordLength) {
      nextErrors.password = `La password deve avere almeno ${minimumPasswordLength} caratteri.`;
    }
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Le password non coincidono.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const ok = await register(name, email, password, confirmPassword);
      if (!ok) {
        setDialog({ title: 'Registrazione non completata', message: 'Controlla i campi e prova di nuovo.' });
        return;
      }

    } catch (error) {
      setDialog({ title: 'Registrazione non completata', message: error instanceof Error ? error.message : 'Riprova tra poco.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <Text style={styles.title}>Crea account</Text>
      <Text style={styles.textMuted}>Apri il tuo garage personale in pochi secondi.</Text>

      <View style={styles.formCard}>
        <TextInput label="Nome" mode="outlined" value={name} onChangeText={setName} error={!!errors.name} editable={!isSubmitting} />
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

        <TextInput label="Email" mode="outlined" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={!!errors.email} editable={!isSubmitting} />
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

        <TextInput
          label="Conferma password"
          mode="outlined"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          error={!!errors.confirmPassword}
          editable={!isSubmitting}
          right={(
            <TextInput.Icon
              accessibilityLabel={showConfirmPassword ? 'Nascondi conferma password' : 'Mostra conferma password'}
              onPress={() => setShowConfirmPassword((visible) => !visible)}
              icon={({ color, size }) => showConfirmPassword
                ? <EyeOff size={size} color={color} />
                : <Eye size={size} color={color} />}
            />
          )}
        />
        {errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}

        <ActionButton
          title="Registrati"
          loading={isSubmitting}
          loadingTitle="Creazione account..."
          onPress={handleRegister}
          style={styles.button}
        />
      </View>
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
    marginBottom: 8,
  },
  button: {
    marginTop: 18,
  },
});
