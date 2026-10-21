import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, CarFront, ReceiptText } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { VehicleCard } from '../../components/vehicle/VehicleCard';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, getRecentMaintenanceRecords } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, vehicles, maintenanceRecords, costSummary } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  const totalSpent = costSummary?.totalSpent ?? maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);
  const recentRecords = getRecentMaintenanceRecords(maintenanceRecords).slice(0, 3);

  return (
    <ScreenShell>
      <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
      <Text style={styles.greeting}>Ciao, {user?.name ?? 'utente'}</Text>
      <Text style={styles.subtitle}>Il tuo garage, sempre in ordine.</Text>

      <View style={styles.costCard}>
        <View style={styles.costIcon}>
          <ReceiptText size={19} color={colors.accent} strokeWidth={1.8} />
        </View>
        <View>
          <Text style={styles.costLabel}>SPESA REGISTRATA</Text>
          <Text style={styles.costValue}>{formatCurrency(totalSpent)}</Text>
        </View>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Veicoli principali</Text>
        <ActionButton title="Aggiungi" variant="secondary" onPress={() => navigation.navigate('VehicleForm', { mode: 'create' })} style={styles.inlineButton} />
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <CarFront size={32} color={colors.muted} />
          <Text style={styles.emptyText}>Il tuo garage è vuoto</Text>
          <ActionButton title="Aggiungi il primo veicolo" onPress={() => navigation.navigate('VehicleForm', { mode: 'create' })} />
        </View>
      ) : (
        vehicles.slice(0, 2).map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            records={maintenanceRecords}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id })}
          />
        ))
      )}

      <View style={[styles.headerRow, styles.activitiesHeader]}>
        <Text style={styles.sectionTitle}>Attività recenti</Text>
        <Pressable style={styles.link} onPress={() => navigation.navigate('ActivitiesTab')}>
          <Text style={styles.linkText}>Vedi tutte</Text>
          <ArrowRight size={14} color={colors.primary} />
        </Pressable>
      </View>

      {recentRecords.length === 0 ? (
        <Text style={styles.noActivities}>Non hai ancora registrato interventi.</Text>
      ) : (
        recentRecords.map((record) => {
          const vehicle = vehicles.find((item) => item.id === record.vehicleId);
          return (
            <View key={record.id}>
              <Text style={styles.vehicleLabel}>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Veicolo'}</Text>
              <MaintenanceItem record={record} onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })} />
            </View>
          );
        })
      )}
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  greeting: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: appSpacing.lg,
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
  },
  costCard: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: appRadius.md,
    flexDirection: 'row',
    gap: appSpacing.md,
    marginBottom: appSpacing.xl,
    padding: appSpacing.lg,
  },
  costIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: appRadius.sm,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  costLabel: {
    color: colors.white,
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
  costValue: {
    color: colors.white,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 2,
    fontFamily: 'Manrope_800ExtraBold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: appSpacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
  },
  inlineButton: {
    width: 106,
    paddingVertical: 10,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: appRadius.md,
    padding: appSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: appSpacing.md,
    minHeight: 180,
  },
  emptyText: {
    marginTop: appSpacing.sm,
    fontSize: 18,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: appSpacing.md,
    fontFamily: 'Manrope_700Bold',
  },
  activitiesHeader: {
    marginTop: appSpacing.md,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  vehicleLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 2,
    fontFamily: 'Manrope_600SemiBold',
  },
  noActivities: {
    color: colors.muted,
    paddingVertical: appSpacing.md,
  },
});
