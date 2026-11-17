import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { spacing } from '../../../core/theme/spacing';
import {
  ClockIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../../../shared/components/CustomSvgIcons';
import { HOLD_REASONS, holdService } from '../services/holdService';
import { t } from '../../../core/localization/i18n';

export const ViharHoldModal = ({
  visible,
  onClose,
  vihar,
  currentSubVihar,
  userId,
  currentLocation,
  onHoldStarted,
}) => {
  const [selectedReason, setSelectedReason] = useState('REST');
  const [locationName, setLocationName] = useState(
    vihar?.dest_name ? `Near ${vihar.dest_name}` : 'En Route Upashray / Road'
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartHold = async () => {
    if (!selectedReason) {
      setErrorMsg(t('vihar.hold_validation_reason'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { data, error } = await holdService.startHold({
        viharId: vihar?.id,
        subViharId: currentSubVihar?.id || null,
        userId,
        reason: selectedReason,
        locationName: locationName.trim() || 'En Route',
        latitude: currentLocation?.latitude || vihar?.source_lat || null,
        longitude: currentLocation?.longitude || vihar?.source_lng || null,
        notes: notes.trim(),
      });

      if (error) {
        const message = error?.message || error?.details || error?.hint;
        setErrorMsg(message || t('vihar.hold_error'));
      } else {
        if (onHoldStarted) onHoldStarted(data);
        onClose();
      }
    } catch (e) {
      setErrorMsg(e?.message || t('vihar.hold_start_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <ClockIcon size={24} color={colors.statusWarning} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{t('vihar.hold_title')}</Text>
              <Text style={styles.subtitle}>
                {t('vihar.hold_subtitle')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Informational Banner */}
            <View style={styles.infoBanner}>
              <ShieldIcon size={16} color={colors.gold} />
              <Text style={styles.infoBannerText}>
                {t('vihar.hold_notice')}
              </Text>
            </View>

            {/* Error Message */}
            {!!errorMsg && (
              <View style={styles.errorBox}>
                <AlertTriangleIcon size={16} color={colors.statusEmergency} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Reason Selection */}
            <Text style={styles.sectionLabel}>{t('vihar.hold_reason')}</Text>
            <View style={styles.reasonsList}>
              {HOLD_REASONS.map((r) => {
                const isSelected = selectedReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.reasonCard,
                      isSelected && styles.reasonCardSelected,
                    ]}
                    onPress={() => setSelectedReason(r.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reasonRadio}>
                      <View
                        style={[
                          styles.radioInner,
                          isSelected && styles.radioInnerSelected,
                        ]}
                      />
                    </View>
                    <View style={styles.reasonInfo}>
                      <Text
                        style={[
                          styles.reasonLabel,
                          isSelected && styles.reasonLabelSelected,
                        ]}
                      >
                        {t(`vihar.hold_reason_${r.id}`)}
                      </Text>
                      <Text style={styles.reasonDesc}>
                        {t(`vihar.hold_reason_${r.id}_desc`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Current Location / Landmark */}
            <Text style={styles.sectionLabel}>{t('vihar.hold_location')}</Text>
            <TextInput
              style={styles.input}
              value={locationName}
              onChangeText={setLocationName}
              placeholder={t('vihar.hold_location_placeholder')}
              placeholderTextColor={colors.textMuted}
            />

            {/* Notes */}
            <Text style={styles.sectionLabel}>{t('vihar.hold_notes')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('vihar.hold_notes_placeholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>{t('vihar.hold_cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleStartHold}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <>
                  <CheckCircleIcon size={18} color={colors.textLight} />
                  <Text style={styles.confirmButtonText}>{t('vihar.hold_confirm')}</Text>
                </>
              )}
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.warmIvory,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: colors.gold + '40',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.statusWarningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.softCream,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold + '30',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusEmergencyBg,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.statusEmergency,
  },
  errorText: {
    flex: 1,
    color: colors.statusEmergency,
    fontSize: 12,
    fontFamily: typography.medium,
    marginLeft: spacing.xs,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: typography.semiBold,
    color: colors.gold,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonsList: {
    marginBottom: spacing.md,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reasonCardSelected: {
    borderColor: colors.statusWarning,
    backgroundColor: colors.statusWarningBg,
  },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioInnerSelected: {
    backgroundColor: colors.statusWarning,
  },
  reasonInfo: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.textPrimary,
  },
  reasonLabelSelected: {
    color: colors.statusWarning,
    fontFamily: typography.semiBold,
  },
  reasonDesc: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.regular,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.warmIvory,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: spacing.sm,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: typography.medium,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.statusWarning,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    gap: spacing.xs,
  },
  confirmButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontFamily: typography.semiBold,
  },
});

