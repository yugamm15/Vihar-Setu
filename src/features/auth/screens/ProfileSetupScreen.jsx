import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { AppHeader } from '../../../shared/components/AppHeader';
import { useAuthStore } from '../hooks/useAuthStore';
import { CITIES, SURAT_AREAS, BLOOD_GROUPS } from '../../../core/constants/locations';
import { t } from '../../../core/localization/i18n';

const LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'હિन्दी' },
  { code: 'en', label: 'English' },
];

export const ProfileSetupScreen = () => {
  const scrollViewRef = useRef(null);
  const { user, profile, updateProfileDetails, changeLanguage, language, isLoading } =
    useAuthStore();

  const userEmail = profile?.email || user?.email || '';
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(
    (profile?.phone || '').replace('+91', '')
  );
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [city, setCity] = useState(profile?.city || 'Surat');
  const [area, setArea] = useState(profile?.area || '');
  const [emergencyName, setEmergencyName] = useState(
    profile?.emergency_contact_name || ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    profile?.emergency_contact_phone || ''
  );
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || 'B+');
  const [errorMessage, setErrorMessage] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Selection Modals
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [areaSearchQuery, setAreaSearchQuery] = useState('');
  const [cityModalVisible, setCityModalVisible] = useState(false);

  const filteredAreas = SURAT_AREAS.filter((a) =>
    a.toLowerCase().includes(areaSearchQuery.toLowerCase().trim())
  );

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

  const handleScrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleSave = async () => {
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMessage(t('auth.invalid_phone'));
      return;
    }

    const parsedAge = parseInt(age.trim(), 10);
    if (isNaN(parsedAge) || parsedAge < 16 || parsedAge > 90) {
      setErrorMessage('Please enter a valid age between 16 and 90.');
      return;
    }

    if (!area.trim()) {
      setErrorMessage('Please select your area in Surat.');
      return;
    }

    const fullPhone = `+91${cleanPhone}`;
    const success = await updateProfileDetails({
      full_name: fullName.trim(),
      email: userEmail,
      phone: fullPhone,
      age: parsedAge,
      city: 'Surat',
      area: area.trim(),
      emergency_contact_name: emergencyName.trim(),
      emergency_contact_phone: emergencyPhone.trim(),
      blood_group: bloodGroup.trim(),
      preferred_language: language,
      status: 'PENDING',
    });

    if (!success) {
      const storeError = useAuthStore.getState().error;
      setErrorMessage(
        storeError ||
          'This mobile number is already registered with another account.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader title={t('profile_setup.title')} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              keyboardHeight > 0 ? keyboardHeight + 20 : spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>{t('profile_setup.title')}</Text>
          <Text style={styles.subtitle}>{t('profile_setup.subtitle')}</Text>

          {/* Language Selector */}
          <Text style={styles.sectionLabel}>
            {t('profile_setup.preferred_language')}
          </Text>
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

          {/* Email (Read only) */}
          <CustomTextInput
            label={t('profile_setup.email')}
            value={userEmail}
            editable={false}
            style={styles.readOnlyInput}
          />

          {/* Full Name */}
          <CustomTextInput
            label={t('profile_setup.full_name') + ' *'}
            placeholder={t('profile_setup.full_name_placeholder')}
            value={fullName}
            onChangeText={setFullName}
          />

          {/* Mobile Number */}
          <CustomTextInput
            label={t('profile_setup.phone') + ' *'}
            placeholder={t('profile_setup.phone_placeholder')}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={10}
            leftElement={
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
            }
          />

          {/* Age */}
          <CustomTextInput
            label={t('profile_setup.age') + ' *'}
            placeholder={t('profile_setup.age_placeholder')}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={3}
          />

          {/* City Selection (Fixed to Surat) */}
          <Text style={styles.inputLabel}>{t('profile_setup.city')} *</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCityModalVisible(true)}
            style={styles.selectBox}
          >
            <Text style={styles.selectValueText}>📍 {city}</Text>
            <Text style={styles.selectArrow}>▼</Text>
          </TouchableOpacity>

          {/* Area Selection Menu (Surat Areas) */}
          <Text style={styles.inputLabel}>{t('profile_setup.area')} *</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAreaSearchQuery('');
              setAreaModalVisible(true);
            }}
            style={[styles.selectBox, !area && styles.selectBoxEmpty]}
          >
            <Text style={area ? styles.selectValueText : styles.selectPlaceholderText}>
              {area ? `🏢 ${area}` : 'Select your area in Surat'}
            </Text>
            <Text style={styles.selectArrow}>▼</Text>
          </TouchableOpacity>

          {/* Blood Group Selection Chips */}
          <Text style={styles.inputLabel}>{t('profile_setup.blood_group')} *</Text>
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

          {/* Emergency Contact Name (Auto-scrolls into view on focus) */}
          <CustomTextInput
            label={t('profile_setup.emergency_contact_name')}
            placeholder={t('profile_setup.emergency_contact_name_placeholder')}
            value={emergencyName}
            onChangeText={setEmergencyName}
            onFocus={handleScrollToBottom}
          />

          {/* Emergency Contact Phone (Auto-scrolls into view on focus) */}
          <CustomTextInput
            label={t('profile_setup.emergency_contact_phone')}
            placeholder={t('profile_setup.emergency_contact_phone_placeholder')}
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            keyboardType="phone-pad"
            maxLength={10}
            onFocus={handleScrollToBottom}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <PrimaryButton
            title={t('profile_setup.submit_button')}
            onPress={handleSave}
            loading={isLoading}
            variant="saffron"
            style={styles.saveBtn}
          />
        </View>
      </ScrollView>

      {/* AREA SELECTION MODAL */}
      <Modal
        visible={areaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAreaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Area in Surat</Text>
              <TouchableOpacity
                onPress={() => setAreaModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search filter for areas */}
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                placeholder="Search area (e.g. Adajan, Vesu, Paldi...)"
                placeholderTextColor={colors.textMuted}
                value={areaSearchQuery}
                onChangeText={setAreaSearchQuery}
                style={styles.searchInput}
              />
              {areaSearchQuery ? (
                <TouchableOpacity onPress={() => setAreaSearchQuery('')}>
                  <Text style={styles.clearSearch}>✕</Text>
                </TouchableOpacity>
              ) : null}
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
                    activeOpacity={0.7}
                    onPress={() => {
                      setArea(item);
                      setAreaModalVisible(false);
                    }}
                    style={[
                      styles.areaItem,
                      isSelected && styles.areaItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.areaItemText,
                        isSelected && styles.areaItemTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected ? (
                      <Text style={styles.checkmarkText}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* CITY SELECTION MODAL */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardSmall, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity
                onPress={() => setCityModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  setCity(c);
                  setCityModalVisible(false);
                }}
                style={styles.cityItem}
              >
                <Text style={styles.cityItemText}>📍 {c} (Gujarat)</Text>
                <Text style={styles.checkmarkText}>✓</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  langRow: {
    flexDirection: 'row',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  langChip: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: colors.deepMaroon,
  },
  langChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  langChipTextActive: {
    color: colors.warmIvory,
  },
  readOnlyInput: {
    backgroundColor: '#F8F9FA',
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: spacing.xs,
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
  selectBoxEmpty: {
    borderColor: colors.cardBorder,
    backgroundColor: '#FAFAFA',
  },
  selectValueText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  selectPlaceholderText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  selectArrow: {
    fontSize: 12,
    color: colors.deepMaroon,
  },
  bloodChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  bloodChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
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
    fontWeight: '700',
  },
  bloodChipTextActive: {
    color: colors.warmIvory,
  },
  countryCodeBadge: {
    paddingRight: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: colors.inputBorder,
    marginRight: spacing.xs,
  },
  countryCodeText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.statusEmergency,
    marginVertical: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.md,
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
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalCardSmall: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  clearSearch: {
    fontSize: 16,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  areaList: {
    maxHeight: 380,
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
    fontSize: 16,
    color: colors.statusSafe,
    fontWeight: '700',
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFF8E7',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.saffron,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  cityItemText: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
});
