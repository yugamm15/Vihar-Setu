import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import {
  LogoutIcon,
  UsersGroupIcon,
  SettingsGearIcon,
  LogsFileIcon,
  ReportsChartIcon,
  CheckCircleIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useAlertStore } from '../../../shared/hooks/useAlertStore';
import { t } from '../../../core/localization/i18n';

export const SuperAdminDashboardScreen = ({ navigation }) => {
  const { profile, logout } = useAuthStore();
  const { showAlert } = useAlertStore();

  const handleLogout = () => {
    showAlert({
      type: 'CONFIRM',
      title: 'Logout Super Admin',
      message: 'Are you sure you want to end your Super Admin session on this device?',
      confirmText: 'Yes, Logout',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  const superAdminModules = [
    {
      id: 'users',
      title: 'User & Sevak Verification',
      desc: 'Approve, verify, assign roles & disable volunteer accounts',
      icon: UsersGroupIcon,
      bgColor: '#E8F5E9',
      iconColor: colors.statusSafe,
      targetTab: 'RequestsTab',
    },
    {
      id: 'live',
      title: 'Real-Time Vihar Radar',
      desc: 'Live GPS corridor tracking, deviation detection & emergency signals',
      icon: ReportsChartIcon,
      bgColor: '#FFF8E7',
      iconColor: colors.saffronDark,
      targetTab: 'LiveTab',
    },
    {
      id: 'alerts',
      title: 'Emergency SOS & Alerts Center',
      desc: 'High-priority SOS escalations, stationary alarms & route issues',
      icon: LogsFileIcon,
      bgColor: '#FFEBEE',
      iconColor: colors.statusEmergency,
      targetTab: 'AlertsTab',
    },
    {
      id: 'config',
      title: 'System Settings & Telemetry Limits',
      desc: 'GPS frequency, 50m deviation threshold, stationary timeout',
      icon: SettingsGearIcon,
      bgColor: '#E3F2FD',
      iconColor: '#1976D2',
      targetTab: 'MoreTab',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      <AppHeader
        title={t('super_admin.dashboard_title')}
        subtitle={profile?.full_name || 'Super Administrator'}
        showLogo={true}
        rightElement={
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LogoutIcon size={20} color={colors.warmIvory} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, shadows.subtle]}>
          <Text style={styles.bannerBadge}>CENTRAL GOVERNANCE</Text>
          <Text style={styles.bannerTitle}>System Control & Security Center</Text>
          <Text style={styles.bannerDesc}>
            Manage global security policies, multi-admin escalations, and Vihar telemetry settings.
          </Text>
        </View>

        {superAdminModules.map((item) => {
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(item.targetTab)}
              style={[styles.moduleCard, shadows.card]}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                  <IconComp size={22} color={item.iconColor} />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{item.title}</Text>
                  <Text style={styles.moduleDesc}>{item.desc}</Text>
                </View>
              </View>
              <Text style={styles.arrowChevron}>›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  logoutBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  banner: {
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bannerBadge: {
    ...typography.caption,
    color: colors.goldLight,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  bannerTitle: {
    ...typography.h3,
    color: colors.warmIvory,
  },
  bannerDesc: {
    ...typography.bodySmall,
    color: colors.goldMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
  },
  moduleDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  arrowChevron: {
    fontSize: 22,
    color: colors.saffron,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
});
