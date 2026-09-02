import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';
import { LogoutIcon } from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { authService } from '../../auth/services/authService';
import { t } from '../../../core/localization/i18n';

export const SevakPendingApprovalScreen = () => {
  const { user, profile, checkStatus, setProfileStatus, withdrawRequest, logout } =
    useAuthStore();

  const [isChecking, setIsChecking] = useState(false);
  const [stillPendingModalVisible, setStillPendingModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);

  // Pulse animation for pending status badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  // Supabase Realtime Listener for instant Admin action push
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = authService.subscribeToProfileStatus(
      user.id,
      ({ status, isDeleted }) => {
        if (isDeleted || status === 'REJECTED') {
          setRejectionModalVisible(true);
        } else if (status === 'ACTIVE') {
          setApprovalModalVisible(true);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    const freshStatus = await checkStatus();
    setIsChecking(false);

    if (freshStatus === 'ACTIVE') {
      setApprovalModalVisible(true);
    } else if (freshStatus === 'REJECTED') {
      setRejectionModalVisible(true);
    } else {
      setStillPendingModalVisible(true);
    }
  };

  // Only logout (Keeps database record intact)
  const handleConfirmLogoutOnly = async () => {
    setLogoutModalVisible(false);
    await logout();
  };

  // Cancel registration & delete record from Supabase completely
  const handleConfirmCancelAndDelete = async () => {
    setCancelModalVisible(false);
    await withdrawRequest();
  };

  const handleConfirmRejectionExit = async () => {
    setRejectionModalVisible(false);
    await withdrawRequest();
  };

  const handleEnterApp = async () => {
    setApprovalModalVisible(false);
    await setProfileStatus('ACTIVE');
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={colors.deepMaroon}
        barStyle="light-content"
        translucent={false}
      />

      {/* Top Header Banner with Logout Option */}
      <AppHeader
        title={t('app_name')}
        subtitle={t('parent_group')}
        showLogo
        rightElement={
          <TouchableOpacity
            onPress={() => setLogoutModalVisible(true)}
            style={styles.headerLogoutBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LogoutIcon size={20} color={colors.warmIvory} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge Card */}
        <View style={[styles.statusCard, shadows.card]}>
          <Animated.View
            style={[
              styles.iconWrapper,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.iconSymbol}>⏳</Text>
          </Animated.View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {t('approval.status_badge_pending')}
            </Text>
          </View>

          <Text style={styles.title}>{t('approval.pending_title')}</Text>
          <Text style={styles.subtitle}>{t('approval.pending_subtitle')}</Text>

          {/* Security Notice Box */}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeIcon}>🛡️</Text>
            <Text style={styles.noticeText}>{t('approval.notice_text')}</Text>
          </View>
        </View>

        {/* Submitted Profile Details Card */}
        <View style={[styles.detailsCard, shadows.card]}>
          <Text style={styles.sectionHeading}>
            {t('approval.submitted_summary_title')}
          </Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('profile_setup.full_name')}:</Text>
            <Text style={styles.detailValue}>{profile?.full_name || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('profile_setup.email')}:</Text>
            <Text style={styles.detailValue}>{profile?.email || user?.email || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('profile_setup.phone')}:</Text>
            <Text style={styles.detailValue}>{profile?.phone || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('profile_setup.age')}:</Text>
            <Text style={styles.detailValue}>
              {profile?.age ? `${profile.age} yrs` : '—'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('profile_setup.area')}:</Text>
            <Text style={styles.detailValue}>{profile?.area || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('profile_setup.city')}:</Text>
            <Text style={styles.detailValue}>{profile?.city || 'Surat'}</Text>
          </View>

          {profile?.blood_group ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('profile_setup.blood_group')}:</Text>
                <Text style={styles.detailValue}>{profile.blood_group}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <PrimaryButton
            title={
              isChecking
                ? t('approval.status_checking')
                : t('approval.refresh_button')
            }
            onPress={handleManualCheck}
            loading={isChecking}
            variant="saffron"
            style={styles.refreshBtn}
          />

          {/* Cancel Request & Delete from Database */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCancelModalVisible(true)}
            style={styles.cancelRequestBtn}
          >
            <Text style={styles.cancelRequestBtnText}>
              {t('approval.withdraw_button')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CUSTOM STATUS PENDING POPUP */}
      <Modal
        visible={stillPendingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStillPendingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.customModalCard, shadows.elevated]}>
            <View style={styles.customModalIconCircle}>
              <Text style={styles.customModalIconText}>⏳</Text>
            </View>

            <Text style={styles.customModalTitle}>Status: Under Review</Text>
            <Text style={styles.customModalBody}>
              Your registration is currently awaiting verification from the Administrator. 
              {'\n\n'}
              You will automatically gain full access as soon as your request is approved!
            </Text>

            <PrimaryButton
              title="Understood"
              onPress={() => setStillPendingModalVisible(false)}
              variant="saffron"
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </Modal>

      {/* TOP HEADER ONLY LOGOUT MODAL (Keeps registration record in database) */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.customModalCard, shadows.elevated]}>
            <View style={styles.logoutIconCircle}>
              <LogoutIcon size={28} color={colors.deepMaroon} />
            </View>

            <Text style={styles.customModalTitle}>Logout of Account?</Text>
            <Text style={styles.customModalBody}>
              Your registration request will remain active for admin review. You can log back in at any time to check your approval status.
            </Text>

            <View style={styles.modalTwoBtnRow}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setLogoutModalVisible(false)}
                style={styles.modalBtnHalf}
              />
              <PrimaryButton
                title="Logout"
                onPress={handleConfirmLogoutOnly}
                variant="saffron"
                style={styles.modalBtnHalf}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* CANCEL REQUEST & DELETE RECORD MODAL */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.customModalCard, shadows.elevated]}>
            <View style={styles.cancelIconCircle}>
              <Text style={styles.customModalIconText}>⚠️</Text>
            </View>

            <Text style={styles.customModalTitle}>Cancel & Delete Request?</Text>
            <Text style={styles.customModalBody}>
              This will withdraw your application and permanently remove your registration request from the database and administrator dashboard.
            </Text>

            <View style={styles.modalTwoBtnRow}>
              <SecondaryButton
                title="Keep Request"
                onPress={() => setCancelModalVisible(false)}
                style={styles.modalBtnHalf}
              />
              <PrimaryButton
                title="Yes, Delete"
                onPress={handleConfirmCancelAndDelete}
                variant="primary"
                style={styles.modalBtnHalf}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Approval Success Modal */}
      <Modal
        visible={approvalModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.successIconWrapper}>
              <Text style={styles.modalIconSymbol}>🎉</Text>
            </View>
            <Text style={styles.modalTitle}>{t('approval.accepted_title')}</Text>
            <Text style={styles.modalSubtitle}>{t('approval.accepted_msg')}</Text>
            <PrimaryButton
              title={t('approval.proceed_to_app')}
              onPress={handleEnterApp}
              variant="saffron"
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        visible={rejectionModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.rejectIconWrapper}>
              <Text style={styles.modalIconSymbol}>⚠️</Text>
            </View>
            <Text style={styles.modalRejectTitle}>
              {t('approval.rejected_title')}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('approval.rejected_msg')}
            </Text>
            <PrimaryButton
              title={t('common.logout')}
              onPress={handleConfirmRejectionExit}
              variant="primary"
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  headerLogoutBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.saffron,
  },
  iconSymbol: {
    fontSize: 32,
  },
  badge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  badgeText: {
    ...typography.caption,
    color: '#856404',
    fontWeight: '700',
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: colors.softCream,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticeIcon: {
    fontSize: 20,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 4,
  },
  actionsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  refreshBtn: {
    marginTop: spacing.xs,
  },
  cancelRequestBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelRequestBtnText: {
    ...typography.bodySmall,
    color: colors.statusEmergency,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  customModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '90%',
    maxWidth: 380,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  customModalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF8E7',
    borderWidth: 2,
    borderColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoutIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF8E7',
    borderWidth: 2,
    borderColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cancelIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: colors.statusEmergency,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  customModalIconText: {
    fontSize: 28,
  },
  customModalTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  customModalBody: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  modalTwoBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalBtnHalf: {
    flex: 1,
  },
  successIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D4EDDA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  rejectIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8D7DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalIconSymbol: {
    fontSize: 34,
  },
  modalTitle: {
    ...typography.h3,
    color: '#155724',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalRejectTitle: {
    ...typography.h3,
    color: '#721C24',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalActionBtn: {
    width: '100%',
  },
});
