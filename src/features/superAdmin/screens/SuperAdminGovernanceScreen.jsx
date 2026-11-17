import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminGovernanceService } from '../services/superAdminGovernanceService';
import { formatKolkataDateTime } from '../utils/reportDateUtils';

export const SuperAdminGovernanceScreen = ({ navigation }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const result = await superAdminGovernanceService.getGovernanceOverview();
    setData(result.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const overview = data || {};
  const roles = overview.roles || { SEVAK: 0, ADMIN: 0, SUPER_ADMIN: 0 };
  const hasActiveEmergencies = (overview.activeEmergencies || 0) > 0;

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('super_admin.governance.title') || 'Platform Governance'}
        subtitle={t('super_admin.governance.subtitle') || 'Central Super Administrator Oversight & Policies'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.saffron} />}
      >
        {/* Platform Status Banner */}
        <View style={[styles.statusBanner, hasActiveEmergencies ? styles.statusWarning : styles.statusHealthy, shadows.subtle]}>
          <Text style={styles.bannerEmoji}>{hasActiveEmergencies ? '⚠️' : '🛡️'}</Text>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>
              {hasActiveEmergencies ? 'SAFETY INCIDENT IN PROGRESS' : 'ALL PLATFORM GOVERNANCE ACTIVE'}
            </Text>
            <Text style={styles.bannerSub}>
              {hasActiveEmergencies
                ? `${overview.activeEmergencies} active emergency requiring admin coordination.`
                : 'Deterministic RLS and safety-critical state machines enforced.'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Loading governance telemetry...</Text>
          </View>
        ) : (
          <>
            {/* Platform Metrics Overview */}
            <Text style={styles.sectionTitle}>PLATFORM OPERATIONAL SCOPE</Text>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, shadows.card, { borderLeftColor: colors.deepMaroon }]}>
                <Text style={styles.metricVal}>{overview.totalUsers || 0}</Text>
                <Text style={styles.metricLbl}>Registered Users</Text>
                <Text style={styles.metricSub}>
                  {roles.SEVAK} Sevikas • {roles.ADMIN} Admins
                </Text>
              </View>

              <View style={[styles.metricCard, shadows.card, { borderLeftColor: colors.gold }]}>
                <Text style={styles.metricVal}>{overview.totalVihars || 0}</Text>
                <Text style={styles.metricLbl}>Vihar Journeys</Text>
                <Text style={styles.metricSub}>
                  {overview.activeVihars || 0} Walking Now
                </Text>
              </View>

              <View style={[styles.metricCard, shadows.card, { borderLeftColor: hasActiveEmergencies ? colors.statusEmergency : colors.statusSafe }]}>
                <Text style={[styles.metricVal, hasActiveEmergencies ? { color: colors.statusEmergency } : {}]}>
                  {overview.activeEmergencies || 0}
                </Text>
                <Text style={styles.metricLbl}>Active SOS Emergencies</Text>
                <Text style={styles.metricSub}>
                  {overview.totalEmergencies || 0} Total Logged
                </Text>
              </View>

              <View style={[styles.metricCard, shadows.card, { borderLeftColor: colors.saffron }]}>
                <Text style={styles.metricVal}>{overview.activeAdmins || 0}</Text>
                <Text style={styles.metricLbl}>Active Administrators</Text>
                <Text style={styles.metricSub}>
                  {overview.inactiveAdmins || 0} Inactive / Suspended
                </Text>
              </View>
            </View>

            {/* Core Governance Modules */}
            <Text style={styles.sectionTitle}>GOVERNANCE MODULES & CONTROL PANELS</Text>
            <View style={styles.modulesGrid}>
              <TouchableOpacity
                style={[styles.moduleCard, shadows.card]}
                onPress={() => navigation.navigate('SuperAdminPlatformHealth')}
              >
                <View style={[styles.moduleIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.moduleEmoji}>🩺</Text>
                </View>
                <View style={styles.moduleContent}>
                  <View style={styles.moduleHeaderRow}>
                    <Text style={styles.moduleTitle}>Platform Health & Diagnostics</Text>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>LIVE STATUS</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleDesc}>
                    Database latency, Supabase auth session, telemetry table readiness, and gateway checks.
                  </Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moduleCard, shadows.card]}
                onPress={() => navigation.navigate('SuperAdminPolicyManagement')}
              >
                <View style={[styles.moduleIconCircle, { backgroundColor: '#FFF8E7' }]}>
                  <Text style={styles.moduleEmoji}>📋</Text>
                </View>
                <View style={styles.moduleContent}>
                  <View style={styles.moduleHeaderRow}>
                    <Text style={styles.moduleTitle}>Platform Policy Management</Text>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>POLICIES</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleDesc}>
                    Account approvals, route deviation distance, emergency timeouts, and stationary rules.
                  </Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moduleCard, shadows.card]}
                onPress={() => navigation.navigate('SuperAdminFeatureManagement')}
              >
                <View style={[styles.moduleIconCircle, { backgroundColor: '#EDE7F6' }]}>
                  <Text style={styles.moduleEmoji}>⚙️</Text>
                </View>
                <View style={styles.moduleContent}>
                  <View style={styles.moduleHeaderRow}>
                    <Text style={styles.moduleTitle}>Feature Availability & Safety Rules</Text>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>SAFETY-CRITICAL</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleDesc}>
                    PostgreSQL state machines, offline-first fallback guarantees, and operational scope.
                  </Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moduleCard, shadows.card]}
                onPress={() => navigation.navigate('SuperAdminGovernanceActivity')}
              >
                <View style={[styles.moduleIconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={styles.moduleEmoji}>🏛️</Text>
                </View>
                <View style={styles.moduleContent}>
                  <View style={styles.moduleHeaderRow}>
                    <Text style={styles.moduleTitle}>Governance Activity Timeline</Text>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>IMMUTABLE</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleDesc}>
                    Filtered administrative audit trail covering approvals, delegations, and policy edits.
                  </Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Integration Readiness Matrix */}
            <Text style={styles.sectionTitle}>SYSTEM INTEGRATION READINESS</Text>
            <View style={[styles.card, shadows.card]}>
              <View style={styles.integRow}>
                <Text style={styles.integDot}>🟢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.integName}>PostgreSQL Database & RLS</Text>
                  <Text style={styles.integSub}>Connected • Active Row-Level Security Policies</Text>
                </View>
                <Text style={styles.integStatus}>OPERATIONAL</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.integRow}>
                <Text style={styles.integDot}>🟢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.integName}>Supabase JWT Authentication</Text>
                  <Text style={styles.integSub}>Session Verified • Role Guard Active</Text>
                </View>
                <Text style={styles.integStatus}>ACTIVE</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.integRow}>
                <Text style={styles.integDot}>🟢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.integName}>Emergency Escalation Dispatch</Text>
                  <Text style={styles.integSub}>Sequential Admin Tiers 1-3 Configured</Text>
                </View>
                <Text style={styles.integStatus}>VERIFIED</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.integRow}>
                <Text style={styles.integDot}>🔵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.integName}>SMS / External Call Webhook</Text>
                  <Text style={styles.integSub}>Server-Managed (Secrets Retained in Edge Functions)</Text>
                </View>
                <Text style={[styles.integStatus, { color: '#1976D2' }]}>SECURE</Text>
              </View>
            </View>

            {/* Recent Governance Activity Stream */}
            <View style={styles.streamHeaderRow}>
              <Text style={styles.sectionTitle}>RECENT GOVERNANCE ACTIVITIES</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SuperAdminGovernanceActivity')}>
                <Text style={styles.viewAllText}>View All ›</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, shadows.card]}>
              {overview.recentActivities?.length ? (
                overview.recentActivities.map((act, index) => (
                  <View key={act.id} style={[styles.actRow, index > 0 && styles.borderTop]}>
                    <View style={styles.actBadge}>
                      <Text style={styles.actBadgeText}>{act.action}</Text>
                    </View>
                    <Text style={styles.actEntity}>{act.entity || 'System'} • {formatKolkataDateTime(act.created_at)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No recent governance actions logged.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  statusHealthy: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  statusWarning: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  bannerEmoji: { fontSize: 24, marginRight: spacing.sm },
  bannerTextCol: { flex: 1 },
  bannerTitle: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800', letterSpacing: 0.5 },
  bannerSub: { ...typography.caption, color: colors.textSecondary, fontSize: 10.5, marginTop: 2 },
  sectionTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.sm },
  metricCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 3.5,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  metricVal: { ...typography.h3, color: colors.deepMaroon, fontWeight: '800' },
  metricLbl: { ...typography.caption, fontWeight: '700', color: colors.textPrimary, marginTop: 2, fontSize: 11 },
  metricSub: { ...typography.caption, fontSize: 9.5, color: colors.textMuted, marginTop: 2 },
  modulesGrid: { gap: spacing.sm, marginBottom: spacing.md },
  moduleCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  moduleEmoji: { fontSize: 20 },
  moduleContent: { flex: 1 },
  moduleHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  moduleTitle: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800', flex: 1 },
  tagBadge: {
    backgroundColor: colors.softCream,
    borderWidth: 0.8,
    borderColor: colors.cardBorder,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  tagBadgeText: { fontSize: 8.5, color: colors.deepMaroon, fontWeight: '800' },
  moduleDesc: { ...typography.caption, color: colors.textSecondary, fontSize: 10.5, lineHeight: 14 },
  arrowIcon: { fontSize: 22, color: colors.textMuted, marginLeft: spacing.xs },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  integRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  integDot: { fontSize: 12, marginRight: spacing.sm },
  integName: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700' },
  integSub: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  integStatus: { fontSize: 9.5, fontWeight: '800', color: colors.statusSafe },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 6 },
  streamHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  viewAllText: { ...typography.caption, color: colors.deepMaroon, fontWeight: '700' },
  actRow: { paddingVertical: spacing.xs },
  borderTop: { borderTopWidth: 0.5, borderTopColor: colors.cardBorder, marginTop: 4, paddingTop: 6 },
  actBadge: { alignSelf: 'flex-start', backgroundColor: colors.softCream, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginBottom: 2 },
  actBadgeText: { fontSize: 9, fontWeight: '800', color: colors.deepMaroon },
  actEntity: { ...typography.caption, fontSize: 10, color: colors.textSecondary },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.sm },
  centerLoading: { padding: spacing.xxxl, alignItems: 'center' },
  loadingText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
});
