import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import {
  UserIcon,
  PhoneIcon,
  ShieldIcon,
  CheckCircleIcon,
  LogoutIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { t } from '../../../core/localization/i18n';

const LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
];

const BLOOD_GROUPS = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];

export const SevakProfileScreen = () => {
  const { profile, user, updateProfileDetails, changeLanguage, language, logout } =
    useAuthStore();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || 'Vihar Sevika');
  const [city, setCity] = useState(profile?.city || 'Bhavnagar');
  const [emergencyName, setEmergencyName] = useState(
    profile?.emergency_contact_name || 'Vihar Coordination Office'
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    profile?.emergency_contact_phone || '9876543211'
  );
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || 'B+');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const openEditModal = () => {
    setFullName(profile?.full_name || 'Vihar Sevika');
    setCity(profile?.city || 'Bhavnagar');
    setEmergencyName(profile?.emergency_contact_name || 'Vihar Coordination Office');
    setEmergencyPhone(profile?.emergency_contact_phone || '9876543211');
    setBloodGroup(profile?.blood_group || 'B+');
    setSaveSuccessMsg('');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }

    setIsSaving(true);
    const success = await updateProfileDetails({
      full_name: fullName.trim(),
      city: city.trim(),
      emergency_contact_name: emergencyName.trim(),
      emergency_contact_phone: emergencyPhone.trim(),
      blood_group: bloodGroup.trim(),
      preferred_language: language,
    });
    setIsSaving(false);

    if (success) {
      setSaveSuccessMsg('Profile updated successfully! ✨');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveSuccessMsg('');
      }, 1000);
    } else {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCallEmergency = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Sevak Profile"
        rightElement={
          <TouchableOpacity
            onPress={logout}
            style={styles.headerLogout}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LogoutIcon size={20} color={colors.warmIvory} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card with Avatar & Sacred Rings */}
        <View style={[styles.profileCard, shadows.card]}>
          <View style={styles.avatarGlowRing}>
            <View style={styles.avatarCircle}>
              <UserIcon size={46} color={colors.warmIvory} />
            </View>
          </View>

          <Text style={styles.userName}>{profile?.full_name || 'Vihar Sevika'}</Text>
          <Text style={styles.userCity}>
            📍 {profile?.city || 'Bhavnagar'}, Gujarat
          </Text>

          <View style={styles.roleBadgeRow}>
            <View style={styles.verifiedRoleBadge}>
              <CheckCircleIcon size={16} color={colors.statusSafe} />
              <Text style={styles.verifiedRoleText}>VERIFIED SEVAK</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openEditModal}
            style={styles.editProfileChip}
          >
            <Text style={styles.editProfileChipText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Section 1: Personal Details */}
        <View style={[styles.sectionCard, shadows.card]}>
          <Text style={styles.sectionHeader}>Personal Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{profile?.phone || '+91 98765 43210'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Blood Group</Text>
            <View style={styles.bloodBadge}>
              <Text style={styles.bloodBadgeText}>{profile?.blood_group || 'B+'}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Status</Text>
            <StatusBadge status={SAFETY_STATUS.SAFE} />
          </View>
        </View>

        {/* Section 2: Emergency Contact & Quick Call */}
        <View style={[styles.sectionCard, shadows.card]}>
          <View style={styles.emergencyHeaderRow}>
            <Text style={styles.sectionHeader}>Emergency Contact</Text>
            <ShieldIcon size={18} color={colors.statusEmergency} />
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Person</Text>
            <Text style={styles.infoValue}>
              {profile?.emergency_contact_name || 'Vihar Coordination Office'}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Number</Text>
            <Text style={styles.infoValue}>
              {profile?.emergency_contact_phone || '+91 98765 43211'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              handleCallEmergency(profile?.emergency_contact_phone || '9876543211')
            }
            style={styles.quickCallBtn}
          >
            <PhoneIcon size={18} color="#FFFFFF" />
            <Text style={styles.quickCallText}>Call Emergency Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Language Preference */}
        <View style={[styles.sectionCard, shadows.card]}>
          <Text style={styles.sectionHeader}>App Language (ભાષા / भाषा)</Text>
          <Text style={styles.sectionSub}>Select preferred language for app interface</Text>

          <View style={styles.langRow}>
            {LANGUAGES.map((item) => {
              const isSelected = language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  activeOpacity={0.8}
                  onPress={() => changeLanguage(item.code)}
                  style={[styles.langChip, isSelected && styles.langChipActive]}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      isSelected && styles.langChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 4: Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          style={[styles.logoutCard, shadows.card]}
        >
          <LogoutIcon size={20} color={colors.statusEmergency} />
          <Text style={styles.logoutText}>Logout of Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, shadows.card]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Sevak Profile</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {saveSuccessMsg ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>{saveSuccessMsg}</Text>
                </View>
              ) : null}

              <CustomTextInput
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
              />

              <CustomTextInput
                label="City / Sangha"
                placeholder="e.g. Bhavnagar, Palitana, Ahmedabad"
                value={city}
                onChangeText={setCity}
              />

              {/* Blood Group Chips */}
              <Text style={styles.inputLabel}>Blood Group</Text>
              <View style={styles.bloodChipsRow}>
                {BLOOD_GROUPS.map((bg) => {
                  const isSelected = bloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      onPress={() => setBloodGroup(bg)}
                      style={[
                        styles.bloodChip,
                        isSelected && styles.bloodChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bloodChipText,
                          isSelected && styles.bloodChipTextActive,
                        ]}
                      >
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <CustomTextInput
                label="Emergency Contact Person"
                placeholder="Name of family member / Sangha coordinator"
                value={emergencyName}
                onChangeText={setEmergencyName}
              />

              <CustomTextInput
                label="Emergency Contact Phone"
                placeholder="10-digit mobile number"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />

              <View style={styles.modalBtnRow}>
                <SecondaryButton
                  title="Cancel"
                  onPress={() => setIsEditModalOpen(false)}
                  style={styles.modalCancelBtn}
                />
                <PrimaryButton
                  title="Save Changes"
                  variant="saffron"
                  loading={isSaving}
                  onPress={handleSaveProfile}
                  style={styles.modalSaveBtn}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  headerLogout: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  avatarGlowRing: {
    padding: 4,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: spacing.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    ...typography.h2,
    color: colors.deepMaroon,
    marginBottom: 2,
  },
  userCity: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  verifiedRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 142, 60, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(56, 142, 60, 0.3)',
  },
  verifiedRoleText: {
    ...typography.caption,
    color: colors.statusSafe,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editProfileChip: {
    backgroundColor: colors.softCream,
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  editProfileChipText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emergencyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  bloodBadge: {
    backgroundColor: 'rgba(189, 44, 44, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  bloodBadgeText: {
    ...typography.caption,
    color: colors.statusEmergency,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  quickCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  quickCallText: {
    ...typography.bodyMedium,
    color: colors.warmIvory,
    fontWeight: '700',
  },
  langRow: {
    flexDirection: 'row',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  langChip: {
    flex: 1,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: colors.deepMaroon,
  },
  langChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  langChipTextActive: {
    color: colors.warmIvory,
  },
  logoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(189, 44, 44, 0.2)',
    marginBottom: spacing.xxl,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.statusEmergency,
    fontWeight: '700',
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.deepMaroon,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modalScroll: {
    paddingBottom: spacing.xxl,
  },
  successBanner: {
    backgroundColor: 'rgba(56, 142, 60, 0.12)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  successText: {
    ...typography.bodySmall,
    color: colors.statusSafe,
    fontWeight: '700',
  },
  inputLabel: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  bloodChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  bloodChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.softCream,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bloodChipActive: {
    backgroundColor: colors.deepMaroon,
    borderColor: colors.deepMaroon,
  },
  bloodChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bloodChipTextActive: {
    color: colors.warmIvory,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalSaveBtn: {
    flex: 1.5,
  },
});
