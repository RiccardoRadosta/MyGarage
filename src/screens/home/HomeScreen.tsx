import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, CarFront, Plus, ReceiptText, Wrench } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { VehicleCard } from '../../components/vehicle/VehicleCard';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, getRecentMaintenanceRecords } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, vehicles, maintenanceRecords, costSummary, welcomePending, dismissWelcome } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  const totalSpent = costSummary?.totalSpent ?? maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);
  const recentRecords = getRecentMaintenanceRecords(maintenanceRecords).slice(0, 3);

  return (
    <ScreenShell>
      {/* Intestazione */}
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
        <Text style={styles.greeting} numberOfLines={1}>
          Ciao, {user?.name ?? 'utente'}
        </Text>
        <Text style={styles.subtitle}>Il tuo garage, sempre in ordine.</Text>
      </View>

      {/* Card della spesa registrata */}
      <View style={styles.costCard}>
        <View style={styles.costIcon}>
          <ReceiptText size={20} color={colors.accent} strokeWidth={2} />
        </View>
        <View style={styles.costInfo}>
          <Text style={styles.costLabel}>SPESA REGISTRATA</Text>
          <Text style={styles.costValue}>{formatCurrency(totalSpent)}</Text>
        </View>
      </View>

      {/* Sezione veicoli principali */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>Veicoli principali</Text>
          {vehicles.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{vehicles.length}</Text>
            </View>
          ) : null}
        </View>
        <ActionButton
          title="Aggiungi"
          variant="secondary"
          size="compact"
          icon={<Plus size={14} color={colors.primary} strokeWidth={2.4} />}
          onPress={() => navigation.navigate('VehicleForm', { mode: 'create' })}
        />
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <CarFront size={30} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Il tuo garage è vuoto</Text>
          <Text style={styles.emptySubtitle}>
            Aggiungi la tua prima auto o moto per iniziare a monitorare interventi e spese.
          </Text>
          <ActionButton
            title="Aggiungi il primo veicolo"
            icon={<Plus size={16} color={colors.white} strokeWidth={2.4} />}
            onPress={() => navigation.navigate('VehicleForm', { mode: 'create' })}
          />
        </View>
      ) : (
        <View style={styles.vehiclesList}>
          {vehicles.slice(0, 2).map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              records={maintenanceRecords}
              onPress={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id })}
            />
          ))}
        </View>
      )}

      {/* Sezione attività recenti */}
      <View style={[styles.sectionHeaderRow, styles.activitiesHeader]}>
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>Attività recenti</Text>
          {recentRecords.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{recentRecords.length}</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vedi tutte le attività"
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
          onPress={() => navigation.navigate('ActivitiesTab')}
        >
          <Text style={styles.linkText}>Vedi tutte</Text>
          <ArrowRight size={14} color={colors.primary} strokeWidth={2.4} />
        </Pressable>
      </View>

      {recentRecords.length === 0 ? (
        <View style={styles.emptyActivitiesCard}>
          <Wrench size={18} color={colors.muted} strokeWidth={1.8} />
          <Text style={styles.emptyActivitiesText}>Non hai ancora registrato interventi.</Text>
        </View>
      ) : (
        <View style={styles.activitiesList}>
          {recentRecords.map((record) => {
            const vehicle = vehicles.find((item) => item.id === record.vehicleId);
            return (
              <MaintenanceItem
                key={record.id}
                record={record}
                vehicle={vehicle ? { brand: vehicle.brand, model: vehicle.model, plate: vehicle.plate } : undefined}
                onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })}
              />
            );
          })}
        </View>
      )}

      {/* Welcome Dialog */}
      <AppDialog
        visible={welcomePending}
        title="Benvenuto in Il Mio Garage!"
        message="Il tuo account è pronto. Inizia ad aggiungere i tuoi veicoli e tieni sotto controllo manutenzioni, spese e interventi."
        confirmLabel="Aggiungi un veicolo"
        cancelLabel="Più tardi"
        tone="info"
        onConfirm={() => {
          dismissWelcome();
          navigation.navigate('VehicleForm', { mode: 'create' });
        }}
        onDismiss={dismissWelcome}
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
    greeting: {
      ...appTypography.display,
      fontSize: 28,
      lineHeight: 34,
      color: colors.text,
      letterSpacing: -0.4,
    },
    subtitle: {
      ...appTypography.body,
      fontSize: 14,
      color: colors.muted,
      marginTop: 2,
    },
    costCard: {
      alignItems: 'center',
      backgroundColor: colors.primaryDark,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.accent}2E`,
      flexDirection: 'row',
      gap: appSpacing.md,
      marginBottom: appSpacing.lg,
      padding: appSpacing.lg,
      ...appShadows.card,
    },
    costIcon: {
      alignItems: 'center',
      backgroundColor: `${colors.accent}26`,
      borderRadius: appRadius.md,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    costInfo: {
      flex: 1,
    },
    costLabel: {
      ...appTypography.eyebrow,
      color: colors.accent,
      letterSpacing: 0.9,
    },
    costValue: {
      color: colors.white,
      fontSize: 26,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      marginTop: 2,
      letterSpacing: -0.3,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: appSpacing.sm,
    },
    sectionTitleBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
    },
    sectionTitle: {
      ...appTypography.sectionTitle,
      color: colors.text,
    },
    countBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: appRadius.full,
    },
    countBadgeText: {
      ...appTypography.badge,
      color: colors.primary,
      fontSize: 11,
    },
    vehiclesList: {
      marginBottom: 0,
    },
    emptyState: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      paddingVertical: appSpacing.xl,
      paddingHorizontal: appSpacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    emptyIconWrap: {
      width: 58,
      height: 58,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: appSpacing.sm,
    },
    emptyTitle: {
      ...appTypography.title,
      fontSize: 17,
      color: colors.text,
      marginBottom: 4,
    },
    emptySubtitle: {
      ...appTypography.body,
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: appSpacing.md,
      paddingHorizontal: appSpacing.sm,
    },
    activitiesHeader: {
      marginTop: appSpacing.sm,
    },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: appRadius.full,
    },
    linkPressed: {
      backgroundColor: colors.primarySoft,
    },
    linkText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    emptyActivitiesCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      padding: appSpacing.md,
      marginBottom: appSpacing.sm,
      ...appShadows.subtle,
    },
    emptyActivitiesText: {
      ...appTypography.body,
      color: colors.muted,
      fontSize: 13,
    },
    activitiesList: {
      gap: 0,
    },
  });
