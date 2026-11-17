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
import { superAdminReportsService } from '../services/SuperAdminReportsService';
import {
  SuperAdminDistributionDonut,
  SuperAdminMetricCard,
  SuperAdminReportBars,
  SuperAdminReportTrend,
} from '../components/SuperAdminReportCharts';
import { SuperAdminReportPreviewModal } from '../components/SuperAdminReportPreviewModal';
import { formatKolkataDateTime, getPeriodRange } from '../utils/reportDateUtils';

const PERIOD_PRESETS = [
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'today', label: 'Today' },
  { key: 'last_7_days', label: '7 Days' },
  { key: 'last_90_days', label: '90 Days' },
  { key: 'this_month', label: 'This Month' },
];

const EMERGENCY_STATUSES = ['ALL', 'TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM'];

export const SuperAdminEmergencyReportsScreen = ({ navigation }) => {
  const [periodKey, setPeriodKey] = useState('last_30_days');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const range = getPeriodRange(periodKey);
    const result = await superAdminReportsService.fetchEmergencyReports(
      {
        status: statusFilter,
        limit: 100,
      },
      range
    );

    setData(result.data);
    setLoading(false);
    setRefreshing(false);
  }, [periodKey, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const emergenciesList = data?.list || [];
  const statusDist = data?.statusDistribution || {};
  const triggerDist = data?.triggerDistribution || {};
  const escalations = data?.escalationAttempts || {};

  const summaryMetrics = [
    { label: 'Total Emergencies', value: data?.total ?? '—' },
    { label: 'Resolved SOS', value: data?.resolvedCount || 0 },
    { label: 'False Alarms', value: data?.falseAlarmCount || 0 },
    { label: 'Avg SOS Response Time', value: data?.avgResponseTime || '—' },
  ];

  const tableHeaders = ['Trigger Type', 'Sevika', 'Status', 'Resp (min)', 'Area', 'Time'];
  const tableRows = emergenciesList.map((e) => [
    e.trigger_type || 'MANUAL_SOS',
    e.profiles?.full_name || 'Sevika',
    e.status || 'TRIGGERED',
    e.responseTimeMins !== null ? `${e.responseTimeMins}m` : '—',
    e.profiles?.area || e.profiles?.city || '—',
    formatKolkataDateTime(e.triggered_at, { month: 'numeric', year: '2-digit' }),
  ]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Emergency & SOS Intelligence"
        subtitle="Critical Safety Alarms, Response Times & Escalations"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.saffron} />}
      >
        {/* Period Presets */}
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

        {/* Status Filter */}
        <View style={[styles.filterCard, shadows.card]}>
          <Text style={styles.cardHeader}>Emergency Status Filter</Text>
          <View style={styles.chipsRow}>
            {EMERGENCY_STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                onPress={() => setStatusFilter(s)}
              >
                <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Compiling emergency safety reports...</Text>
          </View>
        ) : (
          <>
            {/* Metric Summary Cards */}
            <View style={styles.metricsRow}>
              {summaryMetrics.map((m, idx) => (
                <SuperAdminMetricCard
                  key={idx}
                  label={m.label}
                  value={m.value}
                  accent={idx === 1 ? colors.statusSafe : idx === 2 ? colors.saffron : idx === 3 ? colors.deepMaroon : colors.statusEmergency}
                />
              ))}
            </View>

            {/* Status Distribution */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardTitle}>Emergency Resolution Status</Text>
              <SuperAdminDistributionDonut
                series={Object.entries(statusDist).map(([label, value]) => ({ label, value }))}
              />
            </View>

            {/* Trigger Distribution */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardTitle}>Emergency Trigger Categories</Text>
              <SuperAdminReportBars
                series={Object.entries(triggerDist).map(([label, value]) => ({ label, value }))}
                barColor={colors.statusEmergency}
              />
            </View>

            {/* Escalation Outcomes */}
            {Object.keys(escalations).length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Admin Escalation Attempt Outcomes</Text>
                <SuperAdminReportBars
                  series={Object.entries(escalations).map(([label, value]) => ({ label, value }))}
                  barColor={colors.saffron}
                />
              </View>
            )}

            {/* Area Comparison */}
            {data?.areaDistribution?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Area-wise Emergency Distribution</Text>
                <SuperAdminReportBars series={data.areaDistribution.slice(0, 8)} barColor={colors.gold} />
              </View>
            )}

            {/* Occurrence Trend */}
            {data?.trend?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Emergency Incidents Trend Over Time</Text>
                <SuperAdminReportTrend series={data.trend.slice(-10)} accent={colors.statusEmergency} />
              </View>
            )}

            {/* Action Bar */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.previewButton} onPress={() => setPreviewOpen(true)}>
                <Text style={styles.previewButtonText}>Preview Official Report & Export</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Preview & Export Modal */}
      <SuperAdminReportPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Emergency Incident & Safety Response Report"
        period={PERIOD_PRESETS.find((p) => p.key === periodKey)?.label}
        summaryMetrics={summaryMetrics}
        headers={tableHeaders}
        rows={tableRows}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  presetsBar: { flexDirection: 'row', marginBottom: spacing.sm },
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
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.softCream,
  },
  filterChipActive: { backgroundColor: colors.statusEmergency, borderColor: colors.statusEmergency },
  filterChipText: { fontSize: 10, color: colors.textPrimary, fontWeight: '700' },
  filterChipTextActive: { color: '#FFFFFF' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.xs },
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
  actionRow: { marginTop: spacing.sm, marginBottom: spacing.lg },
  previewButton: {
    backgroundColor: colors.deepMaroon,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.card,
  },
  previewButtonText: { ...typography.bodySmall, color: colors.warmIvory, fontWeight: '800' },
});
