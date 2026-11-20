import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  CarFront,
  CheckCircle2,
  ChevronRight,
  Crown,
  FileDown,
  Info,
  LogOut,
  Moon,
  Paperclip,
  Sparkles,
  UserRound,
} from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors, useThemePreference } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, plan, refreshPlan } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const { isDarkMode, setDarkMode } = useThemePreference();
  const [isLogoutDialogVisible, setIsLogoutDialogVisible] = useState(false);

  // Sincronizza lo stato effettivo del piano ogni volta che il Profilo entra in primo piano
  useFocusEffect(
    useCallback(() => {
      void refreshPlan();
    }, [refreshPlan]),
  );

  const handleLogout = () => {
    setIsLogoutDialogVisible(false);
    void logout();
  };

  const userInitial = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : null;
  const isPremiumActive = Boolean(plan?.isPremium);
  const planLabel = plan
    ? plan.grantType === 'DEVELOPER'
      ? 'Developer'
      : plan.isPremium
        ? 'Premium'
        : 'Free'
    : 'Attivo';

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
            <View style={[styles.statusBadge, isPremiumActive ? styles.premiumBadge : styles.freeBadge]}>
              <Text style={[styles.statusBadgeText, isPremiumActive ? styles.premiumBadgeText : styles.freeBadgeText]}>
                {planLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user?.email ?? 'email@example.com'}
          </Text>
        </View>
      </View>

      {/* Sezione Piano & Vantaggi Premium */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>IL TUO PIANO</Text>

        {isPremiumActive ? (
          <View style={styles.premiumActiveCard}>
            <View style={styles.premiumActiveHeader}>
              <View style={styles.crownIconWrap}>
                <Crown size={20} color="#F59E0B" strokeWidth={2.2} />
              </View>
              <View style={styles.premiumActiveTitleWrap}>
                <Text style={styles.premiumActiveTitle}>
                  {plan?.grantType === 'DEVELOPER' ? 'Account Developer Abilitato' : 'MyGarage Premium Attivo'}
                </Text>
                <Text style={styles.premiumActiveSubtitle}>
                  Tutte le funzionalità esclusive sono sbloccate per il tuo account.
                </Text>
              </View>
            </View>

            <View style={styles.featureListActive}>
              <View style={styles.featureItem}>
                <CheckCircle2 size={15} color={colors.success} strokeWidth={2.4} />
                <Text style={styles.featureItemText}>Veicoli multipli illimitati nel garage</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={15} color={colors.success} strokeWidth={2.4} />
                <Text style={styles.featureItemText}>Caricamento ricevute e fatture PDF o foto</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={15} color={colors.success} strokeWidth={2.4} />
                <Text style={styles.featureItemText}>Esportazione dello storico manutenzioni in PDF</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={15} color={colors.success} strokeWidth={2.4} />
                <Text style={styles.featureItemText}>Cambio del veicolo principale sempre consentito</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.premiumPromoCard}>
            <View style={styles.premiumPromoHeader}>
              <View style={styles.crownIconWrap}>
                <Crown size={22} color="#F59E0B" strokeWidth={2.2} />
              </View>
              <View style={styles.premiumPromoTitleWrap}>
                <Text style={styles.premiumPromoEyebrow}>FUNZIONALITÀ ESCLUSIVE</Text>
                <Text style={styles.premiumPromoTitle}>Vantaggi MyGarage Premium</Text>
              </View>
            </View>

            <Text style={styles.premiumPromoDesc}>
              Passando a Premium potrai superare i limiti del piano Free e gestire il tuo garage al massimo livello:
            </Text>

            <View style={styles.promoFeaturesList}>
              <View style={styles.promoFeatureRow}>
                <View style={styles.promoFeatureIcon}>
                  <CarFront size={16} color="#F59E0B" strokeWidth={2.2} />
                </View>
                <View style={styles.promoFeatureContent}>
                  <Text style={styles.promoFeatureTitle}>Veicoli multipli illimitati</Text>
                  <Text style={styles.promoFeatureDesc}>Aggiungi tutte le auto, moto e furgoni che desideri.</Text>
                </View>
              </View>

              <View style={styles.promoFeatureRow}>
                <View style={styles.promoFeatureIcon}>
                  <Paperclip size={16} color="#F59E0B" strokeWidth={2.2} />
                </View>
                <View style={styles.promoFeatureContent}>
                  <Text style={styles.promoFeatureTitle}>Ricevute, fatture e libretti</Text>
                  <Text style={styles.promoFeatureDesc}>Allega documenti PDF e fotografie ad ogni intervento.</Text>
                </View>
              </View>

              <View style={styles.promoFeatureRow}>
                <View style={styles.promoFeatureIcon}>
                  <FileDown size={16} color="#F59E0B" strokeWidth={2.2} />
                </View>
                <View style={styles.promoFeatureContent}>
                  <Text style={styles.promoFeatureTitle}>Esportazione report PDF</Text>
                  <Text style={styles.promoFeatureDesc}>Scarica o stampa il fascicolo cronologico del veicolo.</Text>
                </View>
              </View>

              <View style={styles.promoFeatureRow}>
                <View style={styles.promoFeatureIcon}>
                  <Sparkles size={16} color="#F59E0B" strokeWidth={2.2} />
                </View>
                <View style={styles.promoFeatureContent}>
                  <Text style={styles.promoFeatureTitle}>Gestione completa e libera</Text>
                  <Text style={styles.promoFeatureDesc}>Cambia o elimina veicoli in ogni momento senza restrizioni.</Text>
                </View>
              </View>
            </View>

            <View style={styles.playBillingNotice}>
              <Info size={14} color={colors.muted} strokeWidth={2} />
              <Text style={styles.playBillingNoticeText}>
                Gli abbonamenti in-app saranno attivabili con il prossimo aggiornamento su Google Play Store.
              </Text>
            </View>
          </View>
        )}
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
      backgroundColor: `${colors.success}18`,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: appRadius.full,
    },
    statusBadgeText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    premiumBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    premiumBadgeText: {
      color: '#D97706',
    },
    freeBadge: {
      backgroundColor: `${colors.primary}18`,
    },
    freeBadgeText: {
      color: colors.primary,
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
    /* Card Piano Premium Attivo */
    premiumActiveCard: {
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      padding: appSpacing.md,
      ...appShadows.subtle,
    },
    premiumActiveHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      marginBottom: appSpacing.sm,
    },
    crownIconWrap: {
      width: 40,
      height: 40,
      borderRadius: appRadius.md,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumActiveTitleWrap: {
      flex: 1,
    },
    premiumActiveTitle: {
      ...appTypography.heading,
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
    },
    premiumActiveSubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    featureListActive: {
      gap: 6,
      marginTop: appSpacing.xs,
      paddingTop: appSpacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    featureItemText: {
      ...appTypography.body,
      fontSize: 13,
      color: colors.text,
      fontFamily: 'Manrope_600SemiBold',
    },

    /* Card Promo Premium per Utenti Free */
    premiumPromoCard: {
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      borderWidth: 1.5,
      borderColor: '#F59E0B',
      padding: appSpacing.md,
      ...appShadows.card,
    },
    premiumPromoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      marginBottom: appSpacing.xs,
    },
    premiumPromoTitleWrap: {
      flex: 1,
    },
    premiumPromoEyebrow: {
      ...appTypography.eyebrow,
      color: '#D97706',
      fontSize: 10,
      letterSpacing: 1.1,
    },
    premiumPromoTitle: {
      ...appTypography.title,
      fontSize: 18,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
    },
    premiumPromoDesc: {
      ...appTypography.body,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
      marginVertical: appSpacing.xs,
    },
    promoFeaturesList: {
      gap: appSpacing.sm,
      marginVertical: appSpacing.xs,
    },
    promoFeatureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: appSpacing.sm,
    },
    promoFeatureIcon: {
      width: 28,
      height: 28,
      borderRadius: appRadius.xs,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    promoFeatureContent: {
      flex: 1,
    },
    promoFeatureTitle: {
      ...appTypography.body,
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      color: colors.text,
    },
    promoFeatureDesc: {
      ...appTypography.caption,
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
      marginTop: 1,
    },
    playBillingNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: appSpacing.sm,
      paddingTop: appSpacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    playBillingNoticeText: {
      ...appTypography.caption,
      flex: 1,
      fontSize: 11.5,
      color: colors.muted,
      fontStyle: 'italic',
      lineHeight: 15,
    },
  });
