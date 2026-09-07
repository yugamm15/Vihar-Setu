import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../core/theme/spacing';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import {
  JainEmblemIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  CloseIcon,
} from './CustomSvgIcons';

export const CustomAlertModal = ({
  visible,
  title,
  message,
  type = 'INFO', // 'JINENDRA' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO' | 'CONFIRM'
  confirmText = 'OK',
  cancelText,
  confirmVariant = 'saffron', // 'saffron' | 'primary' | 'emergency'
  onConfirm,
  onCancel,
  onClose,
}) => {
  if (!visible) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onClose) onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'JINENDRA':
        return (
          <View style={[styles.iconCircle, { backgroundColor: colors.softCream }]}>
            <JainEmblemIcon size={40} color={colors.gold} secondaryColor={colors.deepMaroon} />
          </View>
        );
      case 'SUCCESS':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
            <CheckCircleIcon size={32} color={colors.statusSafe} />
          </View>
        );
      case 'WARNING':
      case 'CONFIRM':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#FFF3CD' }]}>
            <AlertTriangleIcon size={32} color={colors.statusWarning} />
          </View>
        );
      case 'ERROR':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
            <AlertTriangleIcon size={32} color={colors.statusEmergency} />
          </View>
        );
      case 'INFO':
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#FFF8E7' }]}>
            <InfoIcon size={32} color={colors.saffronDark} />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={cancelText ? handleCancel : handleConfirm}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialogCard, shadows.elevated]}>
              {/* Close Icon Top-Right */}
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CloseIcon size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Centered Top Sacred / Status Icon */}
              <View style={styles.iconContainer}>{getIcon()}</View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Body Message */}
              {message ? <Text style={styles.message}>{message}</Text> : null}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {cancelText ? (
                  <SecondaryButton
                    title={cancelText}
                    onPress={handleCancel}
                    style={styles.halfBtn}
                  />
                ) : null}

                <PrimaryButton
                  title={confirmText}
                  onPress={handleConfirm}
                  variant={confirmVariant}
                  style={cancelText ? styles.halfBtn : styles.fullBtn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 6, 10, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  fullBtn: {
    flex: 1,
  },
  halfBtn: {
    flex: 1,
  },
});
