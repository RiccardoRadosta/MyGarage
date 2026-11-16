import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, MailCheck } from 'lucide-react-native';
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

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

  const handleSend = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Inserisci il tuo indirizzo email.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Inserisci un indirizzo email valido.');
      return;
    }

    setEmailError(null);
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(trimmedEmail.toLowerCase());
      setIsSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError) {
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
        title: 'Invio non riuscito',
        message: error instanceof Error ? error.message : 'Si è verificato un errore durante l’invio. Riprova tra poco.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="RECUPERO PASSWORD" onBack={() => navigation.goBack()} />

      {!isSubmitted ? (
        <>
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>MYGARAGE</Text>
            <Text style={styles.title}>Recupera password</Text>
            <Text style={styles.subtitle}>
              Inserisci l’indirizzo email associato al tuo account. Ti invieremo un link con le istruzioni per impostarne una nuova.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputWrapper}>
              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={!!emailError}
                editable={!isSubmitting}
                theme={inputTheme}
                style={styles.fieldInput}
                left={<TextInput.Icon icon={() => <Mail size={18} color={colors.primary} strokeWidth={2} />} />}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <ActionButton
              title="Invia link di recupero"
              loading={isSubmitting}
              loadingTitle="Invio in corso..."
              onPress={handleSend}
              fullWidth
              style={styles.button}
            />
          </View>

          <Text style={styles.footerText}>
            Ricordi la password?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
              Torna al login
            </Text>
          </Text>
        </>
      ) : (
        <View style={styles.successCard}>
          <View style={styles.iconWrap}>
            <MailCheck size={32} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.successTitle}>Controlla la tua casella email</Text>
          <Text style={styles.successMessage}>
            Se l’indirizzo inserito è associato a un account, riceverai a breve un’email con le istruzioni per reimpostare la password.
          </Text>
          <Text style={styles.hintMessage}>
            Ricordati di controllare anche la cartella spam o posta indesiderata se non vedi il messaggio entro pochi minuti.
          </Text>

          <ActionButton
            title="Torna al login"
            onPress={() => navigation.navigate('Login')}
            fullWidth
            style={styles.successAction}
          />

          <ActionButton
            title="Invia di nuovo"
            variant="secondary"
            onPress={() => {
              setIsSubmitted(false);
              setEmail('');
            }}
            fullWidth
            style={styles.secondaryAction}
          />
        </View>
      )}

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
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginBottom: 4,
      fontFamily: 'Manrope_600SemiBold',
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
      fontSize: 20,
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
      marginBottom: appSpacing.xs,
    },
    secondaryAction: {
      marginTop: appSpacing.xs,
    },
  });
