import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import {
  Battery,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  CircleDot,
  ClipboardCheck,
  Cog,
  Disc3,
  Droplet,
  Euro,
  FileText,
  Gauge,
  Image as ImageIcon,
  MoreHorizontal,
  Receipt,
  ShieldCheck,
  Trash2,
  Wind,
  X,
} from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { AttachmentSection } from '../../components/maintenance/AttachmentSection';
import { useApp } from '../../store/AppContext';
import { attachmentApi } from '../../services/api/api';
import { ApiError } from '../../services/api/ApiClient';
import { clearTemporaryAttachment } from '../../services/api/attachments';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import {
  AttachmentValidationError,
  formatFileSize,
  PickedAttachment,
  pickImageAttachment,
  pickPdfAttachment,
} from '../../utils/attachmentUtils';
import { formatMileage } from '../../utils/maintenance';
import { navigateToPremium } from '../../utils/navigationUtils';

type Props = NativeStackScreenProps<any>;

type MaintenanceCategory = 'MANUTENZIONE' | 'PAGAMENTI';

type MaintenanceOption = {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  category: MaintenanceCategory;
};

const maintenanceOptions: MaintenanceOption[] = [
  // Categoria MANUTENZIONE
  { label: 'Cambio olio', Icon: Droplet, category: 'MANUTENZIONE' },
  { label: 'Tagliando', Icon: ClipboardCheck, category: 'MANUTENZIONE' },
  { label: 'Freni / pastiglie', Icon: Disc3, category: 'MANUTENZIONE' },
  { label: 'Cambio gomme', Icon: CircleDot, category: 'MANUTENZIONE' },
  { label: 'Cambio tergicristalli', Icon: Wind, category: 'MANUTENZIONE' },
  { label: 'Revisione', Icon: ClipboardCheck, category: 'MANUTENZIONE' },
  { label: 'Batteria', Icon: Battery, category: 'MANUTENZIONE' },
  { label: 'Distribuzione', Icon: Cog, category: 'MANUTENZIONE' },
  // Categoria PAGAMENTI
  { label: 'Bollo', Icon: Receipt, category: 'PAGAMENTI' },
  { label: 'Assicurazione', Icon: ShieldCheck, category: 'PAGAMENTI' },
  // Altro (personalizzato)
  { label: 'Altro', Icon: MoreHorizontal, category: 'MANUTENZIONE' },
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
  const {
    vehicles,
    maintenanceRecords,
    addMaintenance,
    updateMaintenance,
    logout,
    setMaintenanceAttachmentState,
    requiresPrimarySelection,
    canWriteMaintenanceForVehicle,
    canManageAttachments,
    refreshPlan,
  } = useApp();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const existing = maintenanceRecords.find((item) => item.id === maintenanceId);
  const vehiclesById = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const targetVehicleId = vehicleId || existing?.vehicleId;
  const existingIsCustom = !!existing && !maintenanceOptions.some((option) => option.label === existing.type);

  const [type, setType] = useState(existingIsCustom ? 'Altro' : existing?.type ?? 'Cambio olio');
  const [date, setDate] = useState(existing?.date ?? toDateValue(new Date()));
  const [mileage, setMileage] = useState(existing?.mileage ? String(existing.mileage) : vehiclesById ? String(vehiclesById.mileage) : '0');
  const [cost, setCost] = useState(existing?.cost ? String(existing.cost) : '0');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [customDescription, setCustomDescription] = useState(existing?.customDescription ?? (existingIsCustom ? existing.type : ''));
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PickedAttachment | null>(null);
  const [savedMaintenanceId, setSavedMaintenanceId] = useState<string | undefined>(maintenanceId);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);
  const [errors, setErrors] = useState<{ type?: string; date?: string; mileage?: string; cost?: string; notes?: string; customDescription?: string }>({});

  useEffect(() => {
    if (requiresPrimarySelection) {
      navigation.navigate('PrimaryVehicleSelection');
      return;
    }

    if (targetVehicleId && !canWriteMaintenanceForVehicle(targetVehicleId)) {
      setDialog({
        tone: 'info',
        title: 'Veicolo in sola lettura',
        message:
          'Nel piano Free non è consentito aggiungere o modificare interventi su un veicolo secondario.',
        confirmLabel: 'Torna indietro',
        onConfirm: () => {
          setDialog(null);
          navigation.goBack();
        },
        onDismiss: () => {
          setDialog(null);
          navigation.goBack();
        },
      });
    }
  }, [requiresPrimarySelection, targetVehicleId, canWriteMaintenanceForVehicle]);

  const savingRef = useRef(false);
  const attachmentUploadRef = useRef<(() => Promise<boolean>) | null>(null);

  const setPendingAttachmentUpload = useCallback((upload: (() => Promise<boolean>) | null) => {
    attachmentUploadRef.current = upload;
  }, []);

  const selectedType = type === 'Altro';
  const selectedMaintenanceOption = maintenanceOptions.find((option) => option.label === type) ?? maintenanceOptions[0];

  const inputTheme = useMemo(
    () => ({
      colors: {
        primary: colors.primary,
        background: colors.card,
        error: colors.danger,
        onSurface: colors.text,
        onSurfaceVariant: colors.muted,
        outline: colors.border,
      },
    }),
    [colors],
  );

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

  const handlePickPending = async (source: 'camera' | 'library' | 'pdf') => {
    if (picking || saving) return;
    if (!canManageAttachments) {
      setDialog({
        tone: 'info',
        title: 'Funzionalità Premium',
        message: 'Il caricamento di ricevute e documenti di spesa è riservato agli utenti Premium.',
        confirmLabel: 'Scopri Premium',
        cancelLabel: 'Chiudi',
        onConfirm: () => {
          setDialog(null);
          navigateToPremium(navigation);
        },
      });
      return;
    }
    setPicking(true);
    try {
      const picked = source === 'pdf'
        ? await pickPdfAttachment()
        : await pickImageAttachment(source);
      if (picked) {
        clearTemporaryAttachment(pendingAttachment);
        setPendingAttachment(picked);
      }
    } catch (err) {
      const message = err instanceof AttachmentValidationError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Errore nella selezione del file.';
      setDialog({ title: 'Selezione non riuscita', message, tone: 'danger' });
    } finally {
      setPicking(false);
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return;

    if (requiresPrimarySelection) {
      navigation.navigate('PrimaryVehicleSelection');
      return;
    }

    if (targetVehicleId && !canWriteMaintenanceForVehicle(targetVehicleId)) {
      setDialog({
        tone: 'info',
        title: 'Veicolo in sola lettura',
        message:
          'Nel piano Free non è consentito aggiungere o modificare interventi su un veicolo secondario.',
        confirmLabel: 'Torna indietro',
        onConfirm: () => {
          setDialog(null);
          navigation.goBack();
        },
      });
      return;
    }

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

    savingRef.current = true;
    let savedMaintenanceIdForUpload = savedMaintenanceId;
    let maintenanceSaved = false;
    if (__DEV__) {
      console.info('[Manutenzione] salvataggio avviato', {
        mode: mode ?? 'create',
        attachmentSelected: Boolean(pendingAttachment || attachmentUploadRef.current),
        maintenanceId: savedMaintenanceId ?? null,
      });
    }
    try {
      setSaving(true);
      if (savedMaintenanceId && existing) {
        await updateMaintenance({ ...existing, ...payload });
      } else if (savedMaintenanceId) {
        await updateMaintenance({ id: savedMaintenanceId, ...payload });
      } else {
        const created = await addMaintenance(payload);
        savedMaintenanceIdForUpload = created.id;
        setSavedMaintenanceId(created.id);
      }
      maintenanceSaved = true;
      if (__DEV__) {
        console.info('[Manutenzione] dati salvati', {
          maintenanceId: savedMaintenanceIdForUpload ?? existing?.id ?? null,
          attachmentSelected: Boolean(pendingAttachment || attachmentUploadRef.current),
        });
      }

      if (pendingAttachment) {
        if (!savedMaintenanceIdForUpload) {
          throw new Error('Intervento salvato, ma il server non ha restituito il suo identificativo. L’allegato è ancora selezionato: riprova.');
        }
        if (__DEV__) {
          console.info('[Manutenzione] avvio upload allegato', { maintenanceId: savedMaintenanceIdForUpload, source: 'form' });
        }
        await attachmentApi.upload(savedMaintenanceIdForUpload, pendingAttachment);
        clearTemporaryAttachment(pendingAttachment);
        setPendingAttachment(null);
        setMaintenanceAttachmentState(savedMaintenanceIdForUpload, true);
      } else if (attachmentUploadRef.current) {
        if (__DEV__) {
          console.info('[Manutenzione] avvio upload allegato', {
            maintenanceId: savedMaintenanceIdForUpload ?? existing?.id ?? maintenanceId ?? null,
            source: 'AttachmentSection',
          });
        }
        const uploaded = await attachmentUploadRef.current();
        if (!uploaded) return;
      }

      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PRIMARY_VEHICLE_SELECTION_REQUIRED') {
        void refreshPlan();
        setDialog({
          tone: 'info',
          title: 'Scelta obbligatoria',
          message: 'È necessario selezionare prima il veicolo principale.',
          confirmLabel: 'Seleziona veicolo',
          onConfirm: () => {
            setDialog(null);
            navigation.navigate('PrimaryVehicleSelection');
          },
        });
        return;
      }
      if (error instanceof ApiError && error.code === 'UPGRADE_REQUIRED') {
        void refreshPlan();
        setDialog({
          tone: 'info',
          title: 'Funzionalità Premium',
          message: error.message || 'Questa operazione richiede un piano Premium.',
          confirmLabel: 'Scopri Premium',
          cancelLabel: 'Chiudi',
          onConfirm: () => {
            setDialog(null);
            navigateToPremium(navigation);
          },
        });
        return;
      }
      if (maintenanceSaved && pendingAttachment) {
        if (error instanceof ApiError && error.status === 401) void logout();
        setDialog({
          title: 'Intervento salvato, allegato non caricato',
          message: `${error instanceof Error ? error.message : 'Il caricamento non è riuscito.'} Puoi riprovare con il pulsante Carica allegato.`,
        });
      } else {
        setDialog({ title: 'Salvataggio non riuscito', message: error instanceof Error ? error.message : 'Riprova tra poco.' });
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleUploadPending = async () => {
    if (!pendingAttachment || !savedMaintenanceId || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await attachmentApi.upload(savedMaintenanceId, pendingAttachment);
      clearTemporaryAttachment(pendingAttachment);
      setPendingAttachment(null);
      setMaintenanceAttachmentState(savedMaintenanceId, true);
      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) void logout();
      setDialog({
        title: 'Caricamento non riuscito',
        message: `L’intervento è salvato, ma l’allegato non è stato caricato. ${error instanceof Error ? error.message : 'Riprova.'}`,
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDateValueChange = (_event: DateTimePickerChangeEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(toDateValue(selectedDate));
      if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
    }
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
      {/* Intestazione di Contesto */}
      <ScreenContextHeader
        label={mode === 'edit' ? 'MODIFICA INTERVENTO' : 'REGISTRA INTERVENTO'}
        onBack={() => navigation.goBack()}
      />

      {/* Titolo Principale ed Eyebrow */}
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>
          {mode === 'edit' ? 'AGGIORNA REGISTRO' : 'NUOVO INTERVENTO'}
        </Text>
        <Text style={styles.title}>
          {mode === 'edit' ? 'Modifica intervento' : 'Registra intervento'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'edit'
            ? 'Aggiorna i dettagli, i costi o l’allegato dell’intervento.'
            : 'Aggiungi i dettagli del lavoro svolto, i costi e l’eventuale ricevuta.'}
        </Text>
      </View>

      {/* Card Riepilogo Veicolo Associato */}
      {vehiclesById ? (
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleTopRow}>
            <View style={styles.vehicleIconWrap}>
              <VehicleIconView icon={vehiclesById.icon} size={24} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.vehicleCopy}>
              <Text style={styles.vehicleName} numberOfLines={1}>
                {vehiclesById.brand} {vehiclesById.model}
              </Text>
              <Text style={styles.vehicleMeta}>
                {vehiclesById.year ? `Anno ${vehiclesById.year}` : 'Veicolo registrato'}
              </Text>
            </View>
          </View>

          <View style={styles.vehicleDivider} />

          <View style={styles.vehicleBottomRow}>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{vehiclesById.plate || 'SENZA TARGA'}</Text>
            </View>
            <View style={styles.mileageSnippet}>
              <Gauge size={14} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.mileageSnippetText}>
                {formatMileage(vehiclesById.mileage)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Sezione A — Dati Intervento */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>DATI DELL’INTERVENTO</Text>

        <Text style={styles.inputLabel}>Tipologia di intervento</Text>
        <Pressable
          style={[
            styles.dropdownTrigger,
            errors.type ? styles.inputErrorBorder : null,
          ]}
          onPress={() => setTypeSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Seleziona tipologia di intervento"
        >
          <View style={styles.dropdownLeft}>
            <View style={styles.dropdownIconWrap}>
              <selectedMaintenanceOption.Icon size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.dropdownText}>{type}</Text>
          </View>
          <ChevronDown size={18} color={colors.muted} />
        </Pressable>
        {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}

        {selectedType ? (
          <View style={styles.customTypeContainer}>
            <TextInput
              label="Descrizione personalizzata *"
              mode="outlined"
              value={customDescription}
              onChangeText={(val) => {
                setCustomDescription(val);
                if (errors.customDescription) setErrors((prev) => ({ ...prev, customDescription: undefined }));
              }}
              maxLength={100}
              error={!!errors.customDescription}
              theme={inputTheme}
              style={styles.fieldInput}
            />
            <View style={styles.counterRow}>
              {errors.customDescription ? (
                <Text style={styles.errorText}>{errors.customDescription}</Text>
              ) : <View />}
              <Text style={styles.counterText}>{customDescription.length} / 100</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.inputSpacing}>
          <Text style={styles.inputLabel}>Data intervento</Text>
          <Pressable onPress={openDatePicker} style={styles.dateInputPressable}>
            <View pointerEvents="none">
              <TextInput
                label="Data"
                mode="outlined"
                value={formatDateLabel(date)}
                editable={false}
                left={<TextInput.Icon icon={() => <CalendarDays size={18} color={colors.primary} />} />}
                error={!!errors.date}
                theme={inputTheme}
                style={styles.fieldInput}
              />
            </View>
          </Pressable>
          {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
        </View>
      </View>

      {/* Sezione B — Chilometraggio, Costi e Note */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>CHILOMETRAGGIO E SPESA</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            label="Chilometraggio del veicolo *"
            mode="outlined"
            value={mileage}
            onChangeText={(val) => {
              setMileage(val);
              if (errors.mileage) setErrors((prev) => ({ ...prev, mileage: undefined }));
            }}
            keyboardType="numeric"
            left={<TextInput.Icon icon={() => <Gauge size={18} color={colors.primary} strokeWidth={2} />} />}
            right={<TextInput.Affix text="km" textStyle={styles.affixText} />}
            error={!!errors.mileage}
            theme={inputTheme}
            style={styles.fieldInput}
          />
          {errors.mileage ? <Text style={styles.errorText}>{errors.mileage}</Text> : null}
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            label="Costo dell'intervento *"
            mode="outlined"
            value={cost}
            onChangeText={(val) => {
              setCost(val);
              if (errors.cost) setErrors((prev) => ({ ...prev, cost: undefined }));
            }}
            keyboardType="decimal-pad"
            left={<TextInput.Icon icon={() => <Euro size={18} color={colors.primary} strokeWidth={2} />} />}
            right={<TextInput.Affix text="€" textStyle={styles.affixText} />}
            error={!!errors.cost}
            theme={inputTheme}
            style={styles.fieldInput}
          />
          {errors.cost ? <Text style={styles.errorText}>{errors.cost}</Text> : null}
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            label="Note e dettagli facoltativi"
            mode="outlined"
            value={notes}
            onChangeText={(val) => {
              setNotes(val);
              if (errors.notes) setErrors((prev) => ({ ...prev, notes: undefined }));
            }}
            multiline
            numberOfLines={3}
            maxLength={2000}
            error={!!errors.notes}
            theme={inputTheme}
            style={styles.multilineInput}
          />
          <View style={styles.counterRow}>
            {errors.notes ? <Text style={styles.errorText}>{errors.notes}</Text> : <View />}
            <Text style={styles.counterText}>{notes.length} / 2000</Text>
          </View>
        </View>
      </View>

      {/* Sezione C — Documentazione e Ricevuta */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>RICEVUTA O FATTURA</Text>
        <Text style={styles.sectionSubtitle}>
          Allega copia del documento di spesa (PDF o JPEG, max 5 MB).
        </Text>

        {!canManageAttachments ? (
          mode === 'edit' && existing?.hasAttachment ? (
            <AttachmentSection
              maintenanceId={existing.id}
              hasAttachmentInitial={existing.hasAttachment}
              readOnly
            />
          ) : (
            <View style={styles.premiumAttachmentCard}>
              <View style={styles.premiumAttachmentIconWrap}>
                <FileText size={20} color={colors.primary} />
              </View>
              <Text style={styles.premiumAttachmentText}>
                Il caricamento di ricevute e fatture PDF o foto è una funzionalità riservata agli utenti Premium.
              </Text>
              <ActionButton
                title="Scopri Premium"
                variant="secondary"
                size="compact"
                onPress={() => navigateToPremium(navigation)}
              />
            </View>
          )
        ) : mode === 'edit' && existing ? (
          <AttachmentSection
            maintenanceId={existing.id}
            hasAttachmentInitial={existing.hasAttachment}
            savingMaintenance={saving}
            onPendingUploadChange={setPendingAttachmentUpload}
            onAttachmentDeleted={() => {
              setMaintenanceAttachmentState(existing.id, false);
            }}
          />
        ) : (
          <View style={styles.pendingSection}>
            {pendingAttachment ? (
              <View style={styles.pendingCard}>
                <View style={styles.pendingInfoRow}>
                  <View style={styles.pendingIconWrap}>
                    {pendingAttachment.type === 'application/pdf' ? (
                      <FileText size={26} color={colors.primary} strokeWidth={2} />
                    ) : (
                      <Image source={{ uri: pendingAttachment.uri }} style={styles.pendingThumbnail} />
                    )}
                  </View>
                  <View style={styles.pendingMeta}>
                    <Text style={styles.pendingFileName} numberOfLines={1}>
                      {pendingAttachment.name}
                    </Text>
                    <View style={styles.pendingTypeRow}>
                      <View style={styles.pendingTypeBadge}>
                        <Text style={styles.pendingTypeBadgeText}>
                          {pendingAttachment.type === 'application/pdf' ? 'PDF' : 'JPEG'}
                        </Text>
                      </View>
                      <Text style={styles.pendingFileSize}>
                        {formatFileSize(pendingAttachment.size)}
                      </Text>
                    </View>
                  </View>
                </View>
                <ActionButton
                  title="Rimuovi allegato"
                  icon={<Trash2 size={16} color={colors.danger} style={{ marginRight: 6 }} />}
                  variant="secondary"
                  size="compact"
                  onPress={() => {
                    clearTemporaryAttachment(pendingAttachment);
                    setPendingAttachment(null);
                  }}
                  disabled={saving || picking}
                  style={styles.pendingRemoveBtn}
                />
              </View>
            ) : (
              <View style={styles.attachmentButtonsContainer}>
                <View style={styles.attachmentButtonsRow}>
                  <ActionButton
                    title="Fotocamera"
                    icon={<Camera size={16} color={colors.primary} style={{ marginRight: 6 }} />}
                    variant="secondary"
                    size="compact"
                    onPress={() => void handlePickPending('camera')}
                    loading={picking}
                    disabled={saving}
                    style={styles.attachmentGridBtn}
                  />
                  <ActionButton
                    title="Galleria"
                    icon={<ImageIcon size={16} color={colors.primary} style={{ marginRight: 6 }} />}
                    variant="secondary"
                    size="compact"
                    onPress={() => void handlePickPending('library')}
                    loading={picking}
                    disabled={saving}
                    style={styles.attachmentGridBtn}
                  />
                </View>
                <ActionButton
                  title="Documento PDF"
                  icon={<FileText size={16} color={colors.primary} style={{ marginRight: 6 }} />}
                  variant="secondary"
                  size="compact"
                  fullWidth
                  onPress={() => void handlePickPending('pdf')}
                  loading={picking}
                  disabled={saving}
                  style={styles.attachmentPdfBtn}
                />
              </View>
            )}

            {pendingAttachment && savedMaintenanceId ? (
              <ActionButton
                title="Carica allegato"
                loading={saving}
                loadingTitle="Caricamento in corso..."
                disabled={picking}
                onPress={() => void handleUploadPending()}
                style={styles.pendingUploadRetryBtn}
              />
            ) : null}

            {pendingAttachment && !savedMaintenanceId ? (
              <Text style={styles.attachmentHint}>
                L’allegato verrà caricato automaticamente al salvataggio dell’intervento.
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {/* Blocco Azioni Inferiore */}
      <View style={styles.actionBlock}>
        <ActionButton
          title={
            saving
              ? 'Salvataggio in corso...'
              : mode === 'edit'
                ? 'Salva modifiche'
                : 'Salva intervento'
          }
          onPress={handleSave}
          disabled={saving || picking}
          loading={saving}
          loadingTitle="Salvataggio in corso..."
          fullWidth
          style={styles.saveBtn}
        />
        <ActionButton
          title="Annulla"
          variant="secondary"
          onPress={() => navigation.goBack()}
          disabled={saving || picking}
          fullWidth
          style={styles.cancelBtn}
        />
      </View>

      {/* Modal DatePicker per iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="fade"
          visible={datePickerVisible}
          onRequestClose={() => setDatePickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dateSheet}>
              <View style={styles.dateSheetHeader}>
                <Text style={styles.dateSheetTitle}>Seleziona data</Text>
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
      )}

      {/* Dialog Unificato */}
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        tone={dialog?.tone}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm}
        onDismiss={() => {
          const dismissCb = dialog?.onDismiss;
          setDialog(null);
          dismissCb?.();
        }}
      />

      {/* Bottom Sheet Selezione Tipologia Intervento */}
      <Modal
        visible={typeSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setTypeSheetVisible(false)}
        >
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            {/* Maniglia decorativa del Bottom Sheet */}
            <View style={styles.sheetHandle} />

            {/* Intestazione del Bottom Sheet */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleWrap}>
                <Text style={styles.sheetTitle}>Seleziona tipologia</Text>
                <Text style={styles.sheetSubtitle}>Scegli la categoria del lavoro o del pagamento</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chiudi selezione tipologia"
                onPress={() => setTypeSheetVisible(false)}
                style={({ pressed }) => [styles.sheetCloseButton, pressed && styles.sheetCloseButtonPressed]}
              >
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>

            {/* Lista Scrollabile Divisa per Categorie */}
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Sezione: MANUTENZIONE */}
              <View style={styles.sheetCategoryHeader}>
                <Text style={styles.sheetCategoryTitle}>MANUTENZIONE</Text>
              </View>
              {maintenanceOptions
                .filter((opt) => opt.category === 'MANUTENZIONE')
                .map((option) => {
                  const isSelected = type === option.label;
                  return (
                    <Pressable
                      key={option.label}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={option.label}
                      onPress={() => {
                        setType(option.label);
                        setTypeSheetVisible(false);
                        if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
                      }}
                      style={({ pressed }) => [
                        styles.sheetItem,
                        isSelected && styles.sheetItemSelected,
                        pressed && styles.sheetItemPressed,
                      ]}
                    >
                      <View style={styles.sheetItemLeft}>
                        <View style={[styles.sheetItemIconWrap, isSelected && styles.sheetItemIconWrapSelected]}>
                          <option.Icon
                            size={18}
                            color={isSelected ? colors.primary : colors.muted}
                            strokeWidth={isSelected ? 2.4 : 1.8}
                          />
                        </View>
                        <Text style={[styles.sheetItemText, isSelected && styles.sheetItemTextSelected]}>
                          {option.label}
                        </Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.sheetCheckWrap}>
                          <Check size={18} color={colors.primary} strokeWidth={2.8} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}

              {/* Sezione: PAGAMENTI */}
              <View style={[styles.sheetCategoryHeader, styles.sheetCategoryHeaderSpacing]}>
                <Text style={styles.sheetCategoryTitle}>PAGAMENTI</Text>
              </View>
              {maintenanceOptions
                .filter((opt) => opt.category === 'PAGAMENTI')
                .map((option) => {
                  const isSelected = type === option.label;
                  return (
                    <Pressable
                      key={option.label}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={option.label}
                      onPress={() => {
                        setType(option.label);
                        setTypeSheetVisible(false);
                        if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
                      }}
                      style={({ pressed }) => [
                        styles.sheetItem,
                        isSelected && styles.sheetItemSelected,
                        pressed && styles.sheetItemPressed,
                      ]}
                    >
                      <View style={styles.sheetItemLeft}>
                        <View style={[styles.sheetItemIconWrap, isSelected && styles.sheetItemIconWrapSelected]}>
                          <option.Icon
                            size={18}
                            color={isSelected ? colors.primary : colors.muted}
                            strokeWidth={isSelected ? 2.4 : 1.8}
                          />
                        </View>
                        <Text style={[styles.sheetItemText, isSelected && styles.sheetItemTextSelected]}>
                          {option.label}
                        </Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.sheetCheckWrap}>
                          <Check size={18} color={colors.primary} strokeWidth={2.8} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerBlock: {
      marginTop: appSpacing.xs,
      marginBottom: appSpacing.md,
    },
    eyebrow: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      marginBottom: 4,
    },
    title: {
      ...appTypography.title,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
    },
    subtitle: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 3,
    },

    /* Card Riepilogo Veicolo */
    vehicleCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    vehicleTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    vehicleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: appRadius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: appSpacing.sm + 2,
    },
    vehicleCopy: {
      flex: 1,
      minWidth: 0,
    },
    vehicleName: {
      ...appTypography.cardTitle,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      color: colors.text,
    },
    vehicleMeta: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    vehicleDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: appSpacing.sm,
    },
    vehicleBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.xs,
    },
    plateBadge: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: appRadius.sm,
      borderWidth: 1.5,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 3,
    },
    plateText: {
      color: colors.text,
      fontSize: 12,
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    mileageSnippet: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: appRadius.sm,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 4,
    },
    mileageSnippetText: {
      ...appTypography.caption,
      color: colors.text,
      fontFamily: 'Manrope_700Bold',
      fontSize: 12,
    },

    /* Sezioni Form */
    sectionCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    sectionTitle: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      marginBottom: 2,
      letterSpacing: 0.8,
    },
    sectionSubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      marginBottom: appSpacing.md,
    },
    inputLabel: {
      ...appTypography.caption,
      color: colors.text,
      fontFamily: 'Manrope_700Bold',
      fontSize: 12,
      marginBottom: 6,
    },

    /* Selettore Dropdown */
    dropdownTrigger: {
      minHeight: 52,
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.sm,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: appSpacing.md,
    },
    dropdownLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      flex: 1,
      marginRight: appSpacing.sm,
    },
    dropdownIconWrap: {
      width: 32,
      height: 32,
      borderRadius: appRadius.xs,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownText: {
      color: colors.text,
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 14,
      flex: 1,
    },
    inputErrorBorder: {
      borderColor: colors.danger,
    },

    /* Bottom Sheet Selezione Tipologia */
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 35, 0.55)',
      justifyContent: 'flex-end',
    },
    sheetCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderTopWidth: 1,
      borderTopLeftRadius: appRadius.xl,
      borderTopRightRadius: appRadius.xl,
      maxHeight: '75%',
      paddingTop: appSpacing.xs,
      paddingBottom: Platform.OS === 'ios' ? appSpacing.xl : appSpacing.lg,
      ...appShadows.card,
      elevation: 10,
    },
    sheetHandle: {
      width: 38,
      height: 4,
      borderRadius: appRadius.full,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 6,
      marginBottom: appSpacing.xs,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: appSpacing.lg,
      paddingVertical: appSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetTitleWrap: {
      flex: 1,
      marginRight: appSpacing.sm,
    },
    sheetTitle: {
      ...appTypography.title,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
    },
    sheetSubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
      fontFamily: 'Manrope_500Medium',
    },
    sheetCloseButton: {
      padding: appSpacing.xs,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
    },
    sheetCloseButtonPressed: {
      opacity: 0.7,
    },
    sheetScroll: {
      paddingHorizontal: appSpacing.lg,
    },
    sheetScrollContent: {
      paddingTop: appSpacing.md,
      paddingBottom: appSpacing.lg,
    },
    sheetCategoryHeader: {
      marginBottom: appSpacing.xs,
      paddingHorizontal: 4,
    },
    sheetCategoryHeaderSpacing: {
      marginTop: appSpacing.md,
    },
    sheetCategoryTitle: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 1.1,
      fontFamily: 'Manrope_800ExtraBold',
    },
    sheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: appSpacing.sm,
      borderRadius: appRadius.md,
      marginVertical: 2,
    },
    sheetItemSelected: {
      backgroundColor: colors.primarySoft,
    },
    sheetItemPressed: {
      opacity: 0.75,
      backgroundColor: colors.primarySoft,
    },
    sheetItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.md,
      flex: 1,
    },
    sheetItemIconWrap: {
      width: 36,
      height: 36,
      borderRadius: appRadius.sm,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetItemIconWrapSelected: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    sheetItemText: {
      ...appTypography.body,
      fontSize: 15,
      color: colors.text,
      fontFamily: 'Manrope_600SemiBold',
      flex: 1,
    },
    sheetItemTextSelected: {
      color: colors.primary,
      fontFamily: 'Manrope_800ExtraBold',
    },
    sheetCheckWrap: {
      width: 28,
      height: 28,
      borderRadius: appRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: appSpacing.xs,
    },

    /* Campi Input Generali */
    customTypeContainer: {
      marginTop: appSpacing.sm,
    },
    inputSpacing: {
      marginTop: appSpacing.md,
    },
    inputWrapper: {
      marginBottom: appSpacing.sm,
    },
    fieldInput: {
      backgroundColor: colors.card,
    },
    multilineInput: {
      backgroundColor: colors.card,
      minHeight: 88,
    },
    affixText: {
      fontFamily: 'Manrope_700Bold',
      color: colors.muted,
      fontSize: 13,
    },
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      paddingHorizontal: 2,
    },
    counterText: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 11,
      fontFamily: 'Manrope_500Medium',
      marginLeft: 'auto',
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontFamily: 'Manrope_600SemiBold',
      marginTop: 4,
    },

    /* Date Picker */
    dateInputPressable: {
      width: '100%',
    },
    modalBackdrop: {
      backgroundColor: 'rgba(15, 23, 35, 0.45)',
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
      marginBottom: appSpacing.sm,
    },
    dateSheetTitle: {
      color: colors.text,
      fontFamily: 'Manrope_700Bold',
      fontSize: 16,
    },
    doneText: {
      color: colors.primary,
      fontFamily: 'Manrope_700Bold',
      fontSize: 15,
      padding: appSpacing.xs,
    },

    /* Allegati in Creazione */
    pendingSection: {
      marginTop: appSpacing.xs,
    },
    attachmentButtonsContainer: {
      gap: appSpacing.sm,
    },
    attachmentButtonsRow: {
      flexDirection: 'row',
      gap: appSpacing.sm,
    },
    attachmentGridBtn: {
      flex: 1,
    },
    attachmentPdfBtn: {
      marginTop: 0,
    },
    pendingCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: appRadius.md,
      borderWidth: 1,
      padding: appSpacing.md,
    },
    pendingInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.md,
    },
    pendingIconWrap: {
      width: 48,
      height: 48,
      borderRadius: appRadius.sm,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    pendingThumbnail: {
      width: 48,
      height: 48,
      borderRadius: appRadius.sm,
    },
    pendingMeta: {
      flex: 1,
      minWidth: 0,
    },
    pendingFileName: {
      color: colors.text,
      fontFamily: 'Manrope_700Bold',
      fontSize: 13,
      lineHeight: 18,
    },
    pendingTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    pendingTypeBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: appRadius.xs,
    },
    pendingTypeBadgeText: {
      color: colors.primary,
      fontFamily: 'Manrope_700Bold',
      fontSize: 10,
    },
    pendingFileSize: {
      color: colors.muted,
      fontFamily: 'Manrope_500Medium',
      fontSize: 11,
    },
    pendingRemoveBtn: {
      marginTop: appSpacing.md,
    },
    pendingUploadRetryBtn: {
      marginTop: appSpacing.sm,
    },
    attachmentHint: {
      color: colors.muted,
      fontFamily: 'Manrope_500Medium',
      fontSize: 11,
      marginTop: appSpacing.sm,
      textAlign: 'center',
    },

    /* Blocco Azioni */
    actionBlock: {
      marginTop: appSpacing.sm,
      marginBottom: appSpacing.xl,
      gap: appSpacing.sm,
    },
    saveBtn: {
      marginBottom: 0,
    },
    cancelBtn: {
      marginTop: 0,
    },
    premiumAttachmentCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: appRadius.md,
      padding: appSpacing.md,
      alignItems: 'center',
      gap: appSpacing.sm,
      marginVertical: appSpacing.xs,
    },
    premiumAttachmentIconWrap: {
      width: 40,
      height: 40,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumAttachmentText: {
      ...appTypography.body,
      color: colors.muted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
