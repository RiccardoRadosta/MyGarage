import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, getVehicleRecords } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const CostsScreen: React.FC<Props> = () => {
  const { vehicles, maintenanceRecords, costSummary } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  const totalSpent = costSummary?.totalSpent ?? maintenanceRecords.reduce((sum, item) => sum + item.cost, 0);
  const currentYear = new Date().getFullYear();
  const annualSpent = costSummary?.yearSpent ?? maintenanceRecords
    .filter((item) => new Date(item.date).getFullYear() === currentYear)
    .reduce((sum, item) => sum + item.cost, 0);

  const perType = costSummary?.byType.map((item) => ({ type: item.typeLabel, total: item.total }))
    ?? Array.from(new Set(maintenanceRecords.map((item) => item.type))).map((type) => ({
      type,
      total: maintenanceRecords.filter((item) => item.type === type).reduce((sum, record) => sum + record.cost, 0),
    }));

  return (
    <ScreenShell>
      <Text style={styles.title}>Costi</Text>

      <View style={styles.summaryRow}>
        <View style={styles.card}>
          <Text style={styles.label}>Spesa totale</Text>
          <Text style={styles.value}>{formatCurrency(totalSpent)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Anno corrente</Text>
          <Text style={styles.value}>{formatCurrency(annualSpent)}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Elenco manutenzioni</Text>
        {maintenanceRecords.slice(0, 6).map((record) => {
          const vehicle = vehicles.find((item) => item.id === record.vehicleId);
          return (
            <View key={record.id} style={styles.listRow}>
              <View>
                <Text style={styles.listType}>{record.type}</Text>
                <Text style={styles.meta}>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Veicolo'} • {record.date}</Text>
              </View>
              <Text style={styles.listCost}>{formatCurrency(record.cost)}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Riepilogo per tipologia</Text>
        {perType.map((item) => (
          <View key={item.type} style={styles.listRow}>
            <Text style={styles.listType}>{item.type}</Text>
            <Text style={styles.listCost}>{formatCurrency(item.total)}</Text>
          </View>
        ))}
      </View>
    </ScreenShell>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: appSpacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: appRadius.md,
    padding: appSpacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  sectionCard: {
    backgroundColor: colors.card,
    padding: appSpacing.md,
    borderRadius: appRadius.md,
    marginTop: appSpacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: appSpacing.md,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: appSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listType: {
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  listCost: {
    color: colors.primary,
    fontWeight: '700',
  },
});
