import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { VehicleIconView, vehicleIconOptions } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { VehicleIconId } from '../../types';

type Props = NativeStackScreenProps<any>;

export const VehicleFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { addVehicle, updateVehicle, vehicles } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const mode = route.params?.mode ?? 'create';
  const vehicleId = route.params?.vehicleId;
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  const [brand, setBrand] = useState(vehicle?.brand ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [year, setYear] = useState(vehicle?.year ? String(vehicle.year) : '');
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [mileage, setMileage] = useState(vehicle?.mileage ? String(vehicle.mileage) : '');
  const [vehicleIcon, setVehicleIcon] = useState<VehicleIconId>(vehicle?.icon ?? 'carFront');
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);
  const [errors, setErrors] = useState<{ brand?: string; model?: string; year?: string; plate?: string; mileage?: string }>({});
  const isMileageMode = mode === 'mileage';
  const isDetailsMode = mode === 'edit';
  const screenTitle = isMileageMode
    ? 'Aggiorna chilometraggio'
    : isDetailsMode
      ? 'Modifica dettagli veicolo'
      : 'Aggiungi al garage';

  useEffect(() => {
    if (vehicle) {
      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setYear(String(vehicle.year));
      setPlate(vehicle.plate);
      setMileage(String(vehicle.mileage));
      setVehicleIcon(vehicle.icon);
    }
  }, [vehicle]);

  const handleSave = async () => {
    if (mode !== 'create' && !vehicle) {
      setDialog({ title: 'Veicolo non trovato', message: 'Torna al garage e seleziona di nuovo il veicolo.' });
      return;
    }

    const nextErrors: typeof errors = {};
    if (!isMileageMode && !brand.trim()) nextErrors.brand = 'Inserisci la marca.';
    if (!isMileageMode && !model.trim()) nextErrors.model = 'Inserisci il modello.';
    if (!isMileageMode && !year.trim()) nextErrors.year = 'Inserisci l\'anno.';
    if (!isMileageMode && !plate.trim()) nextErrors.plate = 'Inserisci la targa.';
    if (!isMileageMode && brand.trim().length > 80) nextErrors.brand = 'La marca può contenere al massimo 80 caratteri.';
    if (!isMileageMode && model.trim().length > 100) nextErrors.model = 'Il modello può contenere al massimo 100 caratteri.';
    const numericYear = Number(year);
    if (!isMileageMode && year.trim() && (!Number.isInteger(numericYear) || numericYear < 1886 || numericYear > new Date().getFullYear() + 1)) {
      nextErrors.year = `Inserisci un anno tra 1886 e ${new Date().getFullYear() + 1}.`;
    }
    if (!isMileageMode && plate.trim().length > 32) nextErrors.plate = 'La targa può contenere al massimo 32 caratteri.';
    if (!isDetailsMode && !mileage.trim()) nextErrors.mileage = 'Inserisci il chilometraggio.';
    if (!isDetailsMode && Number(mileage) < 0) nextErrors.mileage = 'Il chilometraggio non può essere negativo.';
    if (!isDetailsMode && mileage.trim() && (!Number.isInteger(Number(mileage)) || !Number.isFinite(Number(mileage)))) {
      nextErrors.mileage = 'Inserisci un chilometraggio intero.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      if (isMileageMode && vehicle) {
        await updateVehicle({ ...vehicle, mileage: Number(mileage) });
      } else if (isDetailsMode && vehicle) {
        await updateVehicle({
          ...vehicle,
          brand: brand.trim(),
          icon: vehicleIcon,
          model: model.trim(),
          year: Number(year),
          plate: plate.trim().toUpperCase(),
        });
      } else {
        await addVehicle({
          brand: brand.trim(),
          icon: vehicleIcon,
          model: model.trim(),
          year: Number(year),
          plate: plate.trim().toUpperCase(),
          mileage: Number(mileage),
        });
      }

      navigation.goBack();
    } catch (error) {
      setDialog({ title: 'Salvataggio non riuscito', message: error instanceof Error ? error.message : 'Riprova tra poco.' });
    }
  };

  return (
    <ScreenShell contentStyle={isMileageMode ? undefined : styles.screenContent}>
      <View style={styles.formColumn}>
        <ScreenContextHeader
          label={isMileageMode ? 'CHILOMETRAGGIO' : isDetailsMode ? 'DETTAGLI VEICOLO' : 'NUOVO VEICOLO'}
          onBack={() => navigation.goBack()}
        />
        <View style={isMileageMode ? styles.internalIntro : styles.intro}>
          {!isMileageMode ? (
            <View style={styles.iconWrap}>
              <VehicleIconView icon={vehicleIcon} size={24} color={colors.primary} />
            </View>
          ) : null}
          <Text style={styles.eyebrow}>{isMileageMode ? 'CHILOMETRAGGIO ATTUALE' : isDetailsMode ? 'IL TUO GARAGE' : 'NUOVO VEICOLO'}</Text>
          <Text style={[styles.title, isMileageMode && styles.internalTitle]}>{screenTitle}</Text>
          <Text style={[styles.subtitle, isMileageMode && styles.internalSubtitle]}>
            {isMileageMode
              ? 'Registra il valore attuale del contachilometri.'
              : isDetailsMode
                ? 'Aggiorna marca, modello, anno, targa o icona.'
                : 'Dati essenziali per il registro del veicolo.'}
          </Text>
        </View>

        {isMileageMode && vehicle ? (
          <View style={styles.currentMileage}>
            <Text style={styles.currentMileageLabel}>Ultimo chilometraggio registrato</Text>
            <Text style={styles.currentMileageValue}>{vehicle.mileage.toLocaleString('it-IT')} km</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
        {!isMileageMode ? (
          <>
        <Text style={styles.fieldLabel}>Tipo di veicolo</Text>
        <View style={styles.iconOptions}>
          {vehicleIconOptions.map(({ id, label }) => {
            const selected = vehicleIcon === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${label}${id === 'car' ? ' laterale' : ''}`}
                onPress={() => setVehicleIcon(id)}
                style={({ pressed }) => [styles.iconOption, selected && styles.iconOptionSelected, pressed && styles.iconOptionPressed]}
              >
                <VehicleIconView icon={id} size={22} color={selected ? colors.primary : colors.muted} />
                <Text style={[styles.iconOptionLabel, selected && styles.iconOptionLabelSelected]}>{id === 'car' ? 'SUV' : label}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput style={styles.input} label="Marca" mode="outlined" value={brand} onChangeText={setBrand} error={!!errors.brand} />
        {errors.brand ? <Text style={styles.error}>{errors.brand}</Text> : null}

        <TextInput style={styles.input} label="Modello" mode="outlined" value={model} onChangeText={setModel} error={!!errors.model} />
        {errors.model ? <Text style={styles.error}>{errors.model}</Text> : null}

        <TextInput style={styles.input} label="Anno" mode="outlined" value={year} onChangeText={setYear} keyboardType="numeric" error={!!errors.year} />
        {errors.year ? <Text style={styles.error}>{errors.year}</Text> : null}

        <TextInput style={styles.input} label="Targa" mode="outlined" value={plate} onChangeText={setPlate} autoCapitalize="characters" error={!!errors.plate} />
        {errors.plate ? <Text style={styles.error}>{errors.plate}</Text> : null}
          </>
        ) : null}

        {!isDetailsMode ? (
          <>
            <TextInput
              style={styles.input}
              label={isMileageMode ? 'Nuovo chilometraggio' : 'Chilometraggio attuale'}
              mode="outlined"
              value={mileage}
              onChangeText={setMileage}
              keyboardType="numeric"
              error={!!errors.mileage}
            />
            {errors.mileage ? <Text style={styles.error}>{errors.mileage}</Text> : null}
          </>
        ) : null}

        <ActionButton title={isMileageMode ? 'Aggiorna chilometraggio' : isDetailsMode ? 'Salva dettagli' : 'Salva veicolo'} onPress={handleSave} style={styles.button} />
        <ActionButton title="Annulla" variant="secondary" onPress={() => navigation.goBack()} style={styles.button} />
        </View>
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
  screenContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formColumn: {
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
  intro: {
    alignItems: 'center',
    marginBottom: appSpacing.lg,
  },
  internalIntro: {
    alignItems: 'flex-start',
    marginBottom: appSpacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: appRadius.md,
    height: 52,
    justifyContent: 'center',
    marginBottom: appSpacing.sm,
    width: 52,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'Manrope_800ExtraBold',
  },
  internalTitle: {
    textAlign: 'left',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  internalSubtitle: {
    marginBottom: 0,
    textAlign: 'left',
  },
  formCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.md,
    borderWidth: 1,
    padding: appSpacing.md,
  },
  fieldLabel: {
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    marginBottom: appSpacing.sm,
  },
  currentMileage: {
    backgroundColor: colors.primarySoft,
    borderRadius: appRadius.sm,
    marginBottom: appSpacing.md,
    padding: appSpacing.md,
  },
  currentMileageLabel: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  currentMileageValue: {
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
    marginTop: 4,
  },
  iconOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.xs,
    justifyContent: 'space-between',
    marginBottom: appSpacing.md,
  },
  iconOption: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 68,
    width: '31%',
  },
  iconOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  iconOptionPressed: {
    opacity: 0.82,
  },
  iconOptionLabel: {
    color: colors.muted,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    marginTop: 4,
  },
  iconOptionLabelSelected: {
    color: colors.primary,
  },
  input: {
    marginBottom: appSpacing.sm,
  },
  error: {
    color: colors.danger,
    marginTop: 6,
    marginBottom: 8,
    fontSize: 12,
  },
  button: {
    marginTop: appSpacing.sm,
  },
});
