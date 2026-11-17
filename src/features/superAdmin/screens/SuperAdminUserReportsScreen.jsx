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

const ROLES = ['ALL', 'SEVAK', 'ADMIN', 'SUPER_ADMIN'];
const STATUSES = ['ALL', 'ACTIVE', 'PENDING', 'DISABLED', 'REJECTED'];

export const SuperAdminUserReportsScreen = ({ navigation }) => {
  const [periodKey, setPeriodKey] = useState('last_30_days');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const range = getPeriodRange(periodKey);
    const result = await superAdminReportsService.fetchUserReports(
      {
        role: roleFilter,
        status: statusFilter,
        search,
        area: areaFilter,
        limit: 100,
      },
      range
    );

    setData(result.data);
    setLoading(false);
    setRefreshing(false);
  }, [periodKey, roleFilter, statusFilter, search, areaFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const usersList = data?.list || [];
  const statusDist = data?.statusDistribution || {};
  const roleDist = data?.roleDistribution || {};

  const summaryMetrics = [
    { label: 'Total Registered Users', value: data?.total ?? '—' },
    { label: 'Active Accounts', value: statusDist.ACTIVE || 0 },
    { label: 'Pending Approvals', value: statusDist.PENDING || 0 },
    { label: 'Disabled Accounts', value: statusDist.DISABLED || 0 },
  ];

  const tableHeaders = ['Name', 'Phone', 'Role', 'Status', 'Area', 'Registered'];
  const tableRows = usersList.map((u) => [
    u.full_name || 'Unnamed',
    u.phone || '—',
    u.role || 'SEVAK',
    u.status || 'ACTIVE',
    u.area || u.city || '—',
    formatKolkataDateTime(u.created_at, { month: 'numeric', year: '2-digit' }),
  ]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="User Governance Reports"
        subtitle="Registration, Roles & Account Status Oversight"
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

        {/* Filters Card */}
        <View style={[styles.filterCard, shadows.card]}>
          <Text style={styles.cardHeader}>Filters & Search</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, phone, city..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />

          <Text style={styles.subLabel}>Role Filter:</Text>
          <View style={styles.chipsRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.filterChip, roleFilter === r && styles.filterChipActive]}
                onPress={() => setRoleFilter(r)}
              >
                <Text style={[styles.filterChipText, roleFilter === r && styles.filterChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.subLabel}>Status Filter:</Text>
          <View style={styles.chipsRow}>
            {STATUSES.map((s) => (
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
            <Text style={styles.loadingText}>Compiling user intelligence data...</Text>
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
                  accent={idx === 1 ? colors.statusSafe : idx === 2 ? colors.saffron : idx === 3 ? colors.statusEmergency : colors.deepMaroon}
                />
              ))}
            </View>

            {/* Distribution Charts */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardTitle}>Role Distribution</Text>
              <SuperAdminDistributionDonut
                series={Object.entries(roleDist).map(([label, value]) => ({ label, value }))}
              />
            </View>

            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardTitle}>Account Status Breakdown</Text>
              <SuperAdminReportBars
                series={Object.entries(statusDist).map(([label, value]) => ({ label, value }))}
              />
            </View>

            {data?.areaDistribution?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>Top Operational Areas</Text>
                <SuperAdminReportBars series={data.areaDistribution.slice(0, 8)} barColor={colors.gold} />
              </View>
            )}

            {data?.registrationTrend?.length > 0 && (
              <View style={[styles.card, shadows.card]}>
                <Text style={styles.cardTitle}>New User Registrations Over Time</Text>
                <SuperAdminReportTrend series={data.registrationTrend.slice(-10)} />
              </View>
            )}

            {/* Export & Preview Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.previewButton} onPress={() => setPreviewOpen(true)}>
                <Text style={styles.previewButtonText}>Preview Official Report & Export</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Report Preview & Export Modal */}
      <SuperAdminReportPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="User Governance & Directory Report"
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
