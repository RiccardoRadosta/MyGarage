import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Gauge, ShieldAlert } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog } from '../../components/common/AppDialog';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatMileage } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const PrimaryVehicleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { vehicles, setPrimaryVehicle, isSettingPrimary, primaryVehicleId } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  const [selectedId, setSelectedId] = useState<string | null>(primaryVehicleId ?? vehicles[0]?.id ?? null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedId) ?? null;
  }, [vehicles, selectedId]);

  const handleSelect = (id: string) => {
    if (isSubmitting || isSettingPrimary) return;
    setSelectedId(id);
  };

  const handleConfirmSelection = async () => {
    if (!selectedId || isSubmitting || isSettingPrimary) return;
    setIsSubmitting(true);
    try {
      await setPrimaryVehicle(selectedId);
      setIsConfirmOpen(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (err: any) {
      setIsConfirmOpen(false);
      setErrorMessage(
        err?.message || 'Impossibile confermare la selezione del veicolo principale. Riprova tra poco.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      {/* Intestazione */}
      <View style={styles.headerBlock}>
        <View style={styles.eyebrowRow}>
          <ShieldAlert size={14} color={colors.warning} strokeWidth={2.4} />
          <Text style={styles.eyebrow}>PIANO FREE · SCELTA OBBLIGATORIA</Text>
        </View>
        <Text style={styles.title}>Scegli il veicolo principale</Text>
        <Text style={styles.subtitle}>
          Il tuo piano Free consente di gestire interventi, modifiche e contachilometri per un solo veicolo.
          Seleziona quale veicolo mantenere attivo.
        </Text>
        <Text style={styles.noteText}>
          Tutti gli altri veicoli rimarranno memorizzati e consultabili nel tuo garage in qualsiasi momento.
        </Text>
      </View>

      {/* Lista di selezione veicoli */}
      <View style={styles.vehicleList}>
        {vehicles.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.brand} ${item.model}, targa ${item.plate}`}
              onPress={() => handleSelect(item.id)}
              disabled={isSubmitting || isSettingPrimary}
              style={({ pressed }) => [
                styles.vehicleCard,
                isSelected && styles.vehicleCardSelected,
                pressed && styles.vehicleCardPressed,
              ]}
            >
              <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                <VehicleIconView
                  icon={item.icon}
                  size={24}
                  color={isSelected ? colors.primary : colors.muted}
                />
              </View>

              <View style={styles.vehicleInfo}>
                <Text style={styles.modelName} numberOfLines={1}>
                  {item.brand} {item.model}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{item.year ? `Anno ${item.year}` : 'Veicolo'}</Text>
                  <View style={styles.mileageSnippet}>
                    <Gauge size={13} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.mileageText}>{formatMileage(item.mileage)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rightActionBlock}>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{item.plate}</Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Pulsanti di azione */}
      <View style={styles.actionBlock}>
        <ActionButton
          title="Conferma veicolo principale"
          onPress={() => setIsConfirmOpen(true)}
          disabled={!selectedId || isSubmitting || isSettingPrimary}
          loading={isSubmitting || isSettingPrimary}
          loadingTitle="Salvataggio in corso..."
          style={styles.confirmButton}
        />

        <ActionButton
          title="Consulta garage (sola lettura)"
          variant="secondary"
          onPress={() => navigation.navigate('MainTabs')}
          disabled={isSubmitting || isSettingPrimary}
        />
      </View>

      {/* Dialogo di conferma esplicita */}
      <AppDialog
        visible={isConfirmOpen}
        title="Conferma veicolo principale"
        message={
          selectedVehicle
            ? `Confermi di voler impostare "${selectedVehicle.brand} ${selectedVehicle.model}" (${selectedVehicle.plate}) come veicolo principale?\n\nSul piano Free potrai registrare e modificare interventi esclusivamente per questo veicolo.`
            : 'Confermi la selezione del veicolo principale?'
        }
        confirmLabel="Conferma e attiva"
        cancelLabel="Annulla"
        tone="info"
        onConfirm={() => void handleConfirmSelection()}
        onDismiss={() => {
          if (!isSubmitting) setIsConfirmOpen(false);
        }}
      />

      {/* Dialogo di errore */}
      <AppDialog
        visible={errorMessage !== null}
        title="Operazione non riuscita"
        message={errorMessage ?? ''}
        tone="danger"
        confirmLabel="Ho capito"
        onDismiss={() => setErrorMessage(null)}
      />
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerBlock: {
      marginBottom: appSpacing.lg,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    eyebrow: {
      ...appTypography.eyebrow,
      color: colors.warning,
      fontSize: 11,
      letterSpacing: 1.1,
    },
    title: {
      ...appTypography.title,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
      marginBottom: appSpacing.xs,
    },
    subtitle: {
      ...appTypography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
      marginBottom: appSpacing.xs,
    },
    noteText: {
      ...appTypography.caption,
      fontSize: 12,
      lineHeight: 17,
      color: colors.primary,
      fontFamily: 'Manrope_600SemiBold',
    },
    vehicleList: {
      gap: appSpacing.sm,
      marginBottom: appSpacing.xl,
    },
    vehicleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1.5,
      borderRadius: appRadius.lg,
      padding: appSpacing.md,
      ...appShadows.subtle,
    },
    vehicleCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    vehicleCardPressed: {
      opacity: 0.75,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: appRadius.md,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: appSpacing.md,
    },
    iconWrapSelected: {
      backgroundColor: colors.card,
    },
    vehicleInfo: {
      flex: 1,
      minWidth: 0,
      paddingRight: appSpacing.xs,
    },
    modelName: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
      marginBottom: 3,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metaText: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: 'Manrope_500Medium',
    },
    mileageSnippet: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    mileageText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      color: colors.text,
    },
    rightActionBlock: {
      alignItems: 'flex-end',
      gap: 8,
    },
    plateBadge: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: appRadius.xs,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    plateText: {
      fontSize: 11,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    radioCircle: {
      width: 24,
      height: 24,
      borderRadius: appRadius.full,
      borderColor: colors.border,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    radioCircleSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    actionBlock: {
      gap: appSpacing.sm,
      marginTop: 'auto',
      paddingBottom: appSpacing.md,
    },
    confirmButton: {
      marginBottom: 2,
    },
  });
