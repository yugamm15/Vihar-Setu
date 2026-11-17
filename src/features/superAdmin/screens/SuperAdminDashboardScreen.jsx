import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { NotificationBellButton } from '../../notifications/components/NotificationBellButton';
import { AreaManagementModal } from '../components/AreaManagementModal';
import { superAdminDashboardService } from '../services/superAdminDashboardService';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useAlertStore } from '../../../shared/hooks/useAlertStore';
import {
  SettingsGearIcon,
  LogoutIcon,
  ShieldIcon,
  UsersGroupIcon,
  AlertsBellIcon,
  NavigationIcon,
  LiveRadarIcon,
  ReportsChartIcon,
  MapPinIcon,
  UserIcon,
  LogsFileIcon,
} from '../../../shared/components/CustomSvgIcons';
import { t } from '../../../core/localization/i18n';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const StatCard = ({ label, value, accent = colors.deepMaroon }) => (
  <View style={[styles.statCard, shadows.card]}>
    <Text style={styles.statValue}>{value === null ? '—' : value}</Text>
    <Text style={[styles.statLabel, { color: accent }]}>{label}</Text>
  </View>
);

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const value = (metric) => (metric === null ? '—' : metric);

export const SuperAdminDashboardScreen = ({ navigation }) => {
  const { profile, logout } = useAuthStore();
  const { showAlert } = useAlertStore();
  const [dashboard, setDashboard] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const result = await superAdminDashboardService.fetchDashboard();
      setDashboard(result.data);
      setErrors(result.errors);
    } catch (error) {
      setErrors([{ section: 'dashboard', message: error.message }]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const showUnavailable = (moduleName) => {
    showAlert({
      type: 'INFO',
      title: moduleName,
      message: 'This dedicated Super Admin module is not available yet.',
      confirmText: 'OK',
    });
  };

  const handleLogout = () => {
    showAlert({
      type: 'CONFIRM',
      title: 'Logout Super Admin',
      message: 'Are you sure you want to end your Super Admin session on this device?',
      confirmText: 'Yes, Logout',
      cancelText: 'Cancel',
      onConfirm: logout,
    });
  };

  const organization = dashboard?.organization;
  const operations = dashboard?.operations;
  const safety = dashboard?.safety;
  const superAdminModules = [
    {
      id: 'governance',
      labelKey: 'governance',
      desc: 'Policy & security',
      Icon: ShieldIcon,
      color: colors.deepMaroon,
      bg: '#FFF5F5',
      onPress: () => navigation.navigate('SuperAdminGovernance'),
    },
    {
      id: 'users',
      labelKey: 'users',
      desc: 'Directory & approvals',
      Icon: UsersGroupIcon,
      color: colors.statusSafe,
      bg: '#E8F5E9',
      onPress: () => navigation.navigate('UsersTab'),
    },
    {
      id: 'monitoring',
      labelKey: 'monitoring',
      desc: 'Live safety & telemetry',
      Icon: AlertsBellIcon,
      color: colors.statusEmergency,
      bg: '#FFEBEE',
      onPress: () => navigation.navigate('SuperAdminMonitoring'),
    },
    {
      id: 'vihars',
      labelKey: 'vihars',
      desc: 'Operations & tracking',
      Icon: NavigationIcon,
      color: colors.saffronDark,
      bg: '#FFF8E7',
      onPress: () => navigation.navigate('SuperAdminViharManagement'),
    },
    {
      id: 'communication',
      labelKey: 'communication',
      desc: 'Broadcasts & alerts',
      Icon: LiveRadarIcon,
      color: '#1976D2',
      bg: '#E3F2FD',
      onPress: () => navigation.navigate('SuperAdminCommunication'),
    },
    {
      id: 'reports',
      labelKey: 'reports',
      desc: 'Metrics & analytics',
      Icon: ReportsChartIcon,
      color: '#7B1FA2',
      bg: '#F3E5F5',
      onPress: () => navigation.navigate('SuperAdminReports'),
    },
    {
      id: 'areas',
      labelKey: 'areas',
      desc: 'Jurisdictions & sectors',
      Icon: MapPinIcon,
      color: colors.saffronDark,
      bg: '#FFF3E0',
      onPress: () => navigation.navigate('AreaTab'),
    },
    {
      id: 'administrators',
      labelKey: 'administrators',
      desc: 'Regional officers',
      Icon: UserIcon,
      color: colors.deepMaroon,
      bg: '#FBE9E7',
      onPress: () => navigation.navigate('SuperAdminAdministrators'),
    },
    {
      id: 'audit',
      labelKey: 'audit',
      desc: 'Security audit trail',
      Icon: LogsFileIcon,
      color: '#455A64',
      bg: '#ECEFF1',
      onPress: () => navigation.navigate('SuperAdminAuditLogs'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title={t('super_admin.dashboard_title')}
        subtitle={profile?.full_name || 'Super Administrator'}
        showLogo
        rightElement={
          <View style={styles.headerActions}>
            <NotificationBellButton />
            <TouchableOpacity onPress={() => showUnavailable('Profile & Settings')} style={styles.headerButton}>
              <SettingsGearIcon size={20} color={colors.warmIvory} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
              <LogoutIcon size={20} color={colors.warmIvory} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadDashboard(true)} tintColor={colors.saffron} />}
      >
        <View style={[styles.banner, shadows.subtle]}>
          <Text style={styles.bannerBadge}>{t('super_admin.labels.central_governance')}</Text>
          <Text style={styles.bannerTitle}>{t('super_admin.labels.system_control')}</Text>
          <Text style={styles.bannerDesc}>{t('super_admin.labels.live_data')}</Text>
        </View>

        {errors.length > 0 && (
          <View style={styles.partialError}>
            <Text style={styles.partialErrorTitle}>{t('super_admin.partial_data')}</Text>
            <Text style={styles.partialErrorText}>{t('super_admin.partial_data_message')}</Text>
            <TouchableOpacity onPress={() => loadDashboard(true)}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>{t('super_admin.common.loading')}</Text>
          </View>
        ) : dashboard ? (
          <>
            <Section title={t('super_admin.labels.organization')}>
              <View style={styles.grid}>
                <StatCard label={t('super_admin.labels.total_users')} value={value(organization.totalUsers)} />
                <StatCard label={t('super_admin.labels.sevaks')} value={value(organization.totalSevaks)} accent={colors.statusSafe} />
                <StatCard label={t('super_admin.labels.administrators')} value={value(organization.totalAdministrators)} accent={colors.saffron} />
                <StatCard label={t('super_admin.labels.super_administrators')} value={value(organization.totalSuperAdministrators)} accent={colors.gold} />
                <StatCard label={t('super_admin.labels.active_accounts')} value={value(organization.activeAccounts)} accent={colors.statusSafe} />
                <StatCard label={t('super_admin.labels.disabled_accounts')} value={value(organization.disabledAccounts)} accent={colors.statusEmergency} />
                <StatCard label={t('super_admin.labels.pending_registrations')} value={value(organization.pendingRegistrations)} accent={colors.saffron} />
              </View>
            </Section>

            <Section title={t('super_admin.labels.operations')}>
              <View style={styles.grid}>
                <StatCard label={t('super_admin.labels.active_areas')} value={value(operations.totalAreas)} />
                <StatCard label={t('super_admin.labels.active_vihars')} value={value(operations.activeVihars)} accent={colors.statusSafe} />
                <StatCard label={t('super_admin.labels.active_sub_vihars')} value={value(operations.activeSubVihars)} accent={colors.saffron} />
                <StatCard label={t('super_admin.labels.completed_vihars')} value={value(operations.completedVihars)} accent={colors.gold} />
                <StatCard label={t('super_admin.labels.cities')} value={value(operations.totalCities)} accent={colors.textSecondary} />
              </View>
            </Section>

            <Section title={t('super_admin.labels.safety')}>
              <View style={styles.grid}>
                <StatCard label={t('super_admin.labels.active_emergencies')} value={value(safety.activeEmergencies)} accent={colors.statusEmergency} />
                <StatCard label={t('super_admin.labels.route_deviations')} value={value(safety.routeDeviations)} accent={colors.saffron} />
                <StatCard label={t('super_admin.labels.active_holds')} value={value(safety.activeHolds)} accent={colors.gold} />
                <StatCard label={t('super_admin.labels.handovers_week')} value={value(safety.recentHandovers)} accent={colors.statusSafe} />
                <StatCard label={t('super_admin.labels.offline_devices')} value={value(safety.offlineDevices)} accent={colors.statusEmergency} />
              </View>
            </Section>

            <Section title={t('super_admin.recent_activity')}>
              {dashboard.recentActivity.length === 0 ? (
                <Text style={styles.emptyText}>{t('super_admin.no_activity')}</Text>
              ) : dashboard.recentActivity.map((item) => (
                <View key={item.id} style={styles.activityRow}>
                  <View style={styles.activityType}><Text style={styles.activityTypeText}>{item.type}</Text></View>
                  <View style={styles.activityInfo}><Text style={styles.activityTitle}>{item.title}</Text><Text style={styles.activityDetail}>{item.detail}</Text></View>
                  <Text style={styles.activityDate}>{formatDate(item.timestamp)}</Text>
                </View>
              ))}
            </Section>

            <Section title={t('super_admin.modules')}>
              <View style={styles.quickGrid}>
                {superAdminModules.map((item) => {
                  const { Icon } = item;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.quickLink, shadows.subtle]}
                      onPress={item.onPress}
                      activeOpacity={0.75}
                    >
                      <View style={styles.quickLinkHeader}>
                        <View style={[styles.moduleIconCircle, { backgroundColor: item.bg }]}>
                          <Icon size={18} color={item.color} />
                        </View>
                        <Text style={styles.quickLinkArrow}>›</Text>
                      </View>
                      <Text style={styles.quickLinkText} numberOfLines={1}>
                        {t(`super_admin.labels.${item.labelKey}`)}
                      </Text>
                      <Text style={styles.quickLinkDesc} numberOfLines={1}>
                        {item.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Dashboard data could not be loaded.</Text>
            <TouchableOpacity onPress={() => loadDashboard()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AreaManagementModal visible={isAreaModalOpen} onClose={() => setIsAreaModalOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerButton: { padding: spacing.xs },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  banner: { backgroundColor: colors.deepMaroon, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  bannerBadge: { ...typography.caption, color: colors.goldLight, fontWeight: '800', letterSpacing: 1.2 },
  bannerTitle: { ...typography.h3, color: colors.warmIvory, marginTop: 4 },
  bannerDesc: { ...typography.bodySmall, color: colors.goldMuted, marginTop: 4, lineHeight: 18 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, width: '31%', minWidth: 96, flexGrow: 1 },
  statValue: { ...typography.h3, color: colors.deepMaroon, fontWeight: '800' },
  statLabel: { ...typography.caption, marginTop: 4, lineHeight: 15 },
  partialError: { backgroundColor: '#FFF8E7', borderColor: colors.saffron, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg },
  partialErrorTitle: { ...typography.body, color: colors.deepMaroon, fontWeight: '700' },
  partialErrorText: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  retryText: { color: colors.deepMaroon, fontWeight: '700', marginTop: spacing.sm },
  loading: { alignItems: 'center', padding: spacing.xxxl },
  loadingText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.md },
  emptyState: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { ...typography.bodySmall, color: colors.textSecondary, padding: spacing.md },
  activityRow: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  activityType: { backgroundColor: colors.softCream, borderRadius: borderRadius.sm, paddingHorizontal: spacing.xs, paddingVertical: 3 },
  activityTypeText: { fontSize: 9, color: colors.deepMaroon, fontWeight: '800' },
  activityInfo: { flex: 1, marginLeft: spacing.sm },
  activityTitle: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700' },
  activityDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  activityDate: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickLink: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    width: '48%',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  quickLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  moduleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkArrow: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '700',
  },
  quickLinkText: {
    ...typography.bodySmall,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  quickLinkDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
});
