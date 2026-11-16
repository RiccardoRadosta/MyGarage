import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { authApi } from '../../services/api/api';
import { ApiError } from '../../services/api/ApiClient';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialToken = typeof route.params?.token === 'string' ? route.params.token.trim() : '';
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);
  const [errors, setErrors] = useState<{
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

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

  const handleReset = async () => {
    if (isSubmitting) return;

    const nextErrors: typeof errors = {};
    const sanitizedToken = token.trim();

    if (!sanitizedToken) {
      nextErrors.token = 'Inserisci il token di recupero ricevuto via email.';
    }
    if (!newPassword.trim()) {
      nextErrors.newPassword = 'Crea una nuova password.';
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'La nuova password deve contenere almeno 8 caratteri.';
    }
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Conferma la nuova password.';
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Le password non coincidono.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(sanitizedToken, newPassword, confirmPassword);
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setDialog({
            title: 'Link non valido o scaduto',
            message: 'Il link o il token per il recupero della password non è valido, è scaduto oppure è già stato utilizzato. Richiedi un nuovo link di recupero.',
            confirmLabel: 'Richiedi nuovo link',
            onConfirm: () => navigation.navigate('ForgotPassword'),
          });
          return;
        }
        if (error.status === 429) {
          setDialog({
            title: 'Troppe richieste',
            message: 'Hai effettuato troppe richieste di recupero in poco tempo. Attendi qualche minuto prima di riprovare.',
          });
          return;
        }
        if (error.code === 'NETWORK_ERROR' || error.status === 0) {
          setDialog({
            title: 'Errore di connessione',
            message: 'Impossibile contattare il server. Controlla la tua connessione e riprova.',
          });
          return;
        }
      }
      setDialog({
        title: 'Reimpostazione non riuscita',
        message: error instanceof Error ? error.message : 'Si è verificato un errore durante la reimpostazione della password. Riprova tra poco.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
    }
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="NUOVA PASSWORD" onBack={handleBack} />

      {!isSuccess ? (
        <>
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>MYGARAGE</Text>
            <Text style={styles.title}>Reimposta la password</Text>
            <Text style={styles.subtitle}>
              Scegli una nuova password sicura per il tuo account. Deve avere almeno 8 caratteri.
            </Text>
          </View>

          <View style={styles.formCard}>
            {initialToken ? (
              <View style={styles.tokenDetectedBadge}>
                <ShieldCheck size={18} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.tokenDetectedText}>Link di recupero verificato</Text>
              </View>
            ) : (
              <View style={styles.inputWrapper}>
                <TextInput
                  label="Token o codice di recupero"
                  mode="outlined"
                  value={token}
                  onChangeText={(text) => {
                    setToken(text);
                    if (errors.token) setErrors((prev) => ({ ...prev, token: undefined }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={!!errors.token}
                  editable={!isSubmitting}
                  theme={inputTheme}
                  style={styles.fieldInput}
                  left={<TextInput.Icon icon={() => <KeyRound size={18} color={colors.primary} strokeWidth={2} />} />}
                />
                {errors.token ? <Text style={styles.errorText}>{errors.token}</Text> : null}
              </View>
            )}

            <View style={styles.inputWrapper}>
              <TextInput
                label="Nuova password"
                mode="outlined"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                }}
                secureTextEntry={!showPassword}
                error={!!errors.newPassword}
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
              {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                label="Conferma nuova password"
                mode="outlined"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                secureTextEntry={!showConfirmPassword}
                error={!!errors.confirmPassword}
                editable={!isSubmitting}
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
              title="Salva nuova password"
              loading={isSubmitting}
              loadingTitle="Aggiornamento..."
              onPress={handleReset}
              fullWidth
              style={styles.button}
            />
          </View>

          <Text style={styles.footerText}>
            Ricordi la password?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
              Accedi
            </Text>
          </Text>
        </>
      ) : (
        <View style={styles.successCard}>
          <View style={styles.iconWrap}>
            <CheckCircle2 size={36} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.successTitle}>Password reimpostata!</Text>
          <Text style={styles.successMessage}>
            La tua password è stata aggiornata con successo. Per motivi di sicurezza, tutte le sessioni precedenti sono state revocate.
          </Text>
          <Text style={styles.hintMessage}>
            Ora puoi effettuare l’accesso al tuo garage con le nuove credenziali.
          </Text>

          <ActionButton
            title="Vai al login"
            onPress={() => navigation.navigate('Login')}
            fullWidth
            style={styles.successAction}
          />
        </View>
      )}

      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel}
        onConfirm={dialog?.onConfirm}
        onDismiss={() => setDialog(null)}
      />
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerBlock: {
      marginTop: appSpacing.xs,
      marginBottom: appSpacing.lg,
    },
    eyebrow: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: 4,
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
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
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
    tokenDetectedBadge: {
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderColor: colors.border,
      borderRadius: appRadius.sm,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      marginBottom: appSpacing.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    tokenDetectedText: {
      color: colors.primary,
      fontFamily: 'Manrope_700Bold',
      fontSize: 13,
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
    successCard: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      marginTop: appSpacing.md,
      padding: appSpacing.xl,
      ...appShadows.subtle,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderRadius: appRadius.md,
      height: 64,
      justifyContent: 'center',
      marginBottom: appSpacing.md,
      width: 64,
    },
    successTitle: {
      color: colors.text,
      fontFamily: 'Manrope_800ExtraBold',
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
    successMessage: {
      color: colors.text,
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
      lineHeight: 22,
      marginTop: 10,
      textAlign: 'center',
    },
    hintMessage: {
      color: colors.muted,
      fontFamily: 'Manrope_500Medium',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 8,
      textAlign: 'center',
    },
    successAction: {
      marginTop: appSpacing.lg,
    },
  });
