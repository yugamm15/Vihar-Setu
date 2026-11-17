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

const VIHAR_STATUSES = ['ALL', 'IN_TRANSIT', 'COMPLETED', 'HELD', 'PLANNED', 'CANCELLED'];

export const SuperAdminViharReportsScreen = ({ navigation }) => {
  const [periodKey, setPeriodKey] = useState('last_30_days');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const range = getPeriodRange(periodKey);
    const result = await superAdminReportsService.fetchViharReports(
      {
        status: statusFilter,
        search,
        limit: 100,
      },
      range
    );

    setData(result.data);
    setLoading(false);
    setRefreshing(false);
  }, [periodKey, statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const viharsList = data?.list || [];
  const statusDist = data?.statusDistribution || {};
  const holdReasons = data?.holdReasons || {};

  const summaryMetrics = [
    { label: 'Total Vihars', value: data?.total ?? '—' },
    { label: 'Active / Walking', value: (statusDist.IN_TRANSIT || 0) + (statusDist.ACTIVE || 0) },
    { label: 'Completed Vihars', value: statusDist.COMPLETED || 0 },
    { label: 'Total Distance', value: `${data?.totalDistanceKm || 0} km` },
    { label: 'Average Distance', value: `${data?.avgDistanceKm || 0} km` },
    { label: 'Average Duration', value: data?.avgDuration || '—' },
  ];

  const tableHeaders = ['Title', 'Route', 'Dist (km)', 'Status', 'Safety', 'Date'];
  const tableRows = viharsList.map((v) => [
    v.title || 'Vihar',
    `${v.source_name || '—'} → ${v.dest_name || '—'}`,
    v.total_distance_km ? `${v.total_distance_km}` : '0',
    v.status || 'PLANNED',
    v.safety_status || 'SAFE',
    formatKolkataDateTime(v.created_at, { month: 'numeric', year: '2-digit' }),
  ]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Vihar Operational Reports"
        subtitle="Pilgrimage Journeys, Sub-Vihars, Holds & Handovers"
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

        {/* Filter Card */}
        <View style={[styles.filterCard, shadows.card]}>
          <Text style={styles.cardHeader}>Filters</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Vihar title, start or destination..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />

          <Text style={styles.subLabel}>Vihar Status:</Text>
          <View style={styles.chipsRow}>
            {VIHAR_STATUSES.map((s) => (
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
            <Text style={styles.loadingText}>Compiling Vihar operations data...</Text>
          </View>
        ) : (
          <>
            {/* Metric Summary Cards */}
            <View style={styles.metricsRow}>
              {summaryMetrics.slice(0, 4).map((m, idx) => (
                <SuperAdminMetricCard
                  key={idx}
                  label={m.label}
                  value={m.value}
                  accent={idx === 1 ? colors.statusSafe : idx === 2 ? colors.gold : colors.deepMaroon}
                />
              ))}
            </View>

            {/* Status Distribution */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardTitle}>Vihar Status Distribution</Text>
              <SuperAdminDistributionDonut
                series={Object.entries(statusDist).map(([label, value]) => ({ label, value }))}
              />
            </View>

            {/* Coordination Metrics */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardTitle}>Coordination & Stops</Text>
              <View style={styles.coordGrid}>
                <View style={styles.coordBox}>
                  <Text style={styles.coordNum}>{data?.subViharCount || 0}</Text>
                  <Text style={styles.coordLbl}>Sub-Vihars</Text>
                </View>
                <View style={styles.coordBox}>
                  <Text style={styles.coordNum}>{data?.handoversCount || 0}</Text>
                  <Text style={styles.coordLbl}>Handovers</Text>
                </View>
                <View style={styles.coordBox}>
                  <Text style={styles.coordNum}>{data?.holdsCount || 0}</Text>
                  <Text style={styles.coordLbl}>Holds / Stops</Text>
                </View>
              </View>
            </View>

            {/* Hold Reasons */}
            {Object.keys(holdReasons).length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Hold Reasons Breakdown</Text>
                <SuperAdminReportBars
                  series={Object.entries(holdReasons).map(([label, value]) => ({ label, value }))}
                  barColor={colors.gold}
                />
              </View>
            )}

            {/* Area Distribution */}
            {data?.areaDistribution?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Area-wise Vihar Distribution</Text>
                <SuperAdminReportBars series={data.areaDistribution.slice(0, 8)} barColor={colors.saffron} />
              </View>
            )}

            {/* Trend */}
            {data?.trend?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Vihar Journeys Initiated Over Time</Text>
                <SuperAdminReportTrend series={data.trend.slice(-10)} />
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
        title="Vihar Operational & Safety Report"
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
  searchInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  subLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, marginTop: 4, marginBottom: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.xs },
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
  coordGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  coordBox: {
    flex: 1,
    backgroundColor: colors.softCream,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  coordNum: { ...typography.h3, color: colors.deepMaroon, fontWeight: '800' },
  coordLbl: { ...typography.caption, color: colors.textSecondary, fontSize: 10, marginTop: 2 },
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
