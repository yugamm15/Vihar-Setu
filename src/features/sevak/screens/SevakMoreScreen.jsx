import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Linking,
  Switch,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';
import {
  LogoutIcon,
  CloseIcon,
  SettingsGearIcon,
  HelpCircleIcon,
  InfoIcon,
  ShieldIcon,
  AlertsBellIcon,
  NavigationIcon,
  CheckCircleIcon,
  PhoneIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useAlertStore } from '../../../shared/hooks/useAlertStore';
import { setAppLanguage, getAppLanguage, t } from '../../../core/localization/i18n';

export const SevakMoreScreen = ({ navigation }) => {
  const { profile, logout } = useAuthStore();
  const { showAlert } = useAlertStore();

  const [activeModal, setActiveModal] = useState(null); // 'LANGUAGE' | 'ALARM' | 'GPS' | 'GUIDELINES' | 'HELP' | 'ABOUT'
  const [currentLang, setCurrentLang] = useState(getAppLanguage());

  // Alarm & Settings state
  const [alarm30MinEnabled, setAlarm30MinEnabled] = useState(true);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  const [highAccuracyGps, setHighAccuracyGps] = useState(true);

  const handleLanguageChange = async (langCode) => {
    await setAppLanguage(langCode);
    setCurrentLang(langCode);
    setActiveModal(null);
    showAlert({
      type: 'SUCCESS',
      title: 'Language Updated',
      message:
        langCode === 'gu'
          ? 'ભાષા સફળતાપૂર્વક ગુજરાતીમાં બદલાઈ ગઈ છે.'
          : langCode === 'hi'
          ? 'भाषा सफलतापूर्वक हिन्दी में बदल दी गई है।'
          : 'Application language updated to English.',
      confirmText: 'OK',
    });
  };

  const handleCallHelpline = () => {
    Linking.openURL('tel:+919876500000');
  };

  const confirmLogout = () => {
    showAlert({
      type: 'CONFIRM',
      title: 'Logout of Account',
      message: 'Are you sure you want to sign out of Vihar Setu on this device?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="More Options"
        subtitle={profile?.full_name || 'Vihar Sevika'}
        showLogo
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Summary */}
        <View style={[styles.profileCard, shadows.card]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {profile?.full_name ? profile.full_name[0].toUpperCase() : 'S'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name || 'Vihar Sevika'}</Text>
            <Text style={styles.profilePhone}>{profile?.phone || '—'}</Text>
            <View style={styles.statusBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.statusText}>VERIFIED SEVIKA</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Preferences & Controls */}
        <Text style={styles.sectionHeader}>Preferences & Controls</Text>
        <View style={[styles.menuCard, shadows.card]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveModal('LANGUAGE')}
            style={styles.menuItem}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
              <SettingsGearIcon size={20} color={colors.saffronDark} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Language (ભાષા / भाषा)</Text>
              <Text style={styles.menuSub}>
                {currentLang === 'gu'
                  ? 'ગુજરાતી (Gujarati)'
                  : currentLang === 'hi'
                  ? 'हिन्दी (Hindi)'
                  : 'English'}
              </Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveModal('ALARM')}
            style={styles.menuItem}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
              <AlertsBellIcon size={20} color={colors.statusEmergency} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Alarm & Voice Alerts</Text>
              <Text style={styles.menuSub}>30-min pre-vihar alarm, chimes & voice</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveModal('GPS')}
            style={styles.menuItem}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <NavigationIcon size={20} color="#1976D2" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>GPS & Telemetry Settings</Text>
              <Text style={styles.menuSub}>Battery optimization & accuracy</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Safety & Sacred Protocol */}
        <Text style={styles.sectionHeader}>Safety & Guidelines</Text>
        <View style={[styles.menuCard, shadows.card]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveModal('GUIDELINES')}
            style={styles.menuItem}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <ShieldIcon size={20} color={colors.statusSafe} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Vihar Safety Guidelines</Text>
              <Text style={styles.menuSub}>Walking etiquette, seva checklist & safety</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveModal('HELP')}
            style={styles.menuItem}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFF8E7' }]}>
              <HelpCircleIcon size={20} color={colors.goldDark} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>24x7 Emergency Helpline</Text>
              <Text style={styles.menuSub}>Direct line to Surat Vihar Seva team</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveModal('ABOUT')}
            style={styles.menuItem}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.softCream }]}>
              <InfoIcon size={20} color={colors.deepMaroon} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>About Vihar Setu</Text>
              <Text style={styles.menuSub}>Version 1.0.0 • Jinaarya Vihar Seva</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={confirmLogout}
          style={[styles.logoutCard, shadows.card]}
        >
          <LogoutIcon size={20} color={colors.statusEmergency} />
          <Text style={styles.logoutText}>Logout of Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* LANGUAGE MODAL */}
      <Modal
        visible={activeModal === 'LANGUAGE'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Application Language</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.langOption, currentLang === 'gu' && styles.langOptionActive]}
              onPress={() => handleLanguageChange('gu')}
            >
              <Text style={styles.langNative}>ગુજરાતી</Text>
              <Text style={styles.langSub}>Gujarati (Primary Jain Seva)</Text>
              {currentLang === 'gu' && <CheckCircleIcon size={20} color={colors.saffron} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, currentLang === 'hi' && styles.langOptionActive]}
              onPress={() => handleLanguageChange('hi')}
            >
              <Text style={styles.langNative}>हिन्दी</Text>
              <Text style={styles.langSub}>Hindi (National)</Text>
              {currentLang === 'hi' && <CheckCircleIcon size={20} color={colors.saffron} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, currentLang === 'en' && styles.langOptionActive]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.langNative}>English</Text>
              <Text style={styles.langSub}>English (International)</Text>
              {currentLang === 'en' && <CheckCircleIcon size={20} color={colors.saffron} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ALARM & VOICE ALERTS MODAL */}
      <Modal
        visible={activeModal === 'ALARM'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alarm & Voice Settings</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>30-Min Pre-Vihar Alarm</Text>
                <Text style={styles.settingDesc}>
                  Play wake-up chime and show Seva checklist 30 minutes before scheduled departure.
                </Text>
              </View>
              <Switch
                value={alarm30MinEnabled}
                onValueChange={setAlarm30MinEnabled}
                trackColor={{ false: '#DDD', true: colors.saffron }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Voice Navigation Guidance</Text>
                <Text style={styles.settingDesc}>
                  Speak audio prompts for route turns, stationary checks, and deviations.
                </Text>
              </View>
              <Switch
                value={voiceAlertsEnabled}
                onValueChange={setVoiceAlertsEnabled}
                trackColor={{ false: '#DDD', true: colors.saffron }}
              />
            </View>

            <PrimaryButton
              title="Save Preferences"
              onPress={() => {
                setActiveModal(null);
                showAlert({
                  type: 'SUCCESS',
                  title: 'Settings Saved',
                  message: 'Alarm and voice notification settings updated.',
                });
              }}
              variant="saffron"
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </Modal>

      {/* GPS & BATTERY MODAL */}
      <Modal
        visible={activeModal === 'GPS'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GPS & Telemetry Engine</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Background Battery Optimization</Text>
              <Text style={styles.infoBoxText}>
                Android may put inactive apps to sleep. For seamless Vihar tracking, ensure Vihar Setu has "Unrestricted" battery usage enabled in your device system settings.
              </Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>High-Accuracy Telemetry</Text>
                <Text style={styles.settingDesc}>5-second GPS updates during active walking.</Text>
              </View>
              <Switch
                value={highAccuracyGps}
                onValueChange={setHighAccuracyGps}
                trackColor={{ false: '#DDD', true: colors.saffron }}
              />
            </View>

            <PrimaryButton
              title="Got It"
              onPress={() => setActiveModal(null)}
              variant="saffron"
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </Modal>

      {/* GUIDELINES MODAL */}
      <Modal
        visible={activeModal === 'GUIDELINES'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vihar Safety Guidelines</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              <View style={styles.guidelineCard}>
                <Text style={styles.guideNumber}>1</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideTitle}>Punya Marg & Footwear</Text>
                  <Text style={styles.guideText}>
                    Always walk barefoot accompanying Sadhviji Bhagwant, maintaining continuous vigilance on the path.
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineCard}>
                <Text style={styles.guideNumber}>2</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideTitle}>Route Adherence</Text>
                  <Text style={styles.guideText}>
                    Stick strictly to the verified planned route. If you deviate more than 50 meters, the system will alert you and notify administrators.
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineCard}>
                <Text style={styles.guideNumber}>3</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideTitle}>Emergency SOS</Text>
                  <Text style={styles.guideText}>
                    In case of health emergency, vehicle harassment, or obstacle, press the SOS button for 2 seconds to broadcast instant alarm to all nearby admins.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <PrimaryButton
              title="Understood"
              onPress={() => setActiveModal(null)}
              variant="saffron"
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </Modal>

      {/* HELP & 24x7 HELPLINE MODAL */}
      <Modal
        visible={activeModal === 'HELP'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>24x7 Emergency Helpline</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <View style={styles.helplineBox}>
              <Text style={styles.helplineTitle}>Surat Vihar Seva Central Helpdesk</Text>
              <Text style={styles.helplineSub}>Available 24 hours during all active Vihar schedules</Text>
              <TouchableOpacity
                style={styles.callNowBtn}
                onPress={handleCallHelpline}
                activeOpacity={0.85}
              >
                <PhoneIcon size={20} color="#FFFFFF" />
                <Text style={styles.callNowText}>Call Helpline (+91 98765 00000)</Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="Close"
              onPress={() => setActiveModal(null)}
              variant="maroon"
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </Modal>

      {/* ABOUT MODAL */}
      <Modal
        visible={activeModal === 'ABOUT'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Vihar Setu</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutName}>જિનાર્ય વિહાર સેતુ (Vihar Setu)</Text>
              <Text style={styles.aboutTagline}>
                Sacred Sadhviji Vihar Safety Telemetry & Real-Time Coordination Platform
              </Text>
              <View style={styles.divider} />
              <Text style={styles.aboutDetail}>Organization: <Text style={styles.boldText}>Jinaarya Vihar Seva Group, Surat</Text></Text>
              <Text style={styles.aboutDetail}>Version: <Text style={styles.boldText}>1.0.0 Production</Text></Text>
              <Text style={styles.aboutDetail}>Developers: <Text style={styles.boldText}>Yugam Kothari & Jainish Patel</Text></Text>
              <Text style={styles.aboutDetail}>Guide: <Text style={styles.boldText}>Mr. Hardik Vyas (BMIIT, UTU)</Text></Text>
            </View>

            <PrimaryButton
              title="Close"
              onPress={() => setActiveModal(null)}
              variant="saffron"
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.h3,
    color: colors.warmIvory,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  profilePhone: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.statusSafe,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.statusSafe,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  menuSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginLeft: 56,
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
    borderColor: 'rgba(189, 44, 44, 0.3)',
    marginTop: spacing.xs,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.statusEmergency,
    fontWeight: '700',
  },
  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
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
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
    backgroundColor: colors.softCream,
  },
  langOptionActive: {
    borderColor: colors.saffron,
    backgroundColor: '#FFF8E7',
  },
  langNative: {
    ...typography.bodyLarge,
    color: colors.deepMaroon,
    fontWeight: '700',
    flex: 1,
  },
  langSub: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingLabel: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  settingDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  infoBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  infoBoxTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoBoxText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  guidelineCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  guideNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.saffron,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 12,
  },
  guideTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    marginBottom: 2,
  },
  guideText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  helplineBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  helplineTitle: {
    ...typography.bodyLarge,
    color: colors.deepMaroon,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  helplineSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  callNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.statusEmergency,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  callNowText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  aboutCard: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  aboutName: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  aboutTagline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  aboutDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingVertical: 3,
  },
  boldText: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  modalActionBtn: {
    marginTop: spacing.md,
    width: '100%',
  },
});
