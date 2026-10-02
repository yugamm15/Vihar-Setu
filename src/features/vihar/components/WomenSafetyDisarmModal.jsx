import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import {
  CheckCircleIcon,
  ShieldIcon,
  CloseIcon,
} from '../../../shared/components/CustomSvgIcons';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';

const PRESET_REASONS = [
  'Accidental SOS Press • Sadhviji & Sevika Safe',
  'Threat Passed • Walking Safely on Route',
  'Arrived Safely at Upashray',
  'Assistance Received from Local Sangha',
];

export const WomenSafetyDisarmModal = ({
  visible,
  onConfirmDisarm,
  onCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customNotes, setCustomNotes] = useState('');

  if (!visible) return null;

  const handleConfirm = () => {
    const finalReason = customNotes.trim()
      ? `${selectedReason} - ${customNotes.trim()}`
      : selectedReason;
    onConfirmDisarm(finalReason);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, shadows.elevated]}>
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <CheckCircleIcon size={24} color={colors.statusSafe} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>Disarm Emergency SOS</Text>
              <Text style={styles.subtitle}>
                Confirm safety before de-escalating alert
              </Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>SELECT DISARM REASON *</Text>
          <View style={styles.reasonsList}>
            {PRESET_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[
                    styles.reasonItem,
                    isSelected && styles.reasonItemActive,
                  ]}
                >
                  <View style={styles.radioDot}>
                    {isSelected ? <View style={styles.radioDotInner} /> : null}
                  </View>
                  <Text
                    style={[
                      styles.reasonText,
                      isSelected && styles.reasonTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>OPTIONAL NOTES FOR ADMIN AUDIT</Text>
          <TextInput
            value={customNotes}
            onChangeText={setCustomNotes}
            placeholder="e.g. False alarm by mistake, Sadhviji safe"
            placeholderTextColor={colors.textMuted}
            style={styles.notesInput}
          />

          <View style={styles.btnRow}>
            <SecondaryButton
              title="Keep Active"
              onPress={onCancel}
              style={styles.cancelBtn}
            />
            <PrimaryButton
              title="Confirm Safe Disarm"
              variant="saffron"
              onPress={handleConfirm}
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
    maxWidth: 420,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.deepMaroon,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  reasonsList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.softCream,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  reasonItemActive: {
    backgroundColor: '#FFF8E7',
    borderColor: colors.gold,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.deepMaroon,
  },
  reasonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  reasonTextActive: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.caption,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1.5,
  },
});
