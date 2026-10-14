import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import { subViharService } from '../services/subViharService';

export const ViharHandoverModal = ({
  visible,
  onClose,
  vihar,
  currentSubVihar,
  currentUserId,
  onHandoverComplete,
}) => {
  const [availableSevaks, setAvailableSevaks] = useState([]);
  const [selectedSevak, setSelectedSevak] = useState(null);
  const [manualSevakName, setManualSevakName] = useState('');
  const [handoverLocation, setHandoverLocation] = useState(
    vihar?.dest_name ? `Near ${vihar.dest_name}` : 'Majura Gate Cross Road, Surat'
  );
  const [notes, setNotes] = useState('Transfer of accompaniment duty to next Sevika.');
  const [isLoadingSevaks, setIsLoadingSevaks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible && currentUserId) {
      loadSevaks();
    }
  }, [visible, currentUserId]);

  const loadSevaks = async () => {
    setIsLoadingSevaks(true);
    const { data } = await subViharService.getAvailableSevaksForHandover(currentUserId);
    setAvailableSevaks(data || []);
    setIsLoadingSevaks(false);
  };

  const handleConfirmHandover = async () => {
    setErrorMsg('');
    const targetName = selectedSevak?.full_name || manualSevakName.trim();
    if (!targetName) {
      setErrorMsg('Please select or enter the next Sevika receiving duty.');
      return;
    }

    if (!handoverLocation.trim()) {
      setErrorMsg('Please enter the handover location.');
      return;
    }

    setIsSubmitting(true);
    const result = await subViharService.executeHandover({
      viharId: vihar?.id,
      currentSubViharId: currentSubVihar?.id,
      currentSubViharNumber: currentSubVihar?.sub_vihar_number || 1,
      handedOverByUserId: currentUserId,
      nextSevakUserId: selectedSevak?.id || null,
      nextSevakName: targetName,
      handoverLocationName: handoverLocation.trim(),
      handoverLat: currentSubVihar?.source_lat || 21.1959,
      handoverLng: currentSubVihar?.source_lng || 72.7933,
      notes: notes.trim(),
    });
    setIsSubmitting(false);

    if (result.success) {
      onHandoverComplete(result.newSubVihar);
      onClose();
    } else {
      setErrorMsg('Failed to record handover. Please try again.');
    }
  };

  const subViharNum = currentSubVihar?.sub_vihar_number || 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalCard, shadows.elevated]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.badgeText}>PHASE 13 • VIHAR HANDOVER</Text>
              <Text style={styles.title}>Transfer Vihar Responsibility</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Status Summary Banner */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>
                Ending Sub-Vihar #{subViharNum} → Starting Sub-Vihar #{subViharNum + 1}
              </Text>
              <Text style={styles.summaryDesc}>
                The sacred journey continues uninterrupted. Your portion will be marked as completed, and live telemetry responsibility transfers to the next Sevika.
              </Text>
            </View>

            {/* Choose Available Volunteers */}
            <Text style={styles.sectionLabel}>Select Next Sevak from Volunteer Network:</Text>
            {isLoadingSevaks ? (
              <ActivityIndicator color={colors.saffron} style={{ marginVertical: 12 }} />
            ) : availableSevaks.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sevakChipRow}>
                {availableSevaks.slice(0, 6).map((sevak) => {
                  const isSelected = selectedSevak?.id === sevak.id;
                  return (
                    <TouchableOpacity
                      key={sevak.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedSevak(isSelected ? null : sevak);
                        setManualSevakName('');
                      }}
                      style={[styles.sevakChip, isSelected && styles.sevakChipSelected]}
                    >
                      <View style={[styles.chipAvatar, isSelected && styles.chipAvatarSelected]}>
                        <Text style={styles.chipAvatarText}>
                          {sevak.full_name ? sevak.full_name[0] : 'S'}
                        </Text>
                      </View>
                      <Text style={[styles.chipName, isSelected && styles.chipNameSelected]} numberOfLines={1}>
                        {sevak.full_name}
                      </Text>
                      <Text style={styles.chipArea}>{sevak.area || 'Surat'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Or Manual Name Input */}
            <CustomTextInput
              label="Next Sevak / Sevika Name *"
              placeholder={selectedSevak ? selectedSevak.full_name : "Enter receiving Sevak's full name"}
              value={selectedSevak ? selectedSevak.full_name : manualSevakName}
              onChangeText={(text) => {
                setSelectedSevak(null);
                setManualSevakName(text);
              }}
            />

            {/* Handover Location */}
            <CustomTextInput
              label="Transfer / Handover Location *"
              placeholder="e.g. Near Athwagate Circle, Surat"
              value={handoverLocation}
              onChangeText={setHandoverLocation}
            />

            {/* Handover Notes */}
            <CustomTextInput
              label="Handover Notes"
              placeholder="e.g. Accompanied 3 Sadhvijis safely, passing sacred Dandak."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <SecondaryButton
                title="Cancel"
                onPress={onClose}
                style={styles.cancelBtn}
              />
              <PrimaryButton
                title={isSubmitting ? 'Transferring...' : 'Confirm Handover'}
                onPress={handleConfirmHandover}
                loading={isSubmitting}
                variant="saffron"
                style={styles.confirmBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  summaryBox: {
    backgroundColor: '#FFF8EC',
    borderWidth: 1.5,
    borderColor: colors.saffron,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  summaryDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sevakChipRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  sevakChip: {
    backgroundColor: '#FAF5ED',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    width: 90,
  },
  sevakChipSelected: {
    backgroundColor: colors.saffron,
    borderColor: colors.saffronDark,
  },
  chipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  chipAvatarSelected: {
    backgroundColor: '#FFFFFF',
  },
  chipAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  chipName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.deepMaroon,
    fontSize: 11,
  },
  chipNameSelected: {
    color: '#FFFFFF',
  },
  chipArea: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
  errorText: {
    ...typography.caption,
    color: colors.statusEmergency,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1.6,
  },
});
