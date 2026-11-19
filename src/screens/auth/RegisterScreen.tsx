import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { ApiError, apiClient } from '../../services/api/ApiClient';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { signInWithGoogle } from '../../services/googleAuth';

type Props = NativeStackScreenProps<any>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register, loginWithGoogle } = useApp();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});

  const inputTheme = useMemo(
    () => ({
      colors: {
        primary: colors.primary,
        background: colors.card,
        error: colors.danger,
        onSurface: colors.text,
        onSurfaceVariant: colors.muted,
        outline: colors.border,
      },
    }),
    [colors],
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Welcome');
    }
  };

  const handleRegister = async () => {
    if (isSubmitting || isGoogleSubmitting) return;
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

  const handleGoogleLogin = async () => {
    if (isSubmitting || isGoogleSubmitting) return;
    setIsGoogleSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success && result.cancelled) {
        return;
      }
      if (result.success) {
        const ok = await loginWithGoogle(result.idToken);
        if (!ok) {
          setDialog({ title: 'Registrazione non completata', message: 'Impossibile completare la registrazione con Google. Riprova.' });
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDialog({
            title: 'Account già registrato',
            message: 'Esiste già un account registrato con questa email. Accedi utilizzando email e password oppure riprova con un altro account Google.',
          });
          return;
        }
        if (error.status === 401) {
          setDialog({
            title: 'Accesso non riuscito',
            message: 'Token Google non valido, scaduto o audience non riconosciuta.',
          });
          return;
        }
      }
      setDialog({
        title: 'Registrazione con Google non riuscita',
        message: error instanceof Error ? error.message : 'Si è verificato un errore durante la registrazione con Google.',
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="REGISTRAZIONE" onBack={handleBack} />

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Crea account</Text>
        <Text style={styles.subtitle}>Apri il tuo garage personale in pochi secondi.</Text>
      </View>

      <View style={styles.formCard}>
        <GoogleSignInButton
          onPress={handleGoogleLogin}
          loading={isGoogleSubmitting}
          disabled={isSubmitting || isGoogleSubmitting}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oppure</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            label="Nome"
            mode="outlined"
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={!!errors.name}
            editable={!isSubmitting && !isGoogleSubmitting}
            theme={inputTheme}
            style={styles.fieldInput}
            left={<TextInput.Icon icon={() => <User size={18} color={colors.primary} strokeWidth={2} />} />}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={!!errors.email}
            editable={!isSubmitting && !isGoogleSubmitting}
            theme={inputTheme}
            style={styles.fieldInput}
            left={<TextInput.Icon icon={() => <Mail size={18} color={colors.primary} strokeWidth={2} />} />}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            label="Password"
            mode="outlined"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            secureTextEntry={!showPassword}
            error={!!errors.password}
            editable={!isSubmitting && !isGoogleSubmitting}
            theme={inputTheme}
            style={styles.fieldInput}
            left={<TextInput.Icon icon={() => <Lock size={18} color={colors.primary} strokeWidth={2} />} />}
            right={(
              <TextInput.Icon
                accessibilityLabel={showPassword ? 'Nascondi password' : 'Mostra password'}
                onPress={() => setShowPassword((visible) => !visible)}
                icon={({ color, size }) => (
                  showPassword ? <EyeOff size={size} color={color} /> : <Eye size={size} color={color} />
                )}
              />
            )}
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            label="Conferma password"
            mode="outlined"
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            secureTextEntry={!showConfirmPassword}
            error={!!errors.confirmPassword}
            editable={!isSubmitting && !isGoogleSubmitting}
            theme={inputTheme}
            style={styles.fieldInput}
            left={<TextInput.Icon icon={() => <Lock size={18} color={colors.primary} strokeWidth={2} />} />}
            right={(
              <TextInput.Icon
                accessibilityLabel={showConfirmPassword ? 'Nascondi conferma password' : 'Mostra conferma password'}
                onPress={() => setShowConfirmPassword((visible) => !visible)}
                icon={({ color, size }) => (
                  showConfirmPassword ? <EyeOff size={size} color={color} /> : <Eye size={size} color={color} />
                )}
              />
            )}
          />
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
        </View>

        <ActionButton
          title="Registrati"
          loading={isSubmitting}
          loadingTitle="Creazione account..."
          disabled={isSubmitting || isGoogleSubmitting}
          onPress={handleRegister}
          fullWidth
          style={styles.button}
        />
      </View>

      <Text style={styles.footerText}>
        Hai già un account?{' '}
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          Accedi
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

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerBlock: {
      marginTop: appSpacing.sm,
      marginBottom: appSpacing.lg,
    },
    title: {
      ...appTypography.title,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
    },
    subtitle: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
      fontFamily: 'Manrope_500Medium',
    },
    formCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.lg,
      ...appShadows.subtle,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: appSpacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: appSpacing.md,
      color: colors.muted,
      fontSize: 12,
      fontFamily: 'Manrope_600SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    inputWrapper: {
      marginBottom: appSpacing.sm,
    },
    fieldInput: {
      backgroundColor: colors.card,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontFamily: 'Manrope_600SemiBold',
      marginTop: 4,
    },
    button: {
      marginTop: appSpacing.sm,
    },
    footerText: {
      textAlign: 'center',
      color: colors.muted,
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
      marginTop: appSpacing.xl,
      marginBottom: appSpacing.md,
    },
    link: {
      color: colors.primary,
      fontFamily: 'Manrope_700Bold',
    },
  });
