import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
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
import {
  CheckCircleIcon,
  ShieldIcon,
  UserIcon,
} from '../../../shared/components/CustomSvgIcons';
import { subViharService } from '../services/subViharService';
import { t } from '../../../core/localization/i18n';

export const ViharHandoverModal = ({
  visible,
  onClose,
  vihar,
  currentSubVihar,
  currentUserId,
  currentUserProfile,
  onHandoverComplete,
}) => {
  // Input & Verification State
  const [contactInput, setContactInput] = useState('');
  const [verifiedSevak, setVerifiedSevak] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupMessage, setLookupMessage] = useState(null); // { type: 'ERROR' | 'SUCCESS' | 'INFO', text: '' }
  const [isHandoverConfirmed, setIsHandoverConfirmed] = useState(false);

  // Available Volunteers Quick Select State
  const [availableSevaks, setAvailableSevaks] = useState([]);
  const [isLoadingSevaks, setIsLoadingSevaks] = useState(false);

  // Handover Metadata
  const [handoverLocation, setHandoverLocation] = useState(
    vihar?.dest_name ? `Near ${vihar.dest_name}` : 'Majura Gate Cross Road, Surat'
  );
  const [notes, setNotes] = useState('Transfer of accompaniment duty to verified Sevika.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setContactInput('');
      setVerifiedSevak(null);
      setLookupMessage(null);
      setIsHandoverConfirmed(false);
      setErrorMsg('');
      if (currentUserId) {
        loadSevaks();
      }
    }
  }, [visible, currentUserId]);

  const loadSevaks = async () => {
    setIsLoadingSevaks(true);
    const { data } = await subViharService.getAvailableSevaksForHandover(currentUserId);
    setAvailableSevaks(data || []);
    setIsLoadingSevaks(false);
  };

  /**
   * Search and verify receiving Sevak by mobile number or email
   */
  const handleLookup = async (textToSearch) => {
    const val = (textToSearch !== undefined ? textToSearch : contactInput).trim();
    if (!val) {
      setVerifiedSevak(null);
      setLookupMessage(null);
      setIsHandoverConfirmed(false);
      return;
    }

    const cleanDigits = val.replace(/[^0-9]/g, '');
    const isEmail = val.includes('@');

    if (!isEmail && cleanDigits.length < 10) {
      setLookupMessage({
        type: 'INFO',
        text: 'Please enter a 10-digit mobile number or valid email address.',
      });
      return;
    }

    // Client-side guard: Prevent transferring to oneself
    const myPhone = currentUserProfile?.phone
      ? currentUserProfile.phone.replace(/[^0-9]/g, '')
      : '';
    const myEmail = (currentUserProfile?.email || '').trim().toLowerCase();
    const isSelfMatch =
      (isEmail && myEmail && val.toLowerCase() === myEmail) ||
      (!isEmail &&
        myPhone &&
        cleanDigits.length >= 10 &&
        (cleanDigits.endsWith(myPhone.slice(-10)) ||
          myPhone.endsWith(cleanDigits.slice(-10))));

    if (isSelfMatch) {
      setVerifiedSevak(null);
      setIsHandoverConfirmed(false);
      setLookupMessage({
        type: 'ERROR',
        text: 'You cannot transfer Vihar responsibility to yourself. Please enter another verified Sevak’s mobile number or email.',
      });
      return;
    }

    setIsSearching(true);
    setLookupMessage(null);
    setErrorMsg('');

    const { data: sevak, error } = await subViharService.lookupSevakByContact(val, currentUserId);
    setIsSearching(false);

    if (sevak) {
      setVerifiedSevak(sevak);
      setIsHandoverConfirmed(true);
      setLookupMessage({
        type: 'SUCCESS',
        text: 'Registered Sevak matched and verified in database.',
      });
    } else {
      setVerifiedSevak(null);
      setIsHandoverConfirmed(false);
      setLookupMessage({
        type: 'ERROR',
        text: error || 'No active registered Sevak found with this mobile number or email. Please verify with the volunteer.',
      });
    }
  };

  /**
   * Handle text change with automatic lookup on complete input
   */
  const handleContactChange = (text) => {
    setContactInput(text);
    if (verifiedSevak) {
      setVerifiedSevak(null);
      setIsHandoverConfirmed(false);
    }
    if (lookupMessage) {
      setLookupMessage(null);
    }

    const cleanDigits = text.replace(/[^0-9]/g, '');
    const isEmail = text.includes('@') && text.includes('.');

    if (cleanDigits.length === 10 || isEmail) {
      handleLookup(text);
    }
  };

  /**
   * Quick select from active volunteer network
   */
  const handleSelectPresetVolunteer = (sevak) => {
    const contact = sevak.phone || sevak.email || '';
    setContactInput(contact);
    handleLookup(contact);
  };

  /**
   * Execute Vihar Handover
   */
  const handleConfirmHandover = async () => {
    setErrorMsg('');

    if (!verifiedSevak) {
      setErrorMsg('Please enter a registered mobile number or email to verify the receiving Sevika.');
      return;
    }

    if (!isHandoverConfirmed) {
      setErrorMsg(`Please check the confirmation box to authorize handover to ${verifiedSevak.full_name}.`);
      return;
    }

    if (!handoverLocation.trim()) {
      setErrorMsg('Please specify the handover location.');
      return;
    }

    setIsSubmitting(true);
    const result = await subViharService.executeHandover({
      viharId: vihar?.id,
      currentSubViharId: currentSubVihar?.id,
      currentSubViharNumber: currentSubVihar?.sub_vihar_number || 1,
      handedOverByUserId: currentUserId,
      nextSevakUserId: verifiedSevak.id,
      nextSevakName: verifiedSevak.full_name,
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
      setErrorMsg(result.error?.message || 'Failed to record handover in database. Please try again.');
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
              <Text style={styles.title}>{t('vihar.handover_title')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
                The sacred journey continues uninterrupted. Enter the verified Sevika's registered mobile number or email address to confirm duty transfer.
              </Text>
            </View>

            {/* Input: Mobile Number or Email */}
            <View style={styles.inputWrapper}>
              <CustomTextInput
                label={t('vihar.handover_contact')}
                placeholder="e.g. 9876543210 or sevika@example.com"
                value={contactInput}
                onChangeText={handleContactChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                rightElement={
                  <TouchableOpacity
                    onPress={() => handleLookup()}
                    disabled={isSearching || !contactInput.trim()}
                    style={styles.verifyBtn}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color={colors.warmIvory} />
                    ) : (
                      <Text style={styles.verifyBtnText}>{t('vihar.handover_verify')}</Text>
                    )}
                  </TouchableOpacity>
                }
              />
            </View>

            {/* Lookup Feedback Message */}
            {lookupMessage ? (
              <View
                style={[
                  styles.feedbackBanner,
                  lookupMessage.type === 'SUCCESS'
                    ? styles.feedbackSuccess
                    : lookupMessage.type === 'INFO'
                    ? styles.feedbackInfo
                    : styles.feedbackError,
                ]}
              >
                <Text
                  style={[
                    styles.feedbackText,
                    lookupMessage.type === 'SUCCESS'
                      ? styles.feedbackTextSuccess
                      : lookupMessage.type === 'INFO'
                      ? styles.feedbackTextInfo
                      : styles.feedbackTextError,
                  ]}
                >
                  {lookupMessage.text}
                </Text>
              </View>
            ) : null}

            {/* VERIFIED SEVAK CONFIRMATION CARD */}
            {verifiedSevak ? (
              <View style={[styles.verifiedCard, shadows.card]}>
                <View style={styles.verifiedHeader}>
                  <View style={styles.verifiedAvatar}>
                    <Text style={styles.avatarInitial}>
                      {verifiedSevak.full_name ? verifiedSevak.full_name[0].toUpperCase() : 'S'}
                    </Text>
                  </View>
                  <View style={styles.verifiedInfo}>
                    <Text style={styles.verifiedName}>{verifiedSevak.full_name}</Text>
                    <View style={styles.verifiedBadgeRow}>
                      <CheckCircleIcon size={14} color={colors.statusSafe} />
                      <Text style={styles.verifiedBadgeText}>{t('vihar.handover_verified')}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registered Mobile:</Text>
                    <Text style={styles.detailValue}>{verifiedSevak.phone || '—'}</Text>
                  </View>

                  {verifiedSevak.email ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email Address:</Text>
                      <Text style={styles.detailValue}>{verifiedSevak.email}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Operational Area:</Text>
                    <Text style={styles.detailValue}>
                      {verifiedSevak.area ? `${verifiedSevak.area}, ` : ''}{verifiedSevak.city || 'Surat'}
                    </Text>
                  </View>

                  {verifiedSevak.blood_group ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Blood Group:</Text>
                      <Text style={[styles.detailValue, { color: colors.statusEmergency, fontWeight: '700' }]}>
                        {verifiedSevak.blood_group}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Explicit Handover Confirmation Checkbox */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsHandoverConfirmed(!isHandoverConfirmed)}
                  style={[
                    styles.confirmCheckboxRow,
                    isHandoverConfirmed && styles.confirmCheckboxRowActive,
                  ]}
                >
                  <View style={[styles.checkboxBox, isHandoverConfirmed && styles.checkboxBoxChecked]}>
                    {isHandoverConfirmed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.confirmCheckboxText}>
                    I confirm transferring Sadhviji accompaniment duty to{' '}
                    <Text style={{ fontWeight: '800', color: colors.deepMaroon }}>
                      {verifiedSevak.full_name}
                    </Text>.
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Quick Pick from Active Volunteer Network */}
            {!verifiedSevak && availableSevaks.length > 0 ? (
              <View style={styles.quickPickSection}>
                <Text style={styles.sectionLabel}>{t('vihar.handover_quick_pick')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sevakChipRow}>
                  {availableSevaks.slice(0, 8).map((sevak) => (
                    <TouchableOpacity
                      key={sevak.id}
                      activeOpacity={0.8}
                      onPress={() => handleSelectPresetVolunteer(sevak)}
                      style={styles.sevakChip}
                    >
                      <View style={styles.chipAvatar}>
                        <Text style={styles.chipAvatarText}>
                          {sevak.full_name ? sevak.full_name[0] : 'S'}
                        </Text>
                      </View>
                      <Text style={styles.chipName} numberOfLines={1}>
                        {sevak.full_name}
                      </Text>
                      <Text style={styles.chipArea} numberOfLines={1}>
                        {sevak.phone || sevak.area || 'Surat'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Handover Location */}
            <CustomTextInput
              label={t('vihar.handover_location')}
              placeholder="e.g. Near Majura Gate Cross Road, Surat"
              value={handoverLocation}
              onChangeText={setHandoverLocation}
            />

            {/* Handover Notes */}
            <CustomTextInput
              label={t('vihar.handover_notes')}
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
                title={t('vihar.handover_cancel')}
                onPress={onClose}
                style={styles.cancelBtn}
              />
              <PrimaryButton
                title={
                  isSubmitting
                    ? 'Transferring...'
                    : verifiedSevak
                    ? `${t('vihar.handover_confirm')} ${verifiedSevak.full_name.split(' ')[0]}`
                    : t('vihar.handover_verify')
                }
                onPress={handleConfirmHandover}
                loading={isSubmitting}
                disabled={!verifiedSevak || !isHandoverConfirmed}
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
    maxHeight: '90%',
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
  inputWrapper: {
    marginBottom: spacing.xs,
  },
  verifyBtn: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: colors.warmIvory,
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackBanner: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: colors.statusSafe,
  },
  feedbackInfo: {
    backgroundColor: '#FFF8EC',
    borderColor: colors.saffron,
  },
  feedbackError: {
    backgroundColor: '#FFEBEE',
    borderColor: colors.statusEmergency,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackTextSuccess: {
    color: colors.statusSafe,
  },
  feedbackTextInfo: {
    color: colors.saffronDark,
  },
  feedbackTextError: {
    color: colors.statusEmergency,
  },
  verifiedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verifiedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.goldLight,
    fontWeight: '800',
    fontSize: 20,
  },
  verifiedInfo: {
    flex: 1,
  },
  verifiedName: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '800',
    fontSize: 16,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.statusSafe,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  detailsGrid: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  detailValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  confirmCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFDF7',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  confirmCheckboxRowActive: {
    backgroundColor: '#FFF8EC',
    borderColor: colors.saffron,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.saffron,
    borderColor: colors.saffronDark,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  confirmCheckboxText: {
    ...typography.caption,
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  quickPickSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sevakChipRow: {
    flexDirection: 'row',
  },
  sevakChip: {
    backgroundColor: '#FAF5ED',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    width: 100,
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
    textAlign: 'center',
  },
  chipArea: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
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
