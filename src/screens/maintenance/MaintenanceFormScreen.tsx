import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { Battery, CalendarDays, Check, ChevronDown, CircleDot, ClipboardCheck, Cog, Disc3, Droplet, MoreHorizontal, Wind } from 'lucide-react-native';
import { Menu, TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatMileage } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

const maintenanceOptions = [
  { label: 'Cambio olio', Icon: Droplet },
  { label: 'Tagliando', Icon: ClipboardCheck },
  { label: 'Freni / pastiglie', Icon: Disc3 },
  { label: 'Cambio gomme', Icon: CircleDot },
  { label: 'Cambio tergicristalli', Icon: Wind },
  { label: 'Revisione', Icon: ClipboardCheck },
  { label: 'Batteria', Icon: Battery },
  { label: 'Distribuzione', Icon: Cog },
  { label: 'Altro', Icon: MoreHorizontal },
];

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDateValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(fromDateValue(value));

const isValidDateValue = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number) as unknown as [string, number, number, number];
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
};

export const MaintenanceFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicleId, maintenanceId, mode } = route.params ?? {};
  const { vehicles, maintenanceRecords, addMaintenance, updateMaintenance } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const existing = maintenanceRecords.find((item) => item.id === maintenanceId);
  const vehiclesById = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const existingIsCustom = !!existing && !maintenanceOptions.some((option) => option.label === existing.type);

  const [type, setType] = useState(existingIsCustom ? 'Altro' : existing?.type ?? 'Cambio olio');
  const [date, setDate] = useState(existing?.date ?? toDateValue(new Date()));
  const [mileage, setMileage] = useState(existing?.mileage ? String(existing.mileage) : vehiclesById ? String(vehiclesById.mileage) : '0');
  const [cost, setCost] = useState(existing?.cost ? String(existing.cost) : '0');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [customDescription, setCustomDescription] = useState(existing?.customDescription ?? (existingIsCustom ? existing.type : ''));
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);
  const [errors, setErrors] = useState<{ type?: string; date?: string; mileage?: string; cost?: string; notes?: string; customDescription?: string }>({});

  const selectedType = type === 'Altro';
  const selectedMaintenanceOption = maintenanceOptions.find((option) => option.label === type) ?? maintenanceOptions[0];

  useEffect(() => {
    if (existing) {
      const isCustom = !maintenanceOptions.some((option) => option.label === existing.type);
      setType(isCustom ? 'Altro' : existing.type);
      setDate(existing.date);
      setMileage(String(existing.mileage));
      setCost(String(existing.cost));
      setNotes(existing.notes ?? '');
      setCustomDescription(existing.customDescription ?? (isCustom ? existing.type : ''));
    }
  }, [existing]);

  const handleSave = async () => {
    const nextErrors: typeof errors = {};
    const numericCost = Number(cost.trim().replace(',', '.'));
    if (!type.trim()) nextErrors.type = 'Seleziona un tipo di manutenzione.';
    if (!isValidDateValue(date)) nextErrors.date = 'Seleziona una data valida.';
    if (!mileage.trim()) nextErrors.mileage = 'Inserisci il chilometraggio.';
    if (Number(mileage) < 0) nextErrors.mileage = 'Il chilometraggio non può essere negativo.';
    if (mileage.trim() && (!Number.isInteger(Number(mileage)) || !Number.isFinite(Number(mileage)))) nextErrors.mileage = 'Inserisci un chilometraggio intero.';
    if (!cost.trim()) nextErrors.cost = 'Inserisci un costo.';
    if (numericCost < 0) nextErrors.cost = 'Il costo non può essere negativo.';
    if (cost.trim() && (!Number.isFinite(numericCost) || !/^\d+(?:[.,]\d{1,2})?$/.test(cost.trim()))) nextErrors.cost = 'Inserisci un importo con massimo due decimali.';
    if (notes.length > 2000) nextErrors.notes = 'Le note possono contenere al massimo 2000 caratteri.';
    if (type === 'Altro' && !customDescription.trim()) nextErrors.customDescription = 'Specifica la manutenzione personalizzata.';
    if (type === 'Altro' && customDescription.trim().length > 100) nextErrors.customDescription = 'La descrizione può contenere al massimo 100 caratteri.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const finalType = type === 'Altro' ? customDescription.trim() : type;
    const payload = {
      vehicleId,
      type: finalType,
      date,
      mileage: Number(mileage),
      cost: Number(cost.replace(',', '.')),
      notes: notes.trim(),
      customDescription: type === 'Altro' ? customDescription.trim() : undefined,
    };

    try {
      if (mode === 'edit' && existing) {
        await updateMaintenance({ ...existing, ...payload });
      } else {
        await addMaintenance(payload);
      }

      navigation.goBack();
    } catch (error) {
      setDialog({ title: 'Salvataggio non riuscito', message: error instanceof Error ? error.message : 'Riprova tra poco.' });
    }
  };

  const handleDateValueChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    setDate(toDateValue(selectedDate));
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromDateValue(date),
        mode: 'date',
        display: 'default',
        onValueChange: handleDateValueChange,
      });
      return;
    }

    setDatePickerVisible(true);
  };

  return (
    <ScreenShell>
      <ScreenContextHeader label="MANUTENZIONE" onBack={() => navigation.goBack()} />
      <Text style={styles.eyebrow}>{mode === 'edit' ? 'AGGIORNA REGISTRO' : 'NUOVO INTERVENTO'}</Text>
      <Text style={styles.title}>{mode === 'edit' ? 'Modifica intervento' : 'Registra intervento'}</Text>
      <Text style={styles.subtitle}>Aggiungi i dettagli del lavoro svolto.</Text>

      {vehiclesById ? (
        <View style={styles.vehicleSummary}>
          <View style={styles.vehicleIcon}>
            <VehicleIconView icon={vehiclesById.icon} size={21} color={colors.primary} />
          </View>
          <View style={styles.vehicleCopy}>
            <Text style={styles.vehicleName}>{vehiclesById.brand} {vehiclesById.model}</Text>
            <Text style={styles.vehicleMeta}>{vehiclesById.plate}</Text>
          </View>
          <View style={styles.mileageBadge}>
            <Text style={styles.mileageLabel}>ATTUALE</Text>
            <Text style={styles.mileageValue}>{formatMileage(vehiclesById.mileage)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>INTERVENTO</Text>
        <Text style={styles.label}>Tipo di manutenzione</Text>
        <Menu
          visible={typeMenuVisible}
          onDismiss={() => setTypeMenuVisible(false)}
          anchor={(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tipo di manutenzione: ${type}. Apri elenco.`}
              accessibilityState={{ expanded: typeMenuVisible }}
              onPress={() => setTypeMenuVisible(true)}
              style={styles.dropdown}
            >
              <selectedMaintenanceOption.Icon size={18} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.dropdownText}>{type}</Text>
              <ChevronDown size={18} color={colors.muted} />
            </Pressable>
          )}
        >
          {maintenanceOptions.map(({ label, Icon }) => (
            <Menu.Item
              key={label}
              title={label}
              leadingIcon={() => <Icon size={18} color={label === type ? colors.primary : colors.muted} />}
              trailingIcon={label === type ? () => <Check size={18} color={colors.primary} /> : undefined}
              onPress={() => {
                setType(label);
                setTypeMenuVisible(false);
              }}
            />
          ))}
        </Menu>
        {errors.type ? <Text style={styles.error}>{errors.type}</Text> : null}

        {selectedType ? (
          <>
            <TextInput label="Descrizione personalizzata" mode="outlined" value={customDescription} onChangeText={setCustomDescription} style={styles.fieldInput} />
            {errors.customDescription ? <Text style={styles.error}>{errors.customDescription}</Text> : null}
          </>
        ) : null}

        <Text style={[styles.sectionLabel, styles.detailsLabel]}>DETTAGLI INTERVENTO</Text>
        {Platform.OS === 'web' ? (
          <TextInput
            label="Data (AAAA-MM-GG)"
            mode="outlined"
            value={date}
            onChangeText={setDate}
            placeholder="2026-10-20"
            style={styles.fieldInput}
          />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Data intervento: ${formatDateLabel(date)}. Apri calendario.`}
              onPress={openDatePicker}
              style={styles.dateInputPressable}
            >
              <View pointerEvents="none">
                <TextInput
                  label="Data intervento"
                  mode="outlined"
                  value={formatDateLabel(date)}
                  editable={false}
                  style={styles.fieldInput}
                  right={(
                    <TextInput.Icon
                      icon={({ color, size }) => <CalendarDays size={size} color={color} />}
                    />
                  )}
                />
              </View>
            </Pressable>
            {Platform.OS === 'ios' ? (
              <Modal
                animationType="slide"
                transparent
                visible={datePickerVisible}
                onRequestClose={() => setDatePickerVisible(false)}
              >
                <View style={styles.modalBackdrop}>
                  <View style={styles.dateSheet}>
                    <View style={styles.dateSheetHeader}>
                      <Text style={styles.dateSheetTitle}>Seleziona la data</Text>
                      <Pressable onPress={() => setDatePickerVisible(false)}>
                        <Text style={styles.doneText}>Fine</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={fromDateValue(date)}
                      mode="date"
                      display="spinner"
                      locale="it-IT"
                      onValueChange={handleDateValueChange}
                    />
                  </View>
                </View>
              </Modal>
            ) : null}
          </>
        )}
        {errors.date ? <Text style={styles.error}>{errors.date}</Text> : null}

        <TextInput label="Chilometraggio" mode="outlined" value={mileage} onChangeText={setMileage} keyboardType="numeric" style={styles.fieldInput} />
        {errors.mileage ? <Text style={styles.error}>{errors.mileage}</Text> : null}

        <Text style={[styles.sectionLabel, styles.detailsLabel]}>COSTO E NOTE</Text>
        <TextInput label="Costo in euro" mode="outlined" value={cost} onChangeText={setCost} keyboardType="decimal-pad" style={styles.fieldInput} />
        {errors.cost ? <Text style={styles.error}>{errors.cost}</Text> : null}

        <TextInput label="Note facoltative" mode="outlined" value={notes} onChangeText={setNotes} multiline numberOfLines={3} maxLength={2000} style={styles.fieldInput} />
        {errors.notes ? <Text style={styles.error}>{errors.notes}</Text> : null}

        <ActionButton title="Salva" onPress={handleSave} style={styles.button} />
        <ActionButton title="Annulla" variant="secondary" onPress={() => navigation.goBack()} style={styles.button} />
      </View>
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
  eyebrow: {
    color: colors.primary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    marginTop: 8,
    marginBottom: 3,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginBottom: appSpacing.md,
    marginTop: 3,
  },
  vehicleSummary: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: appRadius.md,
    flexDirection: 'row',
    gap: appSpacing.sm,
    marginBottom: appSpacing.md,
    padding: appSpacing.sm,
  },
  vehicleIcon: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: appRadius.sm,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  vehicleCopy: {
    flex: 1,
    minWidth: 0,
  },
  vehicleName: {
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  vehicleMeta: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  mileageBadge: {
    alignItems: 'flex-end',
  },
  mileageLabel: {
    color: colors.muted,
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
  },
  mileageValue: {
    color: colors.primary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  formCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.md,
    borderWidth: 1,
    padding: appSpacing.md,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    marginBottom: appSpacing.sm,
  },
  sectionLabel: {
    color: colors.muted,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  detailsLabel: {
    marginTop: appSpacing.md,
  },
  dropdown: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: appSpacing.sm,
    minHeight: 52,
    paddingHorizontal: appSpacing.md,
    width: '100%',
  },
  dropdownText: {
    color: colors.text,
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  dateInputPressable: {
    width: '100%',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(10, 20, 14, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  dateSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: appRadius.lg,
    borderTopRightRadius: appRadius.lg,
    paddingBottom: appSpacing.xl,
    paddingHorizontal: appSpacing.md,
    paddingTop: appSpacing.md,
  },
  dateSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: appSpacing.xs,
  },
  dateSheetTitle: {
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
  },
  doneText: {
    color: colors.primary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    padding: appSpacing.sm,
  },
  fieldInput: {
    marginBottom: appSpacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
  },
  button: {
    marginTop: 12,
  },
});
