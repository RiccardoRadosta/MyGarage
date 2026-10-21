import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleAlert, Trash2 } from 'lucide-react-native';
import { ActionButton } from './ActionButton';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

export type AppDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'error' | 'danger';
  onConfirm?: () => void;
};

type AppDialogProps = AppDialogOptions & {
  visible: boolean;
  onDismiss: () => void;
};

export const AppDialog: React.FC<AppDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Chiudi',
  cancelLabel = 'Annulla',
  tone = 'error',
  onDismiss,
  onConfirm,
}) => {
  const colors = useAppColors();
  const styles = createStyles(colors);
  const Icon = tone === 'danger' ? Trash2 : CircleAlert;

  const handleConfirm = () => {
    onDismiss();
    onConfirm?.();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chiudi finestra"
          onPress={onDismiss}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityRole="alert" style={styles.card}>
          <View style={[styles.iconWrap, tone === 'danger' && styles.dangerIconWrap]}>
            <Icon size={22} color={tone === 'danger' ? colors.dangerStrong : colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {onConfirm ? (
              <>
                <ActionButton
                  title={cancelLabel}
                  variant="secondary"
                  onPress={onDismiss}
                  style={styles.actionButton}
                />
                <ActionButton
                  title={confirmLabel}
                  variant={tone === 'danger' ? 'danger' : 'primary'}
                  onPress={handleConfirm}
                  style={styles.actionButton}
                />
              </>
            ) : (
              <ActionButton title={confirmLabel} onPress={onDismiss} style={styles.singleAction} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: appSpacing.md,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.lg,
    borderWidth: 1,
    maxWidth: 420,
    padding: appSpacing.lg,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: appRadius.md,
    height: 48,
    justifyContent: 'center',
    marginBottom: appSpacing.md,
    width: 48,
  },
  dangerIconWrap: {
    backgroundColor: `${colors.dangerStrong}22`,
  },
  title: {
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 19,
  },
  message: {
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: appSpacing.sm,
    justifyContent: 'flex-end',
    marginTop: appSpacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  singleAction: {
    alignSelf: 'flex-end',
    minWidth: 110,
  },
});
