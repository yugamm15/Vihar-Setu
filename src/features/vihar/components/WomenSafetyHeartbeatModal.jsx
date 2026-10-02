import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import {
  WomenSafetyShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../../../shared/components/CustomSvgIcons';

export const WomenSafetyHeartbeatModal = ({
  visible,
  countdownSeconds = 120,
  onConfirmSafe,
  onTriggerEmergency,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Non-dismissable without explicit response
    >
      <View style={styles.overlay}>
        <View style={[styles.card, shadows.elevated]}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <WomenSafetyShieldIcon size={36} color={colors.gold} />
          </View>

          {/* Titles */}
          <Text style={styles.title}>Women Safety Check-In</Text>
          <Text style={styles.subtitle}>
            Pujya Sadhviji Bhagwant & Sevikas Safety Verification
          </Text>

          {/* Countdown Warning Box */}
          <View style={styles.countdownBox}>
            <Text style={styles.countdownLabel}>AUTO-ESCALATION IN</Text>
            <Text style={styles.countdownTimer}>{countdownSeconds}s</Text>
            <Text style={styles.countdownNote}>
              If unacknowledged, an emergency alert will be automatically broadcasted to the Super Admin Control Room.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.btnCol}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onConfirmSafe}
              style={[styles.safeBtn, shadows.subtle]}
            >
              <CheckCircleIcon size={20} color="#FFFFFF" />
              <Text style={styles.safeBtnText}>YES, WE ARE SAFE & ON TRACK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onTriggerEmergency}
              style={styles.emergencyBtn}
            >
              <AlertTriangleIcon size={18} color="#FFFFFF" />
              <Text style={styles.emergencyBtnText}>TRIGGER IMMEDIATE SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  countdownBox: {
    backgroundColor: '#FFF8E7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.gold,
    marginBottom: spacing.lg,
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.deepMaroon,
    letterSpacing: 1,
    marginBottom: 2,
  },
  countdownTimer: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.statusEmergency,
    marginBottom: 4,
  },
  countdownNote: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  btnCol: {
    width: '100%',
    gap: spacing.sm,
  },
  safeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  safeBtnText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.statusEmergency,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  emergencyBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
