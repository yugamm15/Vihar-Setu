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
import { superAdminGovernanceService } from '../services/superAdminGovernanceService';
import { formatKolkataDateTime } from '../utils/reportDateUtils';

export const SuperAdminPlatformHealthScreen = ({ navigation }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [running, setRunning] = useState(true);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const result = await superAdminGovernanceService.runPlatformDiagnostics();
    setDiagnostics(result);
    setRunning(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const checks = diagnostics?.checks || [];
  const healthyCount = checks.filter((c) => c.status === 'HEALTHY').length;
  const warningCount = checks.filter((c) => c.status === 'WARNING').length;
  const criticalCount = checks.filter((c) => c.status === 'CRITICAL').length;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <View style={[styles.statusBadge, styles.badgeHealthy]}>
            <Text style={[styles.statusBadgeText, styles.textHealthy]}>VERIFIED HEALTHY</Text>
          </View>
        );
      case 'WARNING':
        return (
          <View style={[styles.statusBadge, styles.badgeWarning]}>
            <Text style={[styles.statusBadgeText, styles.textWarning]}>ATTENTION</Text>
          </View>
        );
      case 'CRITICAL':
        return (
          <View style={[styles.statusBadge, styles.badgeCritical]}>
            <Text style={[styles.statusBadgeText, styles.textCritical]}>CRITICAL ERROR</Text>
          </View>
        );
      case 'SERVER_MANAGED':
      default:
        return (
          <View style={[styles.statusBadge, styles.badgeManaged]}>
            <Text style={[styles.statusBadgeText, styles.textManaged]}>SERVER SECURED</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Platform Health & Diagnostics"
        subtitle="Live Connectivity, Response Latency & Infrastructure Checks"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={running} onRefresh={runChecks} tintColor={colors.saffron} />}
      >
        {/* Diagnostics Summary Header */}
        <View style={[styles.summaryCard, shadows.card]}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryTitle}>Diagnostic Assessment</Text>
              <Text style={styles.summaryTime}>
                Last Check: {formatKolkataDateTime(diagnostics?.timestamp)}
              </Text>
            </View>
            <TouchableOpacity style={styles.rerunBtn} onPress={runChecks} disabled={running}>
              {running ? (
                <ActivityIndicator size="small" color={colors.warmIvory} />
              ) : (
                <Text style={styles.rerunBtnText}>Run Checks</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.countsRow}>
            <View style={styles.countItem}>
              <Text style={[styles.countVal, { color: colors.statusSafe }]}>{healthyCount}</Text>
              <Text style={styles.countLbl}>Healthy</Text>
            </View>
            <View style={styles.countItem}>
              <Text style={[styles.countVal, { color: colors.saffron }]}>{warningCount}</Text>
              <Text style={styles.countLbl}>Warnings</Text>
            </View>
            <View style={styles.countItem}>
              <Text style={[styles.countVal, { color: colors.statusEmergency }]}>{criticalCount}</Text>
              <Text style={styles.countLbl}>Critical</Text>
            </View>
            <View style={styles.countItem}>
              <Text style={[styles.countVal, { color: '#1976D2' }]}>1</Text>
              <Text style={styles.countLbl}>Protected</Text>
            </View>
          </View>
        </View>

        {/* Detailed Checks List */}
        <Text style={styles.sectionHeader}>LIVE INFRASTRUCTURE DIAGNOSTIC RESULTS</Text>

        {checks.map((check) => (
          <View key={check.id} style={[styles.checkCard, shadows.card]}>
            <View style={styles.checkCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkCategory}>{check.category}</Text>
                <Text style={styles.checkName}>{check.name}</Text>
              </View>
              {renderStatusBadge(check.status)}
            </View>

            <Text style={styles.checkDetail}>{check.detail}</Text>

            {check.latencyMs !== null && (
              <View style={styles.latencyRow}>
                <Text style={styles.latencyLbl}>Round-trip Ping Latency:</Text>
                <Text style={styles.latencyVal}>{check.latencyMs} ms</Text>
              </View>
            )}
          </View>
        ))}

        {/* Security Architecture Disclosure */}
        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>🔒 Secret Protection & Architecture Note</Text>
          <Text style={styles.securityText}>
            This diagnostic tool truthfully distinguishes reachable client channels from server-managed integrations.
            Third-party SMS/voice gateway credentials (Twilio, Exotel, Firebase FCM) are retained exclusively within
            Supabase Edge Functions and environment vaults. They are never exposed to the client application.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryTitle: { ...typography.h4, color: colors.deepMaroon },
  summaryTime: { ...typography.caption, color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  rerunBtn: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  rerunBtnText: { ...typography.caption, color: colors.warmIvory, fontWeight: '800' },
  countsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.sm,
  },
  countItem: { flex: 1, alignItems: 'center' },
  countVal: { ...typography.h3, fontWeight: '800' },
  countLbl: { ...typography.caption, fontSize: 10, color: colors.textSecondary },
  sectionHeader: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  checkCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  checkCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  checkCategory: { fontSize: 8.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  checkName: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700', marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
  },
  badgeHealthy: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  badgeWarning: { backgroundColor: '#FFF8E7', borderColor: colors.saffron },
  badgeCritical: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
  badgeManaged: { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' },
  statusBadgeText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },
  textHealthy: { color: colors.statusSafe },
  textWarning: { color: colors.saffronDark },
  textCritical: { color: colors.statusEmergency },
  textManaged: { color: '#1976D2' },
  checkDetail: { ...typography.caption, color: colors.textPrimary, fontSize: 11, lineHeight: 15 },
  latencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: colors.cardBorder,
  },
  latencyLbl: { fontSize: 9.5, color: colors.textSecondary, flex: 1 },
  latencyVal: { fontSize: 10, fontWeight: '800', color: colors.deepMaroon },
  securityBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  securityTitle: { ...typography.caption, color: colors.deepMaroon, fontWeight: '800' },
  securityText: { ...typography.caption, color: colors.textSecondary, fontSize: 10.5, lineHeight: 15, marginTop: 4 },
});
