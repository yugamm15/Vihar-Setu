import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminReportsService } from '../services/SuperAdminReportsService';
import { superAdminExportService } from '../services/superAdminExportService';
import {
  SuperAdminDistributionDonut,
  SuperAdminMetricCard,
  SuperAdminReportBars,
  SuperAdminReportTrend,
} from '../components/SuperAdminReportCharts';
import { SuperAdminReportPreviewModal } from '../components/SuperAdminReportPreviewModal';
import { getPeriodRange } from '../utils/reportDateUtils';

const PERIOD_PRESETS = [
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'today', label: 'Today' },
  { key: 'last_7_days', label: '7 Days' },
  { key: 'last_90_days', label: '90 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'prev_month', label: 'Prev Month' },
  { key: 'custom', label: 'Custom' },
];

export const SuperAdminReportsScreen = ({ navigation }) => {
  const [periodKey, setPeriodKey] = useState('last_30_days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appliedCustom, setAppliedCustom] = useState(null);

  const [metrics, setMetrics] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    let range;
    if (periodKey === 'custom' && appliedCustom) {
      range = appliedCustom;
    } else {
      range = getPeriodRange(periodKey);
    }

    const [overviewRes, fullRes] = await Promise.all([
      superAdminReportsService.fetchOverviewMetrics(range),
      superAdminReportsService.fetchReports(range),
    ]);

    setMetrics(overviewRes.data);
    setChartsData(fullRes.data);
    setLoading(false);
    setRefreshing(false);
  }, [periodKey, appliedCustom]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApplyCustom = () => {
    if (!customFrom.trim()) return;
    const range = { from: customFrom.trim(), to: customTo.trim() };
    setAppliedCustom(range);
    setPeriodKey('custom');
  };

  const currentPeriodLabel = periodKey === 'custom' && appliedCustom
    ? `${appliedCustom.from} to ${appliedCustom.to || 'Now'}`
    : PERIOD_PRESETS.find((p) => p.key === periodKey)?.label || 'Selected Period';

  const executiveSummaryRows = metrics ? [
    { label: 'Total Registered Users', value: metrics.totalUsers },
    { label: 'Active Users', value: metrics.activeUsers },
    { label: 'Pending Users', value: metrics.pendingUsers },
    { label: 'Disabled Users', value: metrics.disabledUsers },
    { label: 'Total Administrators', value: metrics.totalAdmins },
    { label: 'Total Vihars', value: metrics.totalVihars },
    { label: 'Active Walking Vihars', value: metrics.activeVihars },
    { label: 'Completed Vihars', value: metrics.completedVihars },
    { label: 'Held Vihars', value: metrics.heldVihars },
    { label: 'Total Distance Monitored', value: `${metrics.totalDistanceKm} km` },
    { label: 'Total Emergencies', value: metrics.totalEmergencies },
    { label: 'Resolved Emergencies', value: metrics.resolvedEmergencies },
    { label: 'False Alarms', value: metrics.falseAlarms },
    { label: 'Avg SOS Response Time', value: metrics.avgResponseTime },
    { label: 'Total Notifications', value: metrics.totalNotifications },
    { label: 'Unread Notifications', value: metrics.unreadNotifications },
    { label: 'Total Holds', value: metrics.totalHolds },
    { label: 'Total Handovers', value: metrics.totalHandovers },
    { label: 'Route Deviations', value: metrics.routeDeviations },
  ] : [];

  const handleExportCSV = () => {
    const csv = superAdminExportService.generateCSV({
      title: 'Super Administrator Executive Summary Report',
      period: currentPeriodLabel,
      headers: ['Metric', 'Recorded Value'],
      rows: executiveSummaryRows.map((r) => [r.label, r.value]),
    });
    superAdminExportService.shareReport({
      title: 'Executive Summary (CSV)',
      filename: 'executive_summary_report.csv',
      content: csv,
    });
  };

  const handleExportPDF = () => {
    const docText = superAdminExportService.generateDocumentText({
      title: 'Super Administrator Executive Summary Report',
      period: currentPeriodLabel,
      summaryMetrics: executiveSummaryRows,
      headers: ['Operational Dimension', 'Metric Value'],
      rows: executiveSummaryRows.map((r) => [r.label, r.value]),
    });
    superAdminExportService.shareReport({
      title: 'Executive Summary (PDF/Text)',
      filename: 'executive_summary_report.txt',
      content: docText,
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('super_admin.reports.title')}
        subtitle={t('super_admin.reports.subtitle')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.saffron} />}
      >
        {/* Period Selector Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsBar}>
          {PERIOD_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.presetChip, periodKey === p.key && styles.presetChipActive]}
              onPress={() => setPeriodKey(p.key)}
            >
              <Text style={[styles.presetText, periodKey === p.key && styles.presetTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Custom Date Inputs if Custom selected */}
        {periodKey === 'custom' && (
          <View style={[styles.filterCard, shadows.card]}>
            <Text style={styles.cardHeader}>{t('super_admin.reports.date_range')}</Text>
            <View style={styles.inputsRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={customFrom}
                onChangeText={setCustomFrom}
                placeholder={t('super_admin.reports.from')}
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={customTo}
                onChangeText={setCustomTo}
                placeholder={t('super_admin.reports.to')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCustom}>
              <Text style={styles.applyBtnText}>{t('super_admin.reports.apply')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Compiling system-wide operational intelligence...</Text>
          </View>
        ) : (
          <>
            {/* Executive Metric Cards Grid */}
            <Text style={styles.sectionTitle}>EXECUTIVE OPERATIONAL OVERVIEW</Text>
            <View style={styles.metricsGrid}>
              <SuperAdminMetricCard
                label="Total Registered Users"
                value={metrics?.totalUsers}
                subtext={`Active: ${metrics?.activeUsers || 0} | Pending: ${metrics?.pendingUsers || 0}`}
                accent={colors.deepMaroon}
              />
              <SuperAdminMetricCard
                label="Total Vihars Monitored"
                value={metrics?.totalVihars}
                subtext={`Active: ${metrics?.activeVihars || 0} | Done: ${metrics?.completedVihars || 0}`}
                accent={colors.gold}
              />
              <SuperAdminMetricCard
                label="Total Distance Monitored"
                value={`${metrics?.totalDistanceKm || 0} km`}
                subtext={`Holds: ${metrics?.totalHolds || 0} | Handovers: ${metrics?.totalHandovers || 0}`}
                accent={colors.saffron}
              />
              <SuperAdminMetricCard
                label="Life-Safety SOS Events"
                value={metrics?.totalEmergencies}
                subtext={`Resolved: ${metrics?.resolvedEmergencies || 0} | Avg: ${metrics?.avgResponseTime || '—'}`}
                accent={metrics?.totalEmergencies > 0 ? colors.statusEmergency : colors.statusSafe}
              />
              <SuperAdminMetricCard
                label="Area Administrators"
                value={metrics?.totalAdmins}
                subtext="Delegated Regional Coordinators"
                accent={colors.deepMaroon}
              />
              <SuperAdminMetricCard
                label="Notifications & Alerts"
                value={metrics?.totalNotifications}
                subtext={`Unread: ${metrics?.unreadNotifications || 0} | Deviations: ${metrics?.routeDeviations || 0}`}
                accent={colors.saffron}
              />
            </View>

            {/* Export & Document Preview Action Bar */}
            <View style={[styles.exportCard, shadows.card]}>
              <Text style={styles.exportTitle}>Export Operational Reports</Text>
              <Text style={styles.exportSubtitle}>
                Download or share authorized governance records in CSV and PDF formats for {currentPeriodLabel}.
              </Text>
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity style={styles.exportBtnCsv} onPress={handleExportCSV}>
                  <Text style={styles.exportBtnCsvText}>Export CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportBtnPdf} onPress={handleExportPDF}>
                  <Text style={styles.exportBtnPdfText}>Export PDF / Doc</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportBtnPreview} onPress={() => setPreviewOpen(true)}>
                  <Text style={styles.exportBtnPreviewText}>Preview Sheet</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dedicated Deep-Dive Reports Navigation */}
            <Text style={styles.sectionTitle}>SPECIALIZED GOVERNANCE REPORTS</Text>
            <View style={styles.linksGrid}>
              <TouchableOpacity
                style={[styles.reportNavCard, shadows.subtle]}
                onPress={() => navigation.navigate('SuperAdminUserReports')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.iconTxt}>👥</Text>
                </View>
                <View style={styles.navContent}>
                  <Text style={styles.navTitle}>User Governance Reports</Text>
                  <Text style={styles.navSub}>Sevikas directory, status distribution, registration trends</Text>
                </View>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportNavCard, shadows.subtle]}
                onPress={() => navigation.navigate('SuperAdminViharReports')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#FFF8E7' }]}>
                  <Text style={styles.iconTxt}>🚶‍♀️</Text>
                </View>
                <View style={styles.navContent}>
                  <Text style={styles.navTitle}>Vihar Operational Reports</Text>
                  <Text style={styles.navSub}>Pilgrimage journeys, sub-vihars, holds, handovers & distance</Text>
                </View>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportNavCard, shadows.subtle]}
                onPress={() => navigation.navigate('SuperAdminEmergencyReports')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Text style={styles.iconTxt}>🚨</Text>
                </View>
                <View style={styles.navContent}>
                  <Text style={styles.navTitle}>Emergency & SOS Intelligence</Text>
                  <Text style={styles.navSub}>Critical alarms, escalation performance, response times</Text>
                </View>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportNavCard, shadows.subtle]}
                onPress={() => navigation.navigate('SuperAdminSafetyReports')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={styles.iconTxt}>🛡️</Text>
                </View>
                <View style={styles.navContent}>
                  <Text style={styles.navTitle}>Route Deviations & Safety Health</Text>
                  <Text style={styles.navSub}>Corridor alerts, stationary check responses, device battery</Text>
                </View>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportNavCard, shadows.subtle]}
                onPress={() => navigation.navigate('SuperAdminAdministratorReports')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={styles.iconTxt}>🏛️</Text>
                </View>
                <View style={styles.navContent}>
                  <Text style={styles.navTitle}>Administrator Delegation Reports</Text>
                  <Text style={styles.navSub}>Regional area assignments, status, and permissions</Text>
                </View>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportNavCard, shadows.subtle]}
                onPress={() => navigation.navigate('SuperAdminAuditReports')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
                  <Text style={styles.iconTxt}>📜</Text>
                </View>
                <View style={styles.navContent}>
                  <Text style={styles.navTitle}>Audit Trail & Security Intelligence</Text>
                  <Text style={styles.navSub}>Immutable administrative governance & system event logs</Text>
                </View>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Summary Visualizations */}
            <Text style={styles.sectionTitle}>SYSTEM-WIDE VISUAL INTELLIGENCE</Text>

            {chartsData?.users?.registrationTrend?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>User Registrations Trend</Text>
                <SuperAdminReportTrend series={chartsData.users.registrationTrend.slice(-10)} />
              </View>
            )}

            {chartsData?.vihars?.viharStatus?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Vihar Journeys by Status</Text>
                <SuperAdminDistributionDonut series={chartsData.vihars.viharStatus} />
              </View>
            )}

            {chartsData?.devices?.networkStatus?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Active Telemetry Device Health</Text>
                <SuperAdminReportBars series={chartsData.devices.networkStatus} barColor={colors.statusSafe} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Official Printable Report Sheet Modal */}
      <SuperAdminReportPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Super Administrator Executive Intelligence Report"
        period={currentPeriodLabel}
        summaryMetrics={executiveSummaryRows}
        headers={['Governance Dimension', 'Recorded Count / Metric']}
        rows={executiveSummaryRows.map((r) => [r.label, r.value])}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  presetsBar: { flexDirection: 'row', marginBottom: spacing.md },
  presetChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: spacing.xs,
  },
  presetChipActive: {
    backgroundColor: colors.deepMaroon,
    borderColor: colors.deepMaroon,
  },
  presetText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700', fontSize: 11 },
  presetTextActive: { color: colors.warmIvory },
  filterCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.xs },
  inputsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  applyBtn: {
    backgroundColor: colors.deepMaroon,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: { ...typography.caption, color: colors.warmIvory, fontWeight: '700' },
  sectionTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  exportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exportTitle: { ...typography.h4, color: colors.deepMaroon },
  exportSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  exportButtonsRow: { flexDirection: 'row', gap: spacing.xs },
  exportBtnCsv: {
    flex: 1,
    backgroundColor: colors.softCream,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  exportBtnCsvText: { ...typography.caption, color: colors.deepMaroon, fontWeight: '800', fontSize: 11 },
  exportBtnPdf: {
    flex: 1.2,
    backgroundColor: colors.saffron,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  exportBtnPdfText: { ...typography.caption, color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  exportBtnPreview: {
    flex: 1,
    backgroundColor: colors.deepMaroon,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  exportBtnPreviewText: { ...typography.caption, color: colors.warmIvory, fontWeight: '700', fontSize: 11 },
  linksGrid: { gap: spacing.xs, marginBottom: spacing.md },
  reportNavCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconTxt: { fontSize: 18 },
  navContent: { flex: 1 },
  navTitle: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700' },
  navSub: { ...typography.caption, color: colors.textSecondary, fontSize: 10, marginTop: 1 },
  navArrow: { fontSize: 20, color: colors.textSecondary, marginLeft: spacing.xs },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm },
  centerLoading: { padding: spacing.xxxl, alignItems: 'center' },
  loadingText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
});
