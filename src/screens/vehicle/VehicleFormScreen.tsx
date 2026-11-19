import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays, Check, Gauge, Search, X } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { VehicleIconView, vehicleIconOptions } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { ApiError } from '../../services/api/ApiClient';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { VehicleIconId } from '../../types';
import { formatMileage } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

const MIN_YEAR = 1900;

export const normalizePlate = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
};

export const getCanonicalPlate = (value: string): string => {
  return value.replace(/[\s-]/g, '').toUpperCase();
};

export const VehicleFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { addVehicle, updateVehicle, vehicles } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  const currentYear = new Date().getFullYear();

  const mode = route.params?.mode ?? 'create';
  const vehicleId = route.params?.vehicleId;
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  const [brand, setBrand] = useState(vehicle?.brand ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [year, setYear] = useState(vehicle?.year ? String(vehicle.year) : '');
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [mileage, setMileage] = useState(vehicle?.mileage ? String(vehicle.mileage) : '');
  const [vehicleIcon, setVehicleIcon] = useState<VehicleIconId>(vehicle?.icon ?? 'carFront');

  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [yearSearch, setYearSearch] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);
  const [errors, setErrors] = useState<{
    brand?: string;
    model?: string;
    year?: string;
    plate?: string;
    mileage?: string;
  }>({});

  const isMileageMode = mode === 'mileage';
  const isDetailsMode = mode === 'edit';

  const screenTitle = isMileageMode
    ? 'Aggiorna chilometraggio'
    : isDetailsMode
      ? `Modifica ${vehicle ? `${vehicle.brand} ${vehicle.model}` : 'veicolo'}`
      : 'Aggiungi al garage';

  const screenSubtitle = isMileageMode
    ? 'Registra il valore corrente del contachilometri.'
    : isDetailsMode
      ? 'Aggiorna le informazioni principali o la tipologia del veicolo.'
      : 'Inserisci i dati del mezzo per iniziare a registrare manutenzioni e spese.';

  const screenContextLabel = isMileageMode
    ? 'CHILOMETRAGGIO'
    : isDetailsMode
      ? 'MODIFICA VEICOLO'
      : 'NUOVO VEICOLO';

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

  const allYears = useMemo(() => {
    return Array.from({ length: currentYear - MIN_YEAR + 1 }, (_, i) => currentYear - i);
  }, [currentYear]);

  const visibleYears = useMemo(() => {
    const trimmed = yearSearch.trim();
    if (!trimmed) return allYears;
    return allYears.filter((item) => String(item).includes(trimmed));
  }, [allYears, yearSearch]);

  const handleSelectYear = (selected: number) => {
    setYear(String(selected));
    setYearPickerVisible(false);
    setYearSearch('');
    if (errors.year) {
      setErrors((prev) => ({ ...prev, year: undefined }));
    }
  };

  const handleSave = async () => {
    if (mode !== 'create' && !vehicle) {
      setDialog({
        title: 'Veicolo non trovato',
        message: 'Torna al garage e seleziona di nuovo il veicolo.',
        tone: 'danger',
      });
      return;
    }

    const nextErrors: typeof errors = {};

    const trimmedBrand = brand.trim().replace(/\s+/g, ' ');
    const trimmedModel = model.trim().replace(/\s+/g, ' ');
    const cleanedPlate = normalizePlate(plate);
    const cleanedMileage = mileage.trim();
    const numericMileage = Number(cleanedMileage);

    if (!isMileageMode) {
      // 1. Validazione Marca
      if (!trimmedBrand) {
        nextErrors.brand = 'Inserisci la marca del veicolo.';
      } else if (trimmedBrand.length > 80) {
        nextErrors.brand = 'La marca può contenere al massimo 80 caratteri.';
      }

      // 2. Validazione Modello
      if (!trimmedModel) {
        nextErrors.model = 'Inserisci il modello del veicolo.';
      } else if (trimmedModel.length > 100) {
        nextErrors.model = 'Il modello può contenere al massimo 100 caratteri.';
      }

      // 3. Validazione Anno
      const numericYear = Number(year.trim());
      if (!year.trim()) {
        nextErrors.year = 'Seleziona l\'anno di immatricolazione.';
      } else if (
        !Number.isInteger(numericYear) ||
        numericYear < MIN_YEAR ||
        numericYear > currentYear
      ) {
        nextErrors.year = `Seleziona un anno valido tra il ${MIN_YEAR} e il ${currentYear}.`;
      }

      // 4. Validazione Targa
      if (!cleanedPlate) {
        nextErrors.plate = 'Inserisci la targa.';
      } else if (!/^[A-Z0-9 -]+$/.test(cleanedPlate)) {
        nextErrors.plate = 'La targa contiene caratteri non ammessi (usa solo lettere, numeri, trattini e spazi).';
      } else if (!/^[A-Z0-9]/.test(cleanedPlate) || !/[A-Z0-9]$/.test(cleanedPlate)) {
        nextErrors.plate = 'La targa non può iniziare o terminare con spazi o trattini.';
      } else if (cleanedPlate.length < 2) {
        nextErrors.plate = 'La targa deve contenere almeno 2 caratteri.';
      } else if (cleanedPlate.length > 20) {
        nextErrors.plate = 'La targa può contenere al massimo 20 caratteri.';
      } else {
        // Controllo unicità targa per il medesimo proprietario
        const canonical = getCanonicalPlate(cleanedPlate);
        const isDuplicate = vehicles.some((item) => {
          if (isDetailsMode && item.id === vehicle?.id) return false;
          return getCanonicalPlate(item.plate) === canonical;
        });

        if (isDuplicate) {
          nextErrors.plate = 'Un veicolo con questa targa è già presente nel garage.';
        }
      }
    }

    // 5. Validazione Chilometraggio
    if (!isDetailsMode) {
      if (!cleanedMileage) {
        nextErrors.mileage = 'Inserisci il chilometraggio.';
      } else if (cleanedMileage.includes('-')) {
        nextErrors.mileage = 'Il chilometraggio non può essere negativo.';
      } else if (cleanedMileage.includes('.') || cleanedMileage.includes(',')) {
        nextErrors.mileage = 'Inserisci un numero intero senza decimali.';
      } else if (!/^\d+$/.test(cleanedMileage)) {
        nextErrors.mileage = 'Inserisci solo cifre numeriche intere.';
      } else if (!Number.isSafeInteger(numericMileage) || numericMileage > 2000000) {
        nextErrors.mileage = 'Inserisci un chilometraggio verosimile (max 2.000.000 km).';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const executeSave = async () => {
      setIsSaving(true);
      try {
        if (isMileageMode && vehicle) {
          await updateVehicle({ ...vehicle, mileage: numericMileage });
        } else if (isDetailsMode && vehicle) {
          await updateVehicle({
            ...vehicle,
            brand: trimmedBrand,
            icon: vehicleIcon,
            model: trimmedModel,
            year: Number(year.trim()),
            plate: cleanedPlate,
          });
        } else {
          await addVehicle({
            brand: trimmedBrand,
            icon: vehicleIcon,
            model: trimmedModel,
            year: Number(year.trim()),
            plate: cleanedPlate,
            mileage: numericMileage,
          });
        }

        navigation.goBack();
      } catch (error) {
        let title = 'Salvataggio non riuscito';
        let message = 'Riprova tra poco.';

        if (error instanceof ApiError) {
          const isDuplicatePlate =
            error.status === 409 ||
            error.code === 'DUPLICATE_PLATE' ||
            error.code === 'PLATE_ALREADY_EXISTS' ||
            error.fieldErrors?.some(
              (fe) =>
                fe.field === 'plate' &&
                (fe.code.includes('DUPLICATE') || fe.code.includes('EXISTS')),
            ) ||
            error.message.toLowerCase().includes('targa') ||
            error.message.toLowerCase().includes('plate');

          if (isDuplicatePlate) {
            title = 'Targa già registrata';
            message = 'Un veicolo con questa targa è già presente nel tuo garage.';
            setErrors((prev) => ({
              ...prev,
              plate: 'Targa già associata a un altro veicolo.',
            }));
          } else if (error.fieldErrors && error.fieldErrors.length > 0) {
            const serverErrors: typeof errors = {};
            error.fieldErrors.forEach((fe) => {
              if (fe.field === 'brand') serverErrors.brand = fe.message;
              if (fe.field === 'model') serverErrors.model = fe.message;
              if (fe.field === 'year') serverErrors.year = fe.message;
              if (fe.field === 'plate') serverErrors.plate = fe.message;
              if (fe.field === 'mileage') serverErrors.mileage = fe.message;
            });
            setErrors((prev) => ({ ...prev, ...serverErrors }));
            title = 'Dati non validi';
            message = error.message || 'Verifica i campi evidenziati in rosso.';
          } else {
            message = error.message;
          }
        } else if (error instanceof Error) {
          message = error.message;
        }

        setDialog({
          title,
          message,
          tone: 'danger',
        });
      } finally {
        setIsSaving(false);
      }
    };

    if (isMileageMode && vehicle && numericMileage < vehicle.mileage) {
      setDialog({
        title: 'Chilometraggio inferiore',
        message: `Il valore inserito (${formatMileage(numericMileage)}) è inferiore a quello attualmente registrato (${formatMileage(vehicle.mileage)}).\n\nConfermi di voler correggere il chilometraggio del veicolo?`,
        tone: 'info',
        confirmLabel: 'Conferma e salva',
        cancelLabel: 'Annulla',
        onConfirm: () => {
          void executeSave();
        },
      });
      return;
    }

    await executeSave();
  };

  return (
    <ScreenShell>
      <View style={styles.formContainer}>
        {/* Intestazione di Contesto */}
        <ScreenContextHeader
          label={screenContextLabel}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
          <Text style={styles.title}>{screenTitle}</Text>
          <Text style={styles.subtitle}>{screenSubtitle}</Text>
        </View>

        {/* Modalità Chilometraggio: Card valore attuale */}
        {isMileageMode && vehicle ? (
          <View style={styles.currentMileageCard}>
            <View style={styles.mileageIconWrap}>
              <Gauge size={22} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.mileageCopy}>
              <Text style={styles.currentMileageLabel}>Ultimo chilometraggio registrato</Text>
              <Text style={styles.currentMileageValue}>
                {formatMileage(vehicle.mileage)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Card Principale Form */}
        <View style={styles.formCard}>
          {!isMileageMode ? (
            <>
              {/* Selezione Icona / Tipo di Veicolo */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Tipo di veicolo</Text>
                <View style={styles.iconOptionsGrid}>
                  {vehicleIconOptions.map(({ id, label }) => {
                    const selected = vehicleIcon === id;
                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${label}${id === 'car' ? ' laterale' : ''}`}
                        onPress={() => setVehicleIcon(id)}
                        style={({ pressed }) => [
                          styles.iconOption,
                          selected && styles.iconOptionSelected,
                          pressed && styles.iconOptionPressed,
                        ]}
                      >
                        <View style={styles.iconOptionInner}>
                          <VehicleIconView
                            icon={id}
                            size={22}
                            color={selected ? colors.primary : colors.muted}
                            strokeWidth={selected ? 2.2 : 1.8}
                          />
                          <Text
                            style={[
                              styles.iconOptionLabel,
                              selected && styles.iconOptionLabelSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {id === 'car' ? 'SUV' : label}
                          </Text>
                        </View>
                        {selected ? (
                          <View style={styles.selectedBadge}>
                            <Check size={10} color={colors.white} strokeWidth={3} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Marca */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  label="Marca"
                  mode="outlined"
                  value={brand}
                  onChangeText={(val) => {
                    setBrand(val);
                    if (errors.brand) setErrors((prev) => ({ ...prev, brand: undefined }));
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={80}
                  returnKeyType="next"
                  error={!!errors.brand}
                  theme={{
                    colors: {
                      primary: colors.primary,
                      background: colors.card,
                      error: colors.danger,
                    },
                  }}
                />
                {errors.brand ? <Text style={styles.errorText}>{errors.brand}</Text> : null}
              </View>

              {/* Modello */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  label="Modello"
                  mode="outlined"
                  value={model}
                  onChangeText={(val) => {
                    setModel(val);
                    if (errors.model) setErrors((prev) => ({ ...prev, model: undefined }));
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={100}
                  returnKeyType="next"
                  error={!!errors.model}
                  theme={{
                    colors: {
                      primary: colors.primary,
                      background: colors.card,
                      error: colors.danger,
                    },
                  }}
                />
                {errors.model ? <Text style={styles.errorText}>{errors.model}</Text> : null}
              </View>

              {/* Anno e Targa affiancati su 2 colonne bilanciate */}
              <View style={styles.splitRow}>
                {/* Selettore Anno Guidato */}
                <View style={styles.splitLeft}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      year
                        ? `Anno di immatricolazione: ${year}. Tocca per modificare.`
                        : 'Seleziona anno di immatricolazione'
                    }
                    onPress={() => setYearPickerVisible(true)}
                    style={({ pressed }) => [
                      styles.yearPickerTrigger,
                      errors.year ? styles.yearPickerTriggerError : null,
                      pressed ? styles.yearPickerTriggerPressed : null,
                    ]}
                  >
                    <View style={styles.yearPickerContent}>
                      <Text style={styles.yearPickerLabel}>Anno</Text>
                      <Text
                        style={[
                          styles.yearPickerValue,
                          !year ? styles.yearPickerPlaceholder : null,
                        ]}
                        numberOfLines={1}
                      >
                        {year || 'Seleziona'}
                      </Text>
                    </View>
                    <CalendarDays
                      size={18}
                      color={errors.year ? colors.danger : colors.muted}
                      strokeWidth={2}
                    />
                  </Pressable>
                  {errors.year ? <Text style={styles.errorText}>{errors.year}</Text> : null}
                </View>

                {/* Targa con normalizzazione e auto-capitalizzazione */}
                <View style={styles.splitRight}>
                  <TextInput
                    style={styles.input}
                    label="Targa"
                    mode="outlined"
                    value={plate}
                    onChangeText={(val) => {
                      const sanitized = val.replace(/[\x00-\x1F\x7F]/g, '').toUpperCase();
                      setPlate(sanitized);
                      if (errors.plate) setErrors((prev) => ({ ...prev, plate: undefined }));
                    }}
                    onBlur={() => {
                      setPlate((current) => current.trim().replace(/\s+/g, ' '));
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={20}
                    returnKeyType={isDetailsMode ? 'done' : 'next'}
                    error={!!errors.plate}
                    theme={{
                      colors: {
                        primary: colors.primary,
                        background: colors.card,
                        error: colors.danger,
                      },
                    }}
                  />
                  {errors.plate ? <Text style={styles.errorText}>{errors.plate}</Text> : null}
                </View>
              </View>
            </>
          ) : null}

          {/* Chilometraggio (visibile in creazione e in aggiornamento km) */}
          {!isDetailsMode ? (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                label={isMileageMode ? 'Nuovo chilometraggio (km)' : 'Chilometraggio attuale (km)'}
                mode="outlined"
                value={mileage}
                onChangeText={(val) => {
                  setMileage(val);
                  if (errors.mileage) setErrors((prev) => ({ ...prev, mileage: undefined }));
                }}
                keyboardType="numeric"
                returnKeyType="done"
                error={!!errors.mileage}
                theme={{
                  colors: {
                    primary: colors.primary,
                    background: colors.card,
                    error: colors.danger,
                  },
                }}
              />
              {errors.mileage ? <Text style={styles.errorText}>{errors.mileage}</Text> : null}
            </View>
          ) : null}

          {/* Azioni del form */}
          <View style={styles.actionsBlock}>
            <ActionButton
              title={
                isMileageMode
                  ? 'Aggiorna chilometraggio'
                  : isDetailsMode
                    ? 'Salva dettagli'
                    : 'Salva veicolo'
              }
              loading={isSaving}
              loadingTitle="Salvataggio..."
              onPress={handleSave}
              disabled={isSaving}
              style={styles.mainButton}
            />

            <ActionButton
              title="Annulla"
              variant="secondary"
              disabled={isSaving}
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            />
          </View>
        </View>
      </View>

      {/* Modal Selettore Anno */}
      <Modal
        visible={yearPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setYearPickerVisible(false);
          setYearSearch('');
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setYearPickerVisible(false);
            setYearSearch('');
          }}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>Anno di immatricolazione</Text>
                <Text style={styles.modalSubtitle}>
                  Seleziona l'anno del veicolo ({MIN_YEAR} – {currentYear})
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chiudi selettore anno"
                onPress={() => {
                  setYearPickerVisible(false);
                  setYearSearch('');
                }}
                style={styles.modalCloseButton}
              >
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>

            {/* Barra di ricerca rapida anno */}
            <View style={styles.modalSearchWrapper}>
              <Search size={16} color={colors.muted} style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Cerca anno (es. 2018)"
                placeholderTextColor={colors.muted}
                value={yearSearch}
                onChangeText={setYearSearch}
                keyboardType="number-pad"
                maxLength={4}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                theme={{
                  colors: {
                    background: 'transparent',
                    text: colors.text,
                    primary: colors.primary,
                  },
                }}
              />
              {yearSearch ? (
                <Pressable onPress={() => setYearSearch('')} style={styles.modalSearchClear}>
                  <X size={14} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            {/* Lista anni con scorrimento rapido ed efficiente */}
            <FlatList
              data={visibleYears}
              keyExtractor={(item) => String(item)}
              initialNumToRender={18}
              maxToRenderPerBatch={24}
              windowSize={7}
              getItemLayout={(_, index) => ({
                length: 48,
                offset: 48 * index,
                index,
              })}
              contentContainerStyle={styles.yearListContent}
              renderItem={({ item }) => {
                const isSelected = String(item) === year;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleSelectYear(item)}
                    style={({ pressed }) => [
                      styles.yearItem,
                      isSelected && styles.yearItemSelected,
                      pressed && styles.yearItemPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearItemText,
                        isSelected && styles.yearItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected ? (
                      <View style={styles.yearItemBadge}>
                        <Check size={14} color={colors.white} strokeWidth={2.8} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.yearListEmpty}>
                  <Text style={styles.yearListEmptyText}>Nessun anno trovato</Text>
                </View>
              }
            />

            {/* Pulsante Annulla footer */}
            <View style={styles.modalFooter}>
              <ActionButton
                title="Chiudi"
                variant="secondary"
                onPress={() => {
                  setYearPickerVisible(false);
                  setYearSearch('');
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Dialog Modale per Errori / Avvisi */}
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

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    formContainer: {
      alignSelf: 'center',
      maxWidth: 520,
      width: '100%',
    },
    headerBlock: {
      marginBottom: appSpacing.lg,
      marginTop: appSpacing.xs,
    },
    eyebrow: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    title: {
      ...appTypography.display,
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    subtitle: {
      ...appTypography.body,
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
      lineHeight: 18,
    },
    currentMileageCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      gap: appSpacing.md,
      ...appShadows.subtle,
    },
    mileageIconWrap: {
      width: 44,
      height: 44,
      borderRadius: appRadius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mileageCopy: {
      flex: 1,
    },
    currentMileageLabel: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: 'Manrope_600SemiBold',
    },
    currentMileageValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      marginTop: 2,
    },
    formCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      ...appShadows.subtle,
    },
    fieldSection: {
      marginBottom: appSpacing.sm,
    },
    fieldLabel: {
      ...appTypography.eyebrow,
      color: colors.muted,
      fontSize: 11,
      letterSpacing: 0.8,
      marginBottom: appSpacing.xs,
    },
    iconOptionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: appSpacing.xs,
      justifyContent: 'space-between',
      marginBottom: appSpacing.xs,
    },
    iconOption: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.md,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 66,
      width: '31%',
      position: 'relative',
    },
    iconOptionInner: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconOptionSelected: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
      borderWidth: 1.5,
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
      fontFamily: 'Manrope_700Bold',
    },
    selectedBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 16,
      height: 16,
      borderRadius: appRadius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputWrapper: {
      marginBottom: appSpacing.sm,
    },
    input: {
      backgroundColor: colors.card,
    },
    splitRow: {
      flexDirection: 'row',
      gap: appSpacing.sm,
      marginBottom: appSpacing.sm,
    },
    splitLeft: {
      flex: 4,
    },
    splitRight: {
      flex: 6,
    },
    yearPickerTrigger: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 4,
      borderWidth: 1,
      minHeight: 52,
      paddingHorizontal: appSpacing.sm + 2,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    yearPickerTriggerError: {
      borderColor: colors.danger,
    },
    yearPickerTriggerPressed: {
      backgroundColor: colors.primarySoft,
    },
    yearPickerContent: {
      flex: 1,
      justifyContent: 'center',
    },
    yearPickerLabel: {
      fontSize: 10,
      color: colors.muted,
      fontFamily: 'Manrope_600SemiBold',
      marginBottom: 1,
    },
    yearPickerValue: {
      fontSize: 15,
      color: colors.text,
      fontFamily: 'Manrope_600SemiBold',
    },
    yearPickerPlaceholder: {
      color: colors.muted,
      fontFamily: 'Manrope_400Regular',
      fontSize: 14,
    },
    errorText: {
      color: colors.danger,
      fontSize: 11,
      fontFamily: 'Manrope_600SemiBold',
      marginTop: 3,
      marginLeft: 4,
    },
    actionsBlock: {
      marginTop: appSpacing.sm,
      gap: appSpacing.xs,
    },
    mainButton: {
      marginTop: 2,
    },
    cancelButton: {
      marginTop: 0,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: appSpacing.md,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.xl,
      borderWidth: 1,
      width: '100%',
      maxWidth: 380,
      maxHeight: '80%',
      padding: appSpacing.md,
      ...appShadows.card,
      elevation: 6,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: appSpacing.sm,
    },
    modalTitleWrap: {
      flex: 1,
      marginRight: appSpacing.xs,
    },
    modalTitle: {
      ...appTypography.title,
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    modalSubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      marginTop: 2,
    },
    modalCloseButton: {
      padding: appSpacing.xs,
      borderRadius: appRadius.full,
    },
    modalSearchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: appRadius.md,
      paddingHorizontal: appSpacing.sm,
      marginBottom: appSpacing.sm,
      height: 42,
    },
    modalSearchIcon: {
      marginRight: appSpacing.xs,
    },
    modalSearchInput: {
      flex: 1,
      height: 40,
      fontSize: 14,
      paddingHorizontal: 0,
    },
    modalSearchClear: {
      padding: 4,
    },
    yearListContent: {
      paddingVertical: 2,
    },
    yearItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 48,
      paddingHorizontal: appSpacing.md,
      borderRadius: appRadius.md,
      marginVertical: 1,
    },
    yearItemSelected: {
      backgroundColor: colors.primarySoft,
    },
    yearItemPressed: {
      opacity: 0.7,
    },
    yearItemText: {
      ...appTypography.body,
      fontSize: 16,
      color: colors.text,
      fontFamily: 'Manrope_600SemiBold',
    },
    yearItemTextSelected: {
      color: colors.primary,
      fontFamily: 'Manrope_800ExtraBold',
    },
    yearItemBadge: {
      width: 22,
      height: 22,
      borderRadius: appRadius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yearListEmpty: {
      paddingVertical: appSpacing.xl,
      alignItems: 'center',
    },
    yearListEmptyText: {
      ...appTypography.body,
      color: colors.muted,
      fontSize: 13,
    },
    modalFooter: {
      marginTop: appSpacing.sm,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingTop: appSpacing.xs,
    },
  });
