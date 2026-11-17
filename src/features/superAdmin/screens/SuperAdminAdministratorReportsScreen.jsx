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

export const SuperAdminAdministratorReportsScreen = ({ navigation }) => {
  const [periodKey, setPeriodKey] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const range = getPeriodRange(periodKey);
    const result = await superAdminReportsService.fetchAdministratorReports({ limit: 100 }, range);

    setData(result.data);
    setLoading(false);
    setRefreshing(false);
  }, [periodKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const adminsList = data?.list || [];
  const statusDist = data?.statusDistribution || {};

  const summaryMetrics = [
    { label: 'Total Administrators', value: data?.total ?? '—' },
    { label: 'Active Administrators', value: data?.activeCount || 0 },
    { label: 'Disabled Administrators', value: data?.disabledCount || 0 },
    { label: 'Assigned Areas', value: data?.areaDistribution?.length || 0 },
  ];

  const tableHeaders = ['Admin Name', 'Phone', 'Assigned Area', 'Status', 'Appointed'];
  const tableRows = adminsList.map((a) => [
    a.profiles?.full_name || 'Admin Officer',
    a.profiles?.phone || '—',
    a.areas?.name || 'Unassigned',
    a.is_active ? 'ACTIVE' : 'DISABLED',
    formatKolkataDateTime(a.created_at, { month: 'numeric', year: '2-digit' }),
  ]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Administrator Governance Reports"
        subtitle="Regional Area Delegations, Activity & Permissions"
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

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Loading administrator delegation reports...</Text>
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
                  accent={idx === 1 ? colors.statusSafe : idx === 2 ? colors.statusEmergency : colors.deepMaroon}
                />
              ))}
            </View>

            {/* Status Distribution */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardTitle}>Administrator Account Status</Text>
              <SuperAdminDistributionDonut
                series={Object.entries(statusDist).map(([label, value]) => ({ label, value }))}
              />
            </View>

            {/* Area Allocation */}
            {data?.areaDistribution?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Administrator Area Allocations</Text>
                <SuperAdminReportBars series={data.areaDistribution} barColor={colors.saffron} />
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
        title="Administrator Hierarchy & Area Delegation Report"
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
