import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';
import {
  UserIcon,
  PhoneIcon,
  ShieldIcon,
  CheckCircleIcon,
  LogoutIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useAlertStore } from '../../../shared/hooks/useAlertStore';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { SURAT_AREAS, BLOOD_GROUPS } from '../../../core/constants/locations';
import { AVATAR_PRESETS } from '../../profile/constants/avatarPresets';
import { t } from '../../../core/localization/i18n';

const LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'હિन्दी' },
  { code: 'en', label: 'English' },
];

export const SevakProfileScreen = () => {
  const modalScrollRef = useRef(null);
  const { profile, user, updateProfileDetails, changeLanguage, language, logout } =
    useAuthStore();
  const { showAlert } = useAlertStore();

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || 'Vihar Sevika');
  const [city, setCity] = useState(profile?.city || 'Surat');
  const [area, setArea] = useState(profile?.area || 'Adajan');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '35');
  const [gender, setGender] = useState(profile?.gender || 'Female');
  const [emergencyName, setEmergencyName] = useState(
    profile?.emergency_contact_name || 'Vihar Coordination Office'
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    profile?.emergency_contact_phone || '9876543211'
  );
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || 'B+');
  const [interestedInAdmin, setInterestedInAdmin] = useState(
    Boolean(profile?.interested_in_administrator)
  );
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Avatar Selection State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState(
    profile?.avatar_url || 'sevika_1'
  );

  // Logout Confirmation State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Area Selection inside Edit Modal
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Dynamic Keyboard Listeners
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const filteredAreas = SURAT_AREAS.filter((a) =>
    a.toLowerCase().includes(areaSearch.toLowerCase().trim())
  );

  const currentAvatar =
    AVATAR_PRESETS.find((a) => a.id === (profile?.avatar_url || selectedAvatarId)) ||
    AVATAR_PRESETS[0];

  const openEditModal = () => {
    setFullName(profile?.full_name || 'Vihar Sevika');
    setCity('Surat');
    setArea(profile?.area || 'Adajan');
    setAge(profile?.age ? String(profile.age) : '35');
    setGender(profile?.gender || 'Female');
    setEmergencyName(profile?.emergency_contact_name || 'Vihar Coordination Office');
    setEmergencyPhone(profile?.emergency_contact_phone || '9876543211');
    setBloodGroup(profile?.blood_group || 'B+');
    setInterestedInAdmin(Boolean(profile?.interested_in_administrator));
    setSaveSuccessMsg('');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showAlert({
        type: 'WARNING',
        title: 'Required',
        message: 'Please enter your full name.',
        confirmText: 'OK',
      });
      return;
    }

    const cleanEmergencyPhone = emergencyPhone.replace(/[^0-9]/g, '');
    if (cleanEmergencyPhone.length !== 10) {
      showAlert({
        type: 'WARNING',
        title: 'Invalid Number',
        message: 'Please enter a valid 10-digit emergency contact number.',
        confirmText: 'OK',
      });
      return;
    }

    const parsedAge = parseInt(age.trim(), 10);
    if (isNaN(parsedAge) || parsedAge < 16 || parsedAge > 90) {
      showAlert({
        type: 'WARNING',
        title: 'Invalid Age',
        message: 'Please enter an age between 16 and 90.',
        confirmText: 'OK',
      });
      return;
    }

    setIsSaving(true);
    const success = await updateProfileDetails({
      full_name: fullName.trim(),
      city: 'Surat',
      area: area.trim(),
      age: parsedAge,
      gender: gender,
      emergency_contact_name: emergencyName.trim(),
      emergency_contact_phone: emergencyPhone.trim(),
      blood_group: bloodGroup.trim(),
      preferred_language: language,
      interested_in_administrator: interestedInAdmin,
    });
    setIsSaving(false);

    if (success) {
      setSaveSuccessMsg('Profile updated successfully.');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveSuccessMsg('');
        showAlert({
          type: 'SUCCESS',
          title: 'Profile Updated',
          message: 'Profile updated successfully.',
          confirmText: 'OK',
        });
      }, 1000);
    } else {
      const storeError = useAuthStore.getState().error;
      showAlert({
        type: 'ERROR',
        title: 'Unable to Save',
        message: storeError || 'Failed to update profile in database. Please try again.',
        confirmText: 'OK',
      });
    }
  };

  const handleSelectAvatar = async (preset) => {
    setSelectedAvatarId(preset.id);
    setIsAvatarModalOpen(false);
    await updateProfileDetails({
      avatar_url: preset.id,
    });
  };

  const handleCallEmergency = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const formatJoinedDate = (dateString) => {
    if (!dateString) return 'Active Seva Member';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Active Seva Member';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Sevak Profile"
        rightElement={
          <TouchableOpacity
            onPress={() => setIsLogoutModalOpen(true)}
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
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsAvatarModalOpen(true)}
            style={styles.avatarGlowRing}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: currentAvatar.bgColor || colors.deepMaroon },
              ]}
            >
              <Text style={styles.avatarInitials}>
                {currentAvatar.initials || 'VS'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{profile?.full_name || 'Vihar Sevika'}</Text>
          <Text style={styles.userCity}>
            {profile?.area ? `${profile.area}, ` : ''}
            {profile?.city || 'Surat'}, Gujarat
          </Text>

          <View style={styles.roleBadgeRow}>
            <View style={styles.verifiedRoleBadge}>
              <CheckCircleIcon size={16} color={colors.statusSafe} />
              <Text style={styles.verifiedRoleText}>VERIFIED SEVAK</Text>
            </View>
          </View>

          <View style={styles.profileActionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openEditModal}
              style={styles.editProfileChip}
            >
              <Text style={styles.editProfileChipText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsAvatarModalOpen(true)}
              style={styles.avatarPickerChip}
            >
              <Text style={styles.avatarPickerChipText}>Change Avatar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Personal Details */}
        <View style={[styles.sectionCard, shadows.card]}>
          <Text style={styles.sectionHeader}>Personal Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email || user?.email || '—'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{profile?.phone || '—'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{profile?.city || 'Surat'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Area / Locality</Text>
            <Text style={styles.infoValue}>{profile?.area || '—'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age & Gender</Text>
            <Text style={styles.infoValue}>
              {profile?.age ? `${profile.age} yrs` : '—'} • {profile?.gender || 'Female'}
            </Text>
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
            <Text style={styles.infoLabel}>Seva Member Since</Text>
            <Text style={styles.infoValue}>
              {formatJoinedDate(profile?.created_at)}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Status</Text>
            <StatusBadge status={SAFETY_STATUS.SAFE} />
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Admin Candidate</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color: profile?.interested_in_administrator
                    ? colors.saffronDark
                    : colors.textSecondary,
                  fontWeight: '700',
                },
              ]}
            >
              {profile?.interested_in_administrator ? 'Yes (Candidate)' : 'Sevak Only'}
            </Text>
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
          onPress={() => setIsLogoutModalOpen(true)}
          style={[styles.logoutCard, shadows.card]}
        >
          <LogoutIcon size={20} color={colors.statusEmergency} />
          <Text style={styles.logoutText}>Logout of Account</Text>
        </TouchableOpacity>

        {/* Section 5: App Branding & Version */}
        <View style={styles.aboutCard}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.aboutLogo}
            resizeMode="contain"
          />
          <Text style={styles.aboutTitle}>Jinaarya Vihar Seva</Text>
          <Text style={styles.aboutSub}>Vihar Setu • v1.0.0 (Production)</Text>
        </View>
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
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={modalScrollRef}
              contentContainerStyle={[
                styles.modalScroll,
                {
                  paddingBottom:
                    keyboardHeight > 0 ? keyboardHeight + 20 : spacing.lg,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {saveSuccessMsg ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>{saveSuccessMsg}</Text>
                </View>
              ) : null}

              <CustomTextInput
                label="Full Name *"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
              />

              {/* City (Fixed to Surat) */}
              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.selectBoxDisabled}>
                <Text style={styles.selectValueText}>Surat (Gujarat)</Text>
              </View>

              {/* Area Selection Menu */}
              <Text style={styles.inputLabel}>Area in Surat *</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAreaSearch('');
                  setAreaPickerOpen(true);
                }}
                style={styles.selectBox}
              >
                <Text style={styles.selectValueText}>{area}</Text>
                <Text style={styles.selectArrow}>▼</Text>
              </TouchableOpacity>

              <View style={styles.ageGenderRow}>
                <View style={styles.ageBox}>
                  <CustomTextInput
                    label="Age *"
                    placeholder="e.g. 35"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>

                <View style={styles.genderBox}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {['Female', 'Male'].map((g) => {
                      const isSel = gender === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setGender(g)}
                          style={[
                            styles.genderChip,
                            isSel && styles.genderChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.genderChipText,
                              isSel && styles.genderChipTextActive,
                            ]}
                          >
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

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
                label="Emergency Contact Person *"
                placeholder="Name of family member / Sangha coordinator"
                value={emergencyName}
                onChangeText={setEmergencyName}
                onFocus={() =>
                  setTimeout(
                    () =>
                      modalScrollRef.current?.scrollToEnd({ animated: true }),
                    100
                  )
                }
              />

              <CustomTextInput
                label="Emergency Contact Phone *"
                placeholder="10-digit mobile number"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                keyboardType="phone-pad"
                maxLength={10}
                onFocus={() =>
                  setTimeout(
                    () =>
                      modalScrollRef.current?.scrollToEnd({ animated: true }),
                    100
                  )
                }
              />

              {/* Administrator Interest Option (Phase 10 & 11) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setInterestedInAdmin(!interestedInAdmin)}
                style={[
                  styles.adminInterestBox,
                  interestedInAdmin && styles.adminInterestBoxActive,
                ]}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    interestedInAdmin && styles.checkboxBoxChecked,
                  ]}
                >
                  {interestedInAdmin ? (
                    <Text style={styles.checkboxTickText}>✓</Text>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminInterestTitle}>
                    Interested in becoming an Administrator
                  </Text>
                  <Text style={styles.adminInterestDesc}>
                    Volunteer to assist with local coordination, Sevak approvals, and regional monitoring.
                  </Text>
                </View>
              </TouchableOpacity>

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

      {/* AVATAR PICKER MODAL */}
      <Modal
        visible={isAvatarModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAvatarModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Spiritual Avatar</Text>
              <TouchableOpacity
                onPress={() => setIsAvatarModalOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarModalSub}>
              Select a sacred avatar representing your devotion during Vihar seva
            </Text>

            <View style={styles.avatarGrid}>
              {AVATAR_PRESETS.map((preset) => {
                const isSelected =
                  (profile?.avatar_url || selectedAvatarId) === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    activeOpacity={0.8}
                    onPress={() => handleSelectAvatar(preset)}
                    style={[
                      styles.avatarGridItem,
                      isSelected && styles.avatarGridItemActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatarCircleSmall,
                        { backgroundColor: preset.bgColor },
                        isSelected && { borderColor: colors.gold, borderWidth: 3 },
                      ]}
                    >
                      <Text style={styles.avatarInitialsSmall}>
                        {preset.initials}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.avatarGridLabel,
                        isSelected && styles.avatarGridLabelActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* NESTED AREA PICKER MODAL */}
      <Modal
        visible={areaPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAreaPickerOpen(false)}
      >
        <View style={styles.areaPickerOverlay}>
          <View style={[styles.areaPickerCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Area in Surat</Text>
              <TouchableOpacity
                onPress={() => setAreaPickerOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <TextInput
                placeholder="Search area..."
                placeholderTextColor={colors.textMuted}
                value={areaSearch}
                onChangeText={setAreaSearch}
                style={styles.searchInput}
              />
            </View>

            <FlatList
              data={filteredAreas}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.areaList}
              renderItem={({ item }) => {
                const isSelected = area === item;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setArea(item);
                      setAreaPickerOpen(false);
                    }}
                    style={[styles.areaItem, isSelected && styles.areaItemActive]}
                  >
                    <Text
                      style={[
                        styles.areaItemText,
                        isSelected && styles.areaItemTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected ? <Text style={styles.checkmarkText}>Active</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* LOGOUT CONFIRMATION DIALOG */}
      <ConfirmationDialog
        visible={isLogoutModalOpen}
        title="Logout Account"
        message="Are you sure you want to log out of Jinaarya Vihar Setu?"
        confirmText="Logout"
        cancelText="Cancel"
        isDestructive
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          logout();
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
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
    position: 'relative',
    padding: 4,
    borderRadius: 50,
    borderWidth: 2.5,
    borderColor: colors.gold,
    marginBottom: spacing.sm,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.h2,
    color: colors.warmIvory,
    fontWeight: '800',
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
  profileActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editProfileChip: {
    backgroundColor: colors.softCream,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  editProfileChipText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  avatarPickerChip: {
    backgroundColor: '#FFF8E7',
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  avatarPickerChipText: {
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
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
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
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  selectBoxDisabled: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  selectValueText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  selectArrow: {
    fontSize: 12,
    color: colors.deepMaroon,
  },
  ageGenderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ageBox: {
    flex: 1,
  },
  genderBox: {
    flex: 1.5,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: colors.deepMaroon,
    borderColor: colors.deepMaroon,
  },
  genderChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  genderChipTextActive: {
    color: colors.warmIvory,
    fontWeight: '700',
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

  /* AVATAR MODAL */
  avatarModalSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatarGridItem: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  avatarGridItemActive: {
    backgroundColor: '#FFF8E7',
    borderColor: colors.gold,
  },
  avatarCircleSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarInitialsSmall: {
    ...typography.bodyMedium,
    color: colors.warmIvory,
    fontWeight: '800',
  },
  avatarGridLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  avatarGridLabelActive: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },

  aboutCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    paddingVertical: spacing.md,
  },
  aboutLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: spacing.xs,
  },
  aboutTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  aboutSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* NESTED AREA PICKER */
  areaPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  areaPickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxHeight: '75%',
  },
  searchBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  searchInput: {
    paddingVertical: 10,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  areaList: {
    maxHeight: 320,
  },
  areaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  areaItemActive: {
    backgroundColor: '#FFF8E7',
    borderRadius: borderRadius.sm,
  },
  areaItemText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  areaItemTextActive: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  checkmarkText: {
    fontSize: 12,
    color: colors.statusSafe,
    fontWeight: '700',
  },
  adminInterestBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF5ED',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  adminInterestBoxActive: {
    backgroundColor: '#FFF8EC',
    borderColor: colors.saffron,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.saffron,
    borderColor: colors.saffron,
  },
  checkboxTickText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 16,
  },
  adminInterestTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  adminInterestDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
});
