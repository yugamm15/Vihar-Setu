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
  { key: 'all', label: 'All Time' },
];

export const SuperAdminAuditReportsScreen = ({ navigation }) => {
  const [periodKey, setPeriodKey] = useState('last_30_days');
  const [actionSearch, setActionSearch] = useState('');
  const [entitySearch, setEntitySearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const range = getPeriodRange(periodKey);
    const result = await superAdminReportsService.fetchAuditReports(
      {
        action: actionSearch,
        entity: entitySearch,
        limit: 100,
      },
      range
    );

    setData(result.data);
    setLoading(false);
    setRefreshing(false);
  }, [periodKey, actionSearch, entitySearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const auditList = data?.list || [];
  const catDist = data?.categoryDistribution || [];

  const summaryMetrics = [
    { label: 'Total Audit Logs', value: data?.total ?? '—' },
    { label: 'Sampled Records', value: auditList.length },
    { label: 'Action Categories', value: catDist.length || 0 },
    { label: 'Security Tracked', value: 'Active (Immutable)' },
  ];

  const tableHeaders = ['Action', 'Entity', 'Entity ID', 'Actor', 'Recorded Time'];
  const tableRows = auditList.map((log) => [
    log.action || 'ACTION',
    log.entity || '—',
    log.entity_id ? `${String(log.entity_id).slice(0, 8)}...` : '—',
    log.actor_id ? `${String(log.actor_id).slice(0, 8)}...` : 'System',
    formatKolkataDateTime(log.created_at, { month: 'numeric', year: '2-digit' }),
  ]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Audit Trail & Security Intelligence"
        subtitle="Immutable Administrative Governance & System Logs"
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
          <Text style={styles.cardHeader}>Audit Filters</Text>
          <View style={styles.inputsRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Filter by action name..."
              placeholderTextColor={colors.textMuted}
              value={actionSearch}
              onChangeText={setActionSearch}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Filter by entity..."
              placeholderTextColor={colors.textMuted}
              value={entitySearch}
              onChangeText={setEntitySearch}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Compiling immutable audit history...</Text>
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
                  accent={idx === 1 ? colors.saffron : idx === 3 ? colors.statusSafe : colors.deepMaroon}
                />
              ))}
            </View>

            {/* Category Breakdown */}
            {catDist.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Action Categories Distribution</Text>
                <SuperAdminDistributionDonut series={catDist} />
              </View>
            )}

            {/* Action Distribution */}
            {data?.actionDistribution?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Frequent Administrative Actions</Text>
                <SuperAdminReportBars series={data.actionDistribution.slice(0, 8)} barColor={colors.deepMaroon} />
              </View>
            )}

            {/* Entity Distribution */}
            {data?.entityDistribution?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Impacted System Entities</Text>
                <SuperAdminReportBars series={data.entityDistribution.slice(0, 8)} barColor={colors.gold} />
              </View>
            )}

            {/* Trend */}
            {data?.trend?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Audit Activity Volume Over Time</Text>
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
        title="Audit Trail & System Governance Report"
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
  inputsRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
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
