import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { AppHeader } from '../../../shared/components/AppHeader';
import { useAuthStore } from '../hooks/useAuthStore';
import { t } from '../../../core/localization/i18n';

const LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
];

export const ProfileSetupScreen = () => {
  const { profile, updateProfileDetails, changeLanguage, language, isLoading } =
    useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [city, setCity] = useState(profile?.city || '');
  const [emergencyName, setEmergencyName] = useState(
    profile?.emergency_contact_name || ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    profile?.emergency_contact_phone || ''
  );
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group || '');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setErrorMessage('');
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const success = await updateProfileDetails({
      full_name: fullName.trim(),
      city: city.trim(),
      emergency_contact_name: emergencyName.trim(),
      emergency_contact_phone: emergencyPhone.trim(),
      blood_group: bloodGroup.trim(),
      preferred_language: language,
    });

    if (!success) {
      setErrorMessage('Could not update profile. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader title={t('profile_setup.title')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>{t('profile_setup.title')}</Text>
          <Text style={styles.subtitle}>{t('profile_setup.subtitle')}</Text>

          {/* Language Selector */}
          <Text style={styles.sectionLabel}>{t('profile_setup.preferred_language')}</Text>
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

          <CustomTextInput
            label={t('profile_setup.full_name')}
            placeholder={t('profile_setup.full_name_placeholder')}
            value={fullName}
            onChangeText={setFullName}
          />

          <CustomTextInput
            label={t('profile_setup.city')}
            placeholder={t('profile_setup.city_placeholder')}
            value={city}
            onChangeText={setCity}
          />

          <CustomTextInput
            label={t('profile_setup.emergency_contact_name')}
            placeholder={t('profile_setup.emergency_contact_name_placeholder')}
            value={emergencyName}
            onChangeText={setEmergencyName}
          />

          <CustomTextInput
            label={t('profile_setup.emergency_contact_phone')}
            placeholder={t('profile_setup.emergency_contact_phone_placeholder')}
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <CustomTextInput
            label={t('profile_setup.blood_group')}
            placeholder={t('profile_setup.blood_group_placeholder')}
            value={bloodGroup}
            onChangeText={setBloodGroup}
            maxLength={5}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <PrimaryButton
            title={t('profile_setup.complete_button')}
            onPress={handleSave}
            loading={isLoading}
            variant="saffron"
            style={styles.saveBtn}
          />
        </View>
      </ScrollView>
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
    paddingBottom: spacing.xxxl,
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
  errorText: {
    ...typography.bodySmall,
    color: colors.statusEmergency,
    marginVertical: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
});
