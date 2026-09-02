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
import { LogoutIcon } from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { t } from '../../../core/localization/i18n';

export const SuperAdminDashboardScreen = ({ navigation }) => {
  const { profile, logout } = useAuthStore();

  const superAdminModules = [
    {
      id: 'users',
      title: t('super_admin.user_management'),
      desc: 'Approve, verify, assign roles & disable users',
      icon: '👥',
      actionText: 'Manage Sevaks & Admins',
    },
    {
      id: 'config',
      title: t('super_admin.system_config'),
      desc: 'GPS frequency, deviation threshold (50m), stationary timeout',
      icon: '⚙️',
      actionText: 'Tune Parameters',
    },
    {
      id: 'audit',
      title: t('super_admin.audit_logs'),
      desc: 'Security event logs, role changes, emergency triggers',
      icon: '📜',
      actionText: 'View Audit Trail',
    },
    {
      id: 'analytics',
      title: t('super_admin.analytics'),
      desc: 'Vihar volume, distance covered, incident resolution charts',
      icon: '📊',
      actionText: 'Open Analytics',
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
            onPress={logout}
            style={styles.logoutBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LogoutIcon size={20} color={colors.warmIvory} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.banner, shadows.subtle]}>
          <Text style={styles.bannerBadge}>CENTRAL GOVERNANCE</Text>
          <Text style={styles.bannerTitle}>System Control & Security Center</Text>
          <Text style={styles.bannerDesc}>
            Manage global security policies, multi-admin escalations, and Vihar telemetry settings.
          </Text>
        </View>

        {superAdminModules.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => alert(`Opening ${item.title} (Phase 23/24/25)`)}
            style={[styles.moduleCard, shadows.card]}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconCircle}>
                <Text style={styles.moduleIconText}>{item.icon}</Text>
              </View>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{item.title}</Text>
                <Text style={styles.moduleDesc}>{item.desc}</Text>
              </View>
            </View>
            <Text style={styles.arrowChevron}>➔</Text>
          </TouchableOpacity>
        ))}
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
    backgroundColor: colors.softCream,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIconText: {
    fontSize: 22,
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
  },
  arrowChevron: {
    fontSize: 18,
    color: colors.saffron,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
});
