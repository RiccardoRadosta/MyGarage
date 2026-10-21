import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, Plus, Wrench } from 'lucide-react-native';
import { ActionButton } from '../../components/common/ActionButton';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { ScreenShell } from '../../components/common/ScreenShell';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, getRecentMaintenanceRecords } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const MaintenanceActivityScreen: React.FC<Props> = ({ navigation }) => {
  const { vehicles, maintenanceRecords } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const records = getRecentMaintenanceRecords(maintenanceRecords);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const visibleRecords = selectedVehicleId
    ? records.filter((record) => record.vehicleId === selectedVehicleId)
    : records;
  const totalSpent = maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);

  return (
    <ScreenShell>
      <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
      <Text style={styles.title}>Attività</Text>
      <Text style={styles.subtitle}>Registra e consulta gli interventi già svolti sui tuoi veicoli.</Text>

      <View style={styles.summaryPanel}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>{maintenanceRecords.length}</Text>
          <Text style={styles.summaryLabel}>interventi registrati</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
          <Text style={styles.summaryLabel}>spesa complessiva</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nuovo intervento</Text>
        <Plus size={18} color={colors.primary} />
      </View>
      {vehicles.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aggiungi prima un veicolo al garage.</Text>
          <ActionButton title="Vai al garage" onPress={() => navigation.navigate('GarageTab')} />
        </View>
      ) : (
        vehicles.map((vehicle) => (
          <Pressable
            key={vehicle.id}
            accessibilityRole="button"
            onPress={() => navigation.navigate('MaintenanceForm', { vehicleId: vehicle.id, mode: 'create' })}
            style={({ pressed }) => [styles.vehicleRow, pressed && styles.vehicleRowPressed]}
          >
            <View style={styles.vehicleIcon}>
              <VehicleIconView icon={vehicle.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.vehicleCopy}>
              <Text style={styles.vehicleName}>{vehicle.brand} {vehicle.model}</Text>
              <Text style={styles.vehicleMeta}>{vehicle.plate} · {vehicle.mileage.toLocaleString('it-IT')} km</Text>
            </View>
            <ArrowRight size={18} color={colors.primary} />
          </Pressable>
        ))
      )}

      <View style={[styles.sectionHeader, styles.historyHeader]}>
        <Text style={styles.sectionTitle}>Interventi svolti</Text>
        <Text style={styles.recordCount}>{visibleRecords.length}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <FilterChip label="Tutti" selected={selectedVehicleId === null} onPress={() => setSelectedVehicleId(null)} />
        {vehicles.map((vehicle) => (
          <FilterChip
            key={vehicle.id}
            label={`${vehicle.brand} ${vehicle.model}`}
            selected={selectedVehicleId === vehicle.id}
            onPress={() => setSelectedVehicleId(vehicle.id)}
          />
        ))}
      </ScrollView>
      {visibleRecords.length === 0 ? (
        <View style={styles.emptyCard}>
          <Wrench size={22} color={colors.muted} />
          <Text style={styles.emptyText}>
            {records.length === 0 ? 'Non hai ancora registrato interventi.' : 'Nessun intervento per questo veicolo.'}
          </Text>
        </View>
      ) : (
        visibleRecords.map((record) => {
          const vehicle = vehicles.find((item) => item.id === record.vehicleId);
          return (
            <View key={record.id}>
              <Text style={styles.vehicleMeta}>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Veicolo'}</Text>
              <MaintenanceItem
                record={record}
                onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })}
              />
            </View>
          );
        })
      )}
    </ScreenShell>
  );
};

const FilterChip: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({ label, selected, onPress }) => (
  <FilterChipContent label={label} selected={selected} onPress={onPress} />
);

const FilterChipContent: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({ label, selected, onPress }) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.filterChip, selected && styles.filterChipSelected]}>
      <Text numberOfLines={1} style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
    </Pressable>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  eyebrow: {
    color: colors.primary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    marginBottom: 3,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: 4,
    marginBottom: appSpacing.md,
    fontFamily: 'Manrope_500Medium',
  },
  summaryPanel: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: appRadius.md,
    flexDirection: 'row',
    marginBottom: appSpacing.lg,
    padding: appSpacing.md,
  },
  summaryBlock: {
    flex: 1,
    minWidth: 0,
  },
  summaryValue: {
    color: colors.white,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
  },
  summaryLabel: {
    color: colors.white,
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    height: 38,
    marginHorizontal: appSpacing.md,
    width: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: appSpacing.sm,
    marginTop: appSpacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  recordCount: {
    color: colors.muted,
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  filters: {
    gap: appSpacing.xs,
    paddingBottom: appSpacing.sm,
  },
  filterChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 180,
    paddingHorizontal: appSpacing.md,
    paddingVertical: 8,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  filterTextSelected: {
    color: colors.white,
  },
  vehicleRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: appRadius.md,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: 'row',
    gap: appSpacing.sm,
    marginBottom: appSpacing.sm,
    padding: appSpacing.md,
  },
  vehicleRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  vehicleIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: appRadius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  vehicleCopy: {
    flex: 1,
  },
  vehicleName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  vehicleMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Manrope_500Medium',
  },
  historyHeader: {
    marginTop: appSpacing.lg,
  },
  emptyCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: appRadius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: appSpacing.xs,
    padding: appSpacing.md,
  },
  emptyText: {
    color: colors.muted,
    marginBottom: appSpacing.sm,
  },
});