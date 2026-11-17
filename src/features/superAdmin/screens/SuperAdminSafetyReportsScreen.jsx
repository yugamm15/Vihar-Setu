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

const SEVERITIES = ['ALL', 'CRITICAL', 'WARNING', 'INFO'];

export const SuperAdminSafetyReportsScreen = ({ navigation }) => {
  const [periodKey, setPeriodKey] = useState('last_30_days');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const range = getPeriodRange(periodKey);
    const result = await superAdminReportsService.fetchSafetyReports(
      {
        severity: severityFilter,
        limit: 100,
      },
      range
    );

    setData(result.data);
    setLoading(false);
    setRefreshing(false);
  }, [periodKey, severityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const routeEvents = data?.list || [];
  const sevDist = data?.severityDistribution || {};
  const evTypeDist = data?.eventTypeDistribution || {};
  const checkResponses = data?.safetyCheckResponses || {};

  const summaryMetrics = [
    { label: 'Total Route Events', value: data?.totalEvents ?? '—' },
    { label: 'Critical Deviations', value: sevDist.CRITICAL || 0 },
    { label: 'Warning Deviations', value: sevDist.WARNING || 0 },
    { label: 'Safety Checks Sent', value: data?.safetyChecksCount || 0 },
  ];

  const tableHeaders = ['Event Type', 'Severity', 'Message', 'Vihar', 'Timestamp'];
  const tableRows = routeEvents.map((r) => [
    r.event_type || 'ROUTE_DEVIATION',
    r.severity || 'INFO',
    r.message || '—',
    r.vihars?.title || 'Vihar',
    formatKolkataDateTime(r.created_at, { month: 'numeric', year: '2-digit' }),
  ]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Route Deviations & Safety Health"
        subtitle="Corridor Protection, Stationary Checks & Device Telemetry"
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

        {/* Severity Filter */}
        <View style={[styles.filterCard, shadows.card]}>
          <Text style={styles.cardHeader}>Event Severity Filter</Text>
          <View style={styles.chipsRow}>
            {SEVERITIES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, severityFilter === s && styles.filterChipActive]}
                onPress={() => setSeverityFilter(s)}
              >
                <Text style={[styles.filterChipText, severityFilter === s && styles.filterChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Compiling route safety & telemetry data...</Text>
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
                  accent={idx === 1 ? colors.statusEmergency : idx === 2 ? colors.saffron : colors.deepMaroon}
                />
              ))}
            </View>

            {/* Severity Distribution */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardTitle}>Route Deviation Severity Breakdown</Text>
              <SuperAdminDistributionDonut
                series={Object.entries(sevDist).map(([label, value]) => ({ label, value }))}
              />
            </View>

            {/* Event Types */}
            {Object.keys(evTypeDist).length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Safety Event Types</Text>
                <SuperAdminReportBars
                  series={Object.entries(evTypeDist).map(([label, value]) => ({ label, value }))}
                  barColor={colors.saffron}
                />
              </View>
            )}

            {/* Safety Check Responses */}
            {Object.keys(checkResponses).length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Stationary Safety Check Responses</Text>
                <SuperAdminReportBars
                  series={Object.entries(checkResponses).map(([label, value]) => ({ label, value }))}
                  barColor={colors.statusSafe}
                />
              </View>
            )}

            {/* Battery Distribution */}
            {data?.batteryDistribution?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Active Device Battery Health</Text>
                <SuperAdminReportBars series={data.batteryDistribution} barColor={colors.gold} />
              </View>
            )}

            {/* Trend */}
            {data?.trend?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Route Events Frequency Over Time</Text>
                <SuperAdminReportTrend series={data.trend.slice(-10)} accent={colors.saffron} />
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
        title="Route Deviation & Field Safety Health Report"
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
  filterChipActive: { backgroundColor: colors.saffron, borderColor: colors.saffron },
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
