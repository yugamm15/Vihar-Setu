import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { LogoutIcon } from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';

const MORE_OPTIONS = [
  { id: 'settings', title: 'Settings', subtitle: 'App preferences and controls' },
  { id: 'language', title: 'Language (ભાષા / भाषा)', subtitle: 'ગુજરાતી / हिन्दी / English' },
  { id: 'theme', title: 'Theme', subtitle: 'Jain Spiritual Light / Dark Mode' },
  { id: 'notifications', title: 'Notifications', subtitle: 'Vihar and safety alerts' },
  { id: 'alarm', title: 'Alarm & Voice Alerts', subtitle: 'Audio alerts and SOS tones' },
  { id: 'gps', title: 'GPS & Tracking Engine', subtitle: 'Battery optimization and telemetry' },
  { id: 'privacy', title: 'Privacy Policy', subtitle: 'Data protection and trust' },
  { id: 'help', title: 'Help & Support', subtitle: '24x7 Sevak community helpline' },
  { id: 'about', title: 'About Vihar Setu', subtitle: 'Version 1.0.0 • Jinaarya Vihar Seva' },
];

export const SevakMoreScreen = () => {
  const { logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader title="More Options" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, shadows.card]}>
          {MORE_OPTIONS.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity activeOpacity={0.7} style={styles.optionRow}>
                <View style={styles.textContainer}>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              {index < MORE_OPTIONS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Logout Option */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          style={[styles.logoutCard, shadows.card]}
        >
          <LogoutIcon size={20} color={colors.statusEmergency} />
          <Text style={styles.logoutText}>Logout of Account</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
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
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.statusEmergency,
    fontWeight: '700',
  },
});
