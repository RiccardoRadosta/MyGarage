import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, Info, LogOut, Moon, UserRound } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
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

  const userInitial = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : null;

  return (
    <ScreenShell>
      {/* Intestazione del profilo */}
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
        <Text style={styles.title}>Profilo</Text>
        <Text style={styles.subtitle}>
          Gestisci il tuo account, le preferenze dell'app e la sessione.
        </Text>
      </View>

      {/* Card Account Utente */}
      <View style={styles.userCard}>
        <View style={styles.avatarWrap}>
          {userInitial ? (
            <Text style={styles.avatarInitial}>{userInitial}</Text>
          ) : (
            <UserRound size={24} color={colors.primary} strokeWidth={2} />
          )}
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name ?? 'Utente'}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Attivo</Text>
            </View>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user?.email ?? 'email@example.com'}
          </Text>
        </View>
      </View>

      {/* Sezione Impostazioni */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>IMPOSTAZIONI</Text>

        <View style={styles.settingsCard}>
          {/* Riga: Modifica dati personali */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Modifica dati personali"
            onPress={() => navigation.navigate('ProfileEdit')}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <View style={styles.settingIconWrap}>
              <UserRound size={18} color={colors.primary} strokeWidth={2} />
            </View>

            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Dati personali</Text>
              <Text style={styles.settingHint}>Modifica nome ed email</Text>
            </View>

            <ChevronRight size={18} color={colors.muted} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Riga: Tema scuro */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Moon size={18} color={colors.primary} strokeWidth={2} />
            </View>

            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Tema scuro</Text>
              <Text style={styles.settingHint}>Riduci la luminosità dell'interfaccia</Text>
            </View>

            <Switch
              accessibilityLabel="Attiva o disattiva tema scuro"
              value={isDarkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </View>

      {/* Sezione Informazioni Applicazione */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>INFORMAZIONI</Text>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Info size={18} color={colors.primary} strokeWidth={2} />
            </View>

            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Versione app</Text>
              <Text style={styles.settingHint}>Il Mio Garage per Android & iOS</Text>
            </View>

            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v1.0.0</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sezione Logout separata */}
      <View style={styles.logoutBlock}>
        <ActionButton
          title="Esci dall'account"
          variant="danger"
          icon={<LogOut size={16} color={colors.white} strokeWidth={2.4} />}
          onPress={() => setIsLogoutDialogVisible(true)}
        />
      </View>

      {/* Dialog di conferma logout */}
      <AppDialog
        visible={isLogoutDialogVisible}
        title="Vuoi uscire?"
        message="La sessione del tuo account verrà terminata. Per accedere nuovamente dovrai inserire le tue credenziali."
        confirmLabel="Esci"
        cancelLabel="Annulla"
        tone="danger"
        onDismiss={() => setIsLogoutDialogVisible(false)}
        onConfirm={handleLogout}
      />
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerBlock: {
      marginBottom: appSpacing.md,
    },
    eyebrow: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    title: {
      ...appTypography.display,
      fontSize: 27,
      lineHeight: 33,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    subtitle: {
      ...appTypography.body,
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
      lineHeight: 18,
    },
    userCard: {
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: appSpacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    avatarWrap: {
      width: 52,
      height: 52,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: appSpacing.md,
    },
    avatarInitial: {
      fontSize: 22,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.primary,
    },
    userInfo: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    userName: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      fontFamily: 'Manrope_800ExtraBold',
      flexShrink: 1,
    },
    statusBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: appRadius.full,
    },
    statusBadgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    userEmail: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 2,
      fontFamily: 'Manrope_500Medium',
    },
    sectionBlock: {
      marginBottom: appSpacing.md,
    },
    sectionTitle: {
      ...appTypography.eyebrow,
      color: colors.muted,
      fontSize: 10,
      letterSpacing: 0.8,
      marginBottom: appSpacing.xs,
      marginLeft: 2,
    },
    settingsCard: {
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: appSpacing.md,
      paddingVertical: 4,
      ...appShadows.subtle,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: appSpacing.sm,
    },
    settingRowPressed: {
      backgroundColor: colors.primarySoft,
      marginHorizontal: -appSpacing.md,
      paddingHorizontal: appSpacing.md,
      borderRadius: appRadius.sm,
    },
    settingIconWrap: {
      width: 36,
      height: 36,
      borderRadius: appRadius.md,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: appSpacing.sm,
    },
    settingContent: {
      flex: 1,
      minWidth: 0,
      marginRight: appSpacing.sm,
    },
    settingLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    settingHint: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
      marginTop: 1,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 48,
    },
    versionBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: appRadius.full,
    },
    versionBadgeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    logoutBlock: {
      marginTop: appSpacing.md,
      marginBottom: appSpacing.xl,
    },
  });
