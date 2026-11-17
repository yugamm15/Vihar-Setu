import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import {
  PhoneIcon,
  SirenIcon,
  ShieldIcon,
  CloseIcon,
  AlertTriangleIcon,
} from '../../../shared/components/CustomSvgIcons';
import { adminLiveService } from '../services/adminLiveService';

export const AdminCallActionModal = ({
  visible,
  onClose,
  vihar,
}) => {
  const [isCallingPolice, setIsCallingPolice] = useState(false);
  const [showPoliceConfirm, setShowPoliceConfirm] = useState(false);

  if (!vihar) return null;

  const sevakName = vihar.sevak_name || 'Vihar Sevak';
  const sevakPhone = vihar.sevak_phone || '';
  const emergencyPhone = vihar.emergency_contact_phone || '';

  const handleCallUser = async () => {
    if (!sevakPhone) return;
    await adminLiveService.logCall({
      viharId: vihar.vihar_id,
      targetType: 'SEVAK',
      phone: sevakPhone,
    });
    Linking.openURL(`tel:${sevakPhone.replace(/[^0-9+]/g, '')}`);
    onClose();
  };

  const handleCallEmergencyContact = async () => {
    if (!emergencyPhone) return;
    await adminLiveService.logCall({
      viharId: vihar.vihar_id,
      targetType: 'EMERGENCY_CONTACT',
      phone: emergencyPhone,
    });
    Linking.openURL(`tel:${emergencyPhone.replace(/[^0-9+]/g, '')}`);
    onClose();
  };

  const handleConfirmPoliceCall = async () => {
    setIsCallingPolice(true);
    try {
      await adminLiveService.logPoliceCall({
        viharId: vihar.vihar_id,
        emergencyId: null,
        location: { lat: vihar.lat, lng: vihar.lng },
      });
      Linking.openURL('tel:112');
    } catch (e) {
      console.warn('[AdminCallActionModal] Error logging police call:', e);
      Linking.openURL('tel:112');
    } finally {
      setIsCallingPolice(false);
      setShowPoliceConfirm(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.dialogCard, shadows.card]}>
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <PhoneIcon size={20} color={colors.deepMaroon} />
              </View>
              <View>
                <Text style={styles.dialogTitle}>Emergency & Call Actions</Text>
                <Text style={styles.dialogSubtitle}>{sevakName}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <CloseIcon size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showPoliceConfirm ? (
            /* Police Call Confirmation State */
            <View style={styles.confirmBox}>
              <View style={styles.policeAlertBanner}>
                <AlertTriangleIcon size={24} color={colors.statusEmergency} />
                <Text style={styles.policeAlertTitle}>CONFIRM POLICE 112 DISPATCH</Text>
              </View>
              <Text style={styles.policeConfirmText}>
                You are about to dial Police Emergency (112) for this active Vihar corridor. This action will be permanently logged in the central security audit trail.
              </Text>

              <View style={styles.confirmActionsRow}>
                <TouchableOpacity
                  style={styles.cancelConfirmBtn}
                  onPress={() => setShowPoliceConfirm(false)}
                  disabled={isCallingPolice}
                >
                  <Text style={styles.cancelConfirmBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialPoliceBtn}
                  onPress={handleConfirmPoliceCall}
                  disabled={isCallingPolice}
                >
                  {isCallingPolice ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.dialPoliceBtnText}>Yes, Dial 112 Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Normal Call Options */
            <View style={styles.actionsList}>
              {/* Call Sevak */}
              <TouchableOpacity
                style={styles.callRowBtn}
                activeOpacity={0.8}
                onPress={handleCallUser}
                disabled={!sevakPhone}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <PhoneIcon size={18} color={colors.statusSafe} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionBtnTitle}>Call Sevak Directly</Text>
                  <Text style={styles.actionBtnSub}>
                    {sevakPhone || 'No phone registered'}
                  </Text>
                </View>
                <Text style={styles.dialChevron}>📞</Text>
              </TouchableOpacity>

              {/* Call Emergency Contact */}
              <TouchableOpacity
                style={styles.callRowBtn}
                activeOpacity={0.8}
                onPress={handleCallEmergencyContact}
                disabled={!emergencyPhone}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#FFF8E1' }]}>
                  <ShieldIcon size={18} color={colors.statusWarning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionBtnTitle}>Call Emergency Contact</Text>
                  <Text style={styles.actionBtnSub}>
                    {emergencyPhone || 'No emergency contact on file'}
                  </Text>
                </View>
                <Text style={styles.dialChevron}>📞</Text>
              </TouchableOpacity>

              {/* CALL POLICE 112 */}
              <TouchableOpacity
                style={styles.policeRowBtn}
                activeOpacity={0.85}
                onPress={() => setShowPoliceConfirm(true)}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#FFCDD2' }]}>
                  <SirenIcon size={20} color={colors.statusEmergency} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policeBtnTitle}>CALL POLICE 112</Text>
                  <Text style={styles.policeBtnSub}>Immediate Police Dispatch & Audit Log</Text>
                </View>
                <Text style={styles.policeChevron}>🚨</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 17, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.saffron,
  },
  dialogTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontSize: 15,
  },
  dialogSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  actionsList: {
    gap: spacing.sm,
  },
  callRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionBtnSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dialChevron: {
    fontSize: 16,
    marginLeft: spacing.xs,
  },
  policeRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.statusEmergency,
    marginTop: spacing.xs,
  },
  policeBtnTitle: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.statusEmergency,
    letterSpacing: 0.5,
  },
  policeBtnSub: {
    ...typography.caption,
    color: '#900',
    fontSize: 10,
    marginTop: 1,
  },
  policeChevron: {
    fontSize: 18,
    marginLeft: spacing.xs,
  },
  confirmBox: {
    paddingVertical: spacing.sm,
  },
  policeAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  policeAlertTitle: {
    ...typography.h4,
    color: colors.statusEmergency,
    fontSize: 14,
    fontWeight: '800',
  },
  policeConfirmText: {
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelConfirmBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dialPoliceBtn: {
    flex: 1.5,
    backgroundColor: colors.statusEmergency,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dialPoliceBtnText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
});
