import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { AttachmentSection } from '../../components/maintenance/AttachmentSection';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, formatDate, formatMileage } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const MaintenanceDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { maintenanceId } = route.params ?? {};
  const { maintenanceRecords, deleteMaintenance } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);
  const record = maintenanceRecords.find((item) => item.id === maintenanceId);

  if (!record) {
    return (
      <ScreenShell>
        <Text style={styles.title}>Intervento non trovato</Text>
      </ScreenShell>
    );
  }

  const removeMaintenance = async () => {
    try {
      await deleteMaintenance(record.id);
      navigation.goBack();
    } catch (error) {
      setDialog({
        title: 'Eliminazione non riuscita',
        message: error instanceof Error ? error.message : 'Riprova tra poco.',
      });
    }
  };

  const handleDelete = () => {
    setDialog({
      tone: 'danger',
      title: 'Elimina intervento',
      message: 'Vuoi eliminare questo intervento? L’operazione non può essere annullata.',
      confirmLabel: 'Elimina',
      onConfirm: () => { void removeMaintenance(); },
    });
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="DETTAGLIO INTERVENTO" onBack={() => navigation.goBack()} />
      <Text style={styles.title}>{record.type}</Text>

      <View style={styles.card}>
        <DetailRow label="Data" value={formatDate(record.date)} />
        <DetailRow label="Chilometraggio" value={formatMileage(record.mileage)} />
        <DetailRow label="Costo" value={formatCurrency(record.cost)} />
        {record.notes ? <DetailRow label="Note" value={record.notes} /> : null}
        {record.customDescription ? <DetailRow label="Descrizione" value={record.customDescription} /> : null}
      </View>

      <AttachmentSection
        maintenanceId={record.id}
        hasAttachmentInitial={record.hasAttachment}
        readOnly
      />

      <ActionButton
        title="Modifica"
        variant="secondary"
        onPress={() => navigation.navigate('MaintenanceForm', { vehicleId: record.vehicleId, maintenanceId: record.id, mode: 'edit' })}
        style={styles.button}
      />
      <ActionButton
        title="Elimina intervento"
        variant="danger"
        onPress={handleDelete}
        style={styles.button}
      />
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

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const styles = createStyles(useAppColors());
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: appRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: appSpacing.lg,
    marginBottom: appSpacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.muted,
    fontSize: 16,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  button: {
    marginBottom: appSpacing.sm,
  },
});
