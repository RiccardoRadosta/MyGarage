import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TextInput } from 'react-native-paper';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { ScreenShell } from '../../components/common/ScreenShell';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { user, updateProfile } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length > 100) {
      setDialog({ title: 'Nome non valido', message: 'Inserisci un nome da 1 a 100 caratteri.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      setDialog({ title: 'Email non valida', message: 'Controlla l’indirizzo email e riprova.' });
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(trimmedName, trimmedEmail);
      navigation.goBack();
    } catch (error) {
      setDialog({
        title: 'Modifica non riuscita',
        message: error instanceof Error ? error.message : 'Riprova tra poco.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="PROFILO" onBack={() => navigation.goBack()} />
      <Text style={styles.eyebrow}>DATI PERSONALI</Text>
      <Text style={styles.title}>Modifica profilo</Text>
      <Text style={styles.subtitle}>Le modifiche saranno salvate sul tuo account.</Text>

      <View style={styles.formCard}>
        <TextInput
          label="Nome"
          mode="outlined"
          value={name}
          onChangeText={setName}
          maxLength={100}
          editable={!isSaving}
          style={styles.input}
        />
        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={255}
          editable={!isSaving}
          style={styles.input}
        />
        <ActionButton
          title="Salva modifiche"
          loading={isSaving}
          loadingTitle="Salvataggio..."
          onPress={handleSave}
          style={styles.actionButton}
        />
        <ActionButton
          title="Annulla"
          variant="secondary"
          disabled={isSaving}
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
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
  eyebrow: {
    color: colors.primary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    marginTop: appSpacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    marginTop: 3,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginBottom: appSpacing.lg,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.md,
    borderWidth: 1,
    padding: appSpacing.md,
  },
  input: {
    marginBottom: appSpacing.sm,
  },
  actionButton: {
    marginTop: appSpacing.sm,
  },
});
