import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { apiClient } from '../../services/api/ApiClient';

type Props = NativeStackScreenProps<any>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useApp();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState(apiClient.isConfigured ? '' : 'marco@ilmioGarage.it');
  const [password, setPassword] = useState(apiClient.isConfigured ? '' : '123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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
      if (!ok) {
        setDialog({ title: 'Accesso non riuscito', message: 'Controlla email e password e riprova.' });
      }
    } catch (error) {
      setDialog({ title: 'Accesso non riuscito', message: error instanceof Error ? error.message : 'Riprova tra poco.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="ACCESSO" onBack={handleBack} />

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Accedi</Text>
        <Text style={styles.subtitle}>Inserisci le credenziali del tuo account per continuare.</Text>
      </View>

      <View style={styles.formCard}>
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
            editable={!isSubmitting}
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
            editable={!isSubmitting}
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

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotPasswordPressable}
        >
          <Text style={styles.forgotPasswordText}>Password dimenticata?</Text>
        </Pressable>

        <ActionButton
          title="Accedi"
          loading={isSubmitting}
          loadingTitle="Accesso in corso..."
          onPress={handleLogin}
          fullWidth
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
    forgotPasswordPressable: {
      alignSelf: 'flex-end',
      marginTop: 4,
      marginBottom: appSpacing.sm,
      paddingVertical: 6,
    },
    forgotPasswordText: {
      color: colors.primary,
      fontFamily: 'Manrope_700Bold',
      fontSize: 13,
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
