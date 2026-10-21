import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CarFront, Plus } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { VehicleCard } from '../../components/vehicle/VehicleCard';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const GarageScreen: React.FC<Props> = ({ navigation }) => {
  const { vehicles, maintenanceRecords } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <ScreenShell>
      <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
      <View style={styles.headerRow}>
        <Text style={styles.title}>I tuoi veicoli</Text>
        <ActionButton title="Aggiungi" onPress={() => navigation.navigate('VehicleForm', { mode: 'create' })} style={styles.addButton} />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listLabel}>NEL GARAGE</Text>
        <Text style={styles.vehicleCount}>{vehicles.length} {vehicles.length === 1 ? 'veicolo' : 'veicoli'}</Text>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <CarFront size={36} color={colors.muted} />
          <Text style={styles.emptyText}>Il tuo garage è vuoto</Text>
          <Text style={styles.emptyHint}>Aggiungi il primo veicolo per iniziare il registro.</Text>
          <ActionButton title="Aggiungi il primo veicolo" onPress={() => navigation.navigate('VehicleForm', { mode: 'create' })} />
        </View>
      ) : (
        vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            records={maintenanceRecords}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id })}
          />
        ))
      )}
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  eyebrow: {
    color: colors.primary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: appSpacing.lg,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
  },
  addButton: {
    minWidth: 112,
    paddingHorizontal: appSpacing.md,
  },
  listHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: appSpacing.md,
    paddingBottom: appSpacing.sm,
  },
  listLabel: {
    color: colors.muted,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
  },
  vehicleCount: {
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.md,
    borderWidth: 1,
    padding: appSpacing.xl,
    alignItems: 'center',
    marginTop: 30,
  },
  emptyText: {
    marginTop: appSpacing.sm,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
  },
  emptyHint: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginBottom: appSpacing.md,
    marginTop: 4,
    textAlign: 'center',
  },
});
