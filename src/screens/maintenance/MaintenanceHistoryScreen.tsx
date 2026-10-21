import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Wrench } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const MaintenanceHistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicleId } = route.params ?? {};
  const { vehicles, maintenanceRecords } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const records = [...maintenanceRecords]
    .filter((record) => record.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSpent = records.reduce((sum, r) => sum + r.cost, 0);

  return (
    <ScreenShell>
      <ScreenContextHeader label="STORICO VEICOLO" onBack={() => navigation.goBack()} />

      {vehicle ? (
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIcon}>
            <VehicleIconView icon={vehicle.icon} size={24} color={colors.primary} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleTitle} numberOfLines={1}>
              {vehicle.brand} {vehicle.model}
            </Text>
            <Text style={styles.vehicleSubtitle}>{vehicle.plate}</Text>
          </View>
          <View style={styles.statsBadge}>
            <Text style={styles.statsValue}>{records.length}</Text>
            <Text style={styles.statsLabel}>{records.length === 1 ? 'intervento' : 'interventi'}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.title}>Storico manutenzioni</Text>
      )}

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Spesa complessiva</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
        </View>
        <ActionButton
          title="Nuovo intervento"
          onPress={() => navigation.navigate('MaintenanceForm', { vehicleId, mode: 'create' })}
          style={styles.addButton}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tutti gli interventi ({records.length})</Text>
        <Text style={styles.sectionHint}>Tocca una voce per i dettagli o per modificarla</Text>
      </View>

      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Wrench size={32} color={colors.muted} />
          <Text style={styles.emptyTitle}>Nessun intervento registrato</Text>
          <Text style={styles.emptyText}>Non sono ancora presenti interventi per questo veicolo.</Text>
          <ActionButton
            title="Aggiungi il primo intervento"
            onPress={() => navigation.navigate('MaintenanceForm', { vehicleId, mode: 'create' })}
            style={styles.emptyAction}
          />
        </View>
      ) : (
        records.map((record) => (
          <MaintenanceItem
            key={record.id}
            record={record}
            onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })}
          />
        ))
      )}
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
    marginTop: 12,
    marginBottom: 16,
  },
  vehicleCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: appSpacing.md,
    marginTop: appSpacing.sm,
    padding: appSpacing.md,
  },
  vehicleIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: appRadius.sm,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  vehicleInfo: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitle: {
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  vehicleSubtitle: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  statsBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: appRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statsValue: {
    color: colors.primary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    fontWeight: '800',
  },
  statsLabel: {
    color: colors.primary,
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    marginTop: 1,
  },
  summaryBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: appSpacing.md,
    gap: appSpacing.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  addButton: {
    minHeight: 40,
    paddingHorizontal: appSpacing.md,
  },
  sectionHeader: {
    marginTop: appSpacing.lg,
    marginBottom: appSpacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHint: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.md,
    borderWidth: 1,
    gap: appSpacing.sm,
    marginTop: appSpacing.md,
    padding: appSpacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: appSpacing.sm,
  },
});
