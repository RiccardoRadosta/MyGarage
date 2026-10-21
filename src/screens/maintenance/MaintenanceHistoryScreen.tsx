import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { useApp } from '../../store/AppContext';
import { AppColors, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const MaintenanceHistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicleId } = route.params ?? {};
  const { maintenanceRecords, deleteMaintenance } = useApp();
  const [dialog, setDialog] = React.useState<AppDialogOptions | null>(null);
  const colors = useAppColors();
  const styles = createStyles(colors);
  const records = [...maintenanceRecords]
    .filter((record) => record.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const removeMaintenance = async (maintenanceId: string) => {
    try {
      await deleteMaintenance(maintenanceId);
    } catch (error) {
      setDialog({
        title: 'Eliminazione non riuscita',
        message: error instanceof Error ? error.message : 'Riprova tra poco.',
      });
    }
  };

  const handleDelete = (maintenanceId: string) => {
    setDialog({
      tone: 'danger',
      title: 'Elimina intervento',
      message: 'Vuoi eliminare questo intervento? L’operazione non può essere annullata.',
      confirmLabel: 'Elimina',
      onConfirm: () => { void removeMaintenance(maintenanceId); },
    });
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="STORICO VEICOLO" onBack={() => navigation.goBack()} />
      <Text style={styles.title}>Storico manutenzioni</Text>
      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nessun intervento registrato.</Text>
        </View>
      ) : (
        records.map((record) => (
          <View key={record.id}>
            <MaintenanceItem
              record={record}
              onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })}
            />
            <View style={styles.rowActions}>
              <ActionButton title="Modifica" variant="secondary" onPress={() => navigation.navigate('MaintenanceForm', { vehicleId, maintenanceId: record.id, mode: 'edit' })} style={styles.actionButton} />
              <ActionButton title="Elimina" variant="danger" onPress={() => handleDelete(record.id)} style={styles.actionButton} />
            </View>
          </View>
        ))
      )}
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
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 18,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: appSpacing.md,
  },
  emptyText: {
    color: colors.muted,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: appSpacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
