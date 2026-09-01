import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../core/theme/spacing';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export const ConfirmationDialog = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'saffron', // 'saffron' | 'maroon'
  loading = false,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialogCard, shadows.prominent]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.actions}>
            <SecondaryButton
              title={cancelText}
              onPress={onCancel}
              style={styles.cancelBtn}
            />
            <PrimaryButton
              title={confirmText}
              onPress={onConfirm}
              loading={loading}
              variant={confirmVariant}
              style={styles.confirmBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(33, 25, 27, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    marginVertical: 0,
  },
  confirmBtn: {
    flex: 1,
    marginVertical: 0,
    height: 48,
  },
});
