import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarRange, CircleDollarSign, Gauge, PencilLine, Wrench } from 'lucide-react-native';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, formatDate, formatMileage, getVehicleRecords, getVehicleTotalCost } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const VehicleDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicleId } = route.params ?? {};
  const { vehicles, maintenanceRecords, deleteVehicle } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const [dialog, setDialog] = React.useState<AppDialogOptions | null>(null);
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  if (!vehicle) {
    return (
      <ScreenShell>
        <Text style={styles.title}>Veicolo non trovato</Text>
      </ScreenShell>
    );
  }

  const records = getVehicleRecords(vehicle.id, maintenanceRecords);
  const totalCost = getVehicleTotalCost(vehicle.id, maintenanceRecords);

  const removeVehicle = async () => {
    try {
      await deleteVehicle(vehicle.id);
      navigation.goBack();
    } catch (error) {
      setDialog({
        title: 'Eliminazione non riuscita',
        message: error instanceof Error ? error.message : 'Riprova tra poco.',
      });
    }
  };

  const handleDeleteVehicle = () => {
    setDialog({
      tone: 'danger',
      title: 'Elimina veicolo',
      message: 'Vuoi rimuovere questo veicolo e le attività associate? L’operazione non può essere annullata.',
      confirmLabel: 'Elimina',
      onConfirm: () => { void removeVehicle(); },
    });
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="SCHEDA VEICOLO" onBack={() => navigation.goBack()} />

      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleIcon}>
          <VehicleIconView icon={vehicle.icon} size={25} color={colors.primary} />
        </View>
        <View style={styles.vehicleTitleGroup}>
          <Text style={styles.title}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={styles.subtitle}>{vehicle.year} • {vehicle.plate}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoBlock}>
          <Gauge size={18} color={colors.primary} />
          <Text style={styles.infoLabel}>Chilometraggio</Text>
          <Text style={styles.infoValue}>{formatMileage(vehicle.mileage)}</Text>
        </View>
        <View style={styles.infoBlock}>
          <CalendarRange size={18} color={colors.primary} />
          <Text style={styles.infoLabel}>Ultimo intervento</Text>
          <Text style={styles.infoValue}>{records[0] ? formatDate(records[0].date) : 'Nessuno'}</Text>
        </View>
        <View style={styles.infoBlock}>
          <CircleDollarSign size={18} color={colors.primary} />
          <Text style={styles.infoLabel}>Costi totali</Text>
          <Text style={styles.infoValue}>{formatCurrency(totalCost)}</Text>
        </View>
      </View>

      <View style={styles.buttonGrid}>
        <ActionButton title="Aggiungi manutenzione" onPress={() => navigation.navigate('MaintenanceForm', { vehicleId: vehicle.id, mode: 'create' })} style={styles.actionButton} />
        <ActionButton title="Aggiorna chilometraggio" variant="secondary" onPress={() => navigation.navigate('VehicleForm', { mode: 'mileage', vehicleId: vehicle.id })} style={styles.actionButton} />
        <ActionButton title="Modifica dettagli veicolo" variant="secondary" onPress={() => navigation.navigate('VehicleForm', { mode: 'edit', vehicleId: vehicle.id })} style={styles.actionButton} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Attività recenti</Text>
        <Wrench size={18} color={colors.primary} />
      </View>
      {records.length > 0 ? (
        records.slice(0, 2).map((record) => (
          <MaintenanceItem key={record.id} record={record} onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })} />
        ))
      ) : (
        <Text style={styles.emptyText}>Nessun intervento registrato.</Text>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Storico</Text>
        <PencilLine size={18} color={colors.primary} />
      </View>
      <ActionButton title="Apri storico" variant="secondary" onPress={() => navigation.navigate('MaintenanceHistory', { vehicleId: vehicle.id })} style={styles.fullButton} />
      <ActionButton title="Elimina veicolo" variant="danger" onPress={handleDeleteVehicle} style={styles.fullButton} />
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        tone={dialog?.tone}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm}
        onDismiss={() => setDialog(null)}
      />
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
  },
  subtitle: {
    color: colors.muted,
    marginTop: 2,
  },
  vehicleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appSpacing.md,
    marginBottom: appSpacing.lg,
    marginTop: appSpacing.sm,
  },
  vehicleIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: appRadius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  vehicleTitleGroup: {
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: appSpacing.md,
  },
  infoBlock: {
    width: '31%',
    minWidth: 100,
    backgroundColor: colors.card,
    borderRadius: appRadius.md,
    padding: appSpacing.md,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  infoValue: {
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonGrid: {
    gap: 8,
    marginBottom: appSpacing.md,
  },
  actionButton: {
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    color: colors.muted,
    marginBottom: 18,
  },
  fullButton: {
    marginBottom: appSpacing.sm,
  },
});
