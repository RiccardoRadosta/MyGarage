import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, UserRound } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors, useThemePreference } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const { isDarkMode, setDarkMode } = useThemePreference();
  const [isLogoutDialogVisible, setIsLogoutDialogVisible] = useState(false);

  const handleLogout = () => {
    setIsLogoutDialogVisible(false);
    void logout();
  };

  return (
    <ScreenShell>
      <Text style={styles.title}>Profilo</Text>
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <UserRound size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name ?? 'Utente'}</Text>
          <Text style={styles.email}>{user?.email ?? 'email@example.com'}</Text>
        </View>
      </View>

      <View style={styles.optionsCard}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('ProfileEdit')}
          style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
        >
          <View style={styles.settingCopy}>
            <Text style={styles.optionLabel}>Modifica dati personali</Text>
            <Text style={styles.optionHint}>Nome e email</Text>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </Pressable>
        <View style={styles.optionRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.optionLabel}>Tema scuro</Text>
            <Text style={styles.optionHint}>Riduce la luminosità dell’interfaccia</Text>
          </View>
          <Switch
            accessibilityLabel="Attiva tema scuro"
            value={isDarkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <ActionButton title="Logout" variant="danger" onPress={() => setIsLogoutDialogVisible(true)} style={styles.button} />

      <AppDialog
        visible={isLogoutDialogVisible}
        title="Vuoi uscire?"
        message="La sessione del tuo account verrà terminata."
        confirmLabel="Esci"
        cancelLabel="Annulla"
        tone="danger"
        onDismiss={() => setIsLogoutDialogVisible(false)}
        onConfirm={handleLogout}
      />
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 18,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: appRadius.lg,
    padding: appSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: appSpacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: appSpacing.md,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    color: colors.muted,
    marginTop: 4,
  },
  optionsCard: {
    backgroundColor: colors.card,
    borderRadius: appRadius.lg,
    padding: appSpacing.md,
    marginBottom: appSpacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: appSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  optionLabel: {
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  optionHint: {
    color: colors.muted,
    fontSize: 12,
  },
  button: {
    marginTop: 12,
  },
  settingCopy: {
    flex: 1,
    marginRight: appSpacing.sm,
  },
});
