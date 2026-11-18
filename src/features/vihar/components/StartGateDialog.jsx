import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';

export const StartGateDialog = ({
  visible,
  distanceMeters,
  thresholdMeters = 100,
  accuracyMeters = 10,
  sourceName = 'Starting Point',
  isWaitingGps = false,
  onNavigateToStart,
  onUseCurrentLocation,
  onCheckAgain,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialogCard, shadows.elevated]}>
          {/* Warning Icon Badge */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📍</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isWaitingGps ? 'Acquiring GPS Signal' : 'Start Point Verification'}
          </Text>

          {/* Message */}
          {isWaitingGps ? (
            <Text style={styles.bodyText}>
              Waiting for high-accuracy GPS fix (current: ±{Math.round(accuracyMeters)}m, required: ≤50m). Please hold your device steady with a clear view of the sky.
            </Text>
          ) : (
            <>
              <Text style={styles.bodyText}>
                You are currently <Text style={styles.highlight}>{Math.round(distanceMeters)} meters</Text> away from the selected starting point ({sourceName}).
              </Text>
              <Text style={styles.subText}>
                To ensure sacred safety protocols and accurate live tracking for Sevikas and Sadhviji Bhagwants, Vihar can only be started when physically present at the starting point (within {thresholdMeters}m).
              </Text>
            </>
          )}

          {/* Action Buttons */}
          <View style={styles.btnCol}>
            {isWaitingGps ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={onCheckAgain}>
                <Text style={styles.primaryBtnText}>Retry GPS Check</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={onNavigateToStart}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryBtnText}>🧭 Navigate to Start Point</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={onUseCurrentLocation}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryBtnText}>📍 Set Current Location as Start</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={onCheckAgain}
                  activeOpacity={0.8}
                >
                  <Text style={styles.outlineBtnText}>🔄 Check Distance Again</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
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
    backgroundColor: 'rgba(21, 17, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderColor: colors.saffron,
    borderWidth: 1.5,
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  bodyText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  highlight: {
    color: colors.statusEmergency,
    fontWeight: '800',
  },
  subText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  btnCol: {
    width: '100%',
    gap: spacing.xs,
  },
  primaryBtn: {
    backgroundColor: colors.saffron,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.warmIvory,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.saffron,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  secondaryBtnText: {
    ...typography.button,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  outlineBtnText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
