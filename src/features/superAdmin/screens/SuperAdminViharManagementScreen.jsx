import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminViharService } from '../services/superAdminViharService';
import { superAdminAreaService } from '../services/superAdminAreaService';

const statuses = ['ALL', 'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const date = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';

export const SuperAdminViharManagementScreen = ({ navigation }) => {
  const [overview, setOverview] = useState(null);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ status: 'ALL', area: '', responsibleSevika: '', search: '', from: '', to: '' });
  const [areas, setAreas] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    const [summary, directory] = await Promise.all([superAdminViharService.getOverview(), superAdminViharService.listVihars(filters, page)]);
    setOverview(summary); setItems(directory.data || []); setTotal(directory.count || 0); setError(directory.error?.message || null);
    setLoading(false); setRefreshing(false);
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    superAdminAreaService.listAreas().then(({ data }) => setAreas(data || []));
  }, []);
  const updateFilter = (key, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const metric = (key) => overview?.data?.[key] ?? '—';
  return <View style={styles.container}>
    <AppHeader title={t('super_admin.vihar_operations.title')} subtitle={t('super_admin.vihar_operations.subtitle')} showBack onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
      <View style={styles.metrics}>{[['total', 'total'], ['active', 'active'], ['completed', 'completed_vihars'], ['held', 'held'], ['subVihars', 'sub_vihars'], ['participants', 'participants']].map(([key, label]) => <View style={styles.metric} key={key}><Text style={styles.metricValue}>{metric(key)}</Text><Text style={styles.metricLabel}>{t(`super_admin.vihar_operations.${label}`)}</Text></View>)}</View>
      <View style={styles.filters}>
        <TextInput value={filters.search} onChangeText={(value) => updateFilter('search', value)} placeholder={t('super_admin.vihar_operations.search')} placeholderTextColor={colors.textMuted} style={styles.input} />
        <View style={styles.chips}>
          {statuses.map((status) => (
            <TouchableOpacity key={status} style={[styles.chip, filters.status === status && styles.selected]} onPress={() => updateFilter('status', status)}>
              <Text style={[styles.chipText, filters.status === status && styles.selectedChipText]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.filterLabel}>{t('super_admin.vihar_operations.area')}</Text>
        <View style={styles.chips}>
          <TouchableOpacity style={[styles.chip, !filters.area && styles.selected]} onPress={() => updateFilter('area', '')}>
            <Text style={[styles.chipText, !filters.area && styles.selectedChipText]}>{t('super_admin.vihar_operations.all_areas')}</Text>
          </TouchableOpacity>
          {areas.map((area) => (
            <TouchableOpacity key={area.id} style={[styles.chip, filters.area === area.name && styles.selected]} onPress={() => updateFilter('area', area.name)}>
              <Text style={[styles.chipText, filters.area === area.name && styles.selectedChipText]}>{area.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput value={filters.responsibleSevika} onChangeText={(value) => updateFilter('responsibleSevika', value)} placeholder={t('super_admin.vihar_operations.responsible')} placeholderTextColor={colors.textMuted} style={styles.input} />
        <View style={styles.dateRow}>
          <TextInput value={filters.from} onChangeText={(value) => updateFilter('from', value)} placeholder={t('super_admin.vihar_operations.from')} placeholderTextColor={colors.textMuted} style={[styles.input, styles.dateInput]} />
          <TextInput value={filters.to} onChangeText={(value) => updateFilter('to', value)} placeholder={t('super_admin.vihar_operations.to')} placeholderTextColor={colors.textMuted} style={[styles.input, styles.dateInput]} />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {overview?.data?.handovers?.length ? <View style={styles.recent}><Text style={styles.recentTitle}>{t('super_admin.vihar_operations.recent_handovers')}</Text>{overview.data.handovers.slice(0, 3).map((item) => <Text style={styles.detail} key={item.id}>{item.status} · {date(item.handover_time)}</Text>)}</View> : null}
      {overview?.data?.activity?.length ? <View style={styles.recent}><Text style={styles.recentTitle}>{t('super_admin.vihar_operations.activity')}</Text>{overview.data.activity.slice(0, 3).map((item) => <Text style={styles.detail} key={item.id}>{item.event_type} · {date(item.created_at)}</Text>)}</View> : null}
      {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : items.length ? items.map((item) => <TouchableOpacity key={item.id} style={styles.card} onPress={() => navigation.navigate('SuperAdminViharDetails', { viharId: item.id })}><Text style={styles.title}>{item.title || item.id}</Text><Text style={styles.status}>{item.status} · {item.safety_status}</Text><Text style={styles.detail}>{item.source_name || '—'} → {item.dest_name || '—'}</Text><Text style={styles.detail}>{t('super_admin.vihar_operations.responsible')}: {item.profiles?.full_name || '—'}</Text><Text style={styles.detail}>{t('super_admin.vihar_operations.created')}: {date(item.created_at)}</Text></TouchableOpacity>) : <Text style={styles.empty}>{t('super_admin.vihar_operations.empty')}</Text>}
      {!loading && total > superAdminViharService.pageSize ? <View style={styles.pagination}><TouchableOpacity disabled={page === 0} onPress={() => setPage((value) => value - 1)}><Text style={[styles.pageButton, page === 0 && styles.disabled]}>{t('super_admin.vihar_operations.previous')}</Text></TouchableOpacity><Text style={styles.pageNumber}>{page + 1} / {Math.ceil(total / superAdminViharService.pageSize)}</Text><TouchableOpacity disabled={(page + 1) * superAdminViharService.pageSize >= total} onPress={() => setPage((value) => value + 1)}><Text style={[styles.pageButton, (page + 1) * superAdminViharService.pageSize >= total && styles.disabled]}>{t('super_admin.vihar_operations.next')}</Text></TouchableOpacity></View> : null}
    </ScrollView>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metric: { width: '48%', backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  metricValue: { ...typography.h3, color: colors.deepMaroon },
  metricLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  filters: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.md, padding: spacing.md, marginVertical: spacing.md },
  filterLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.sm, color: colors.textPrimary },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateInput: { width: '48%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  chip: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  selected: { backgroundColor: colors.deepMaroon, borderColor: colors.deepMaroon },
  chipText: { ...typography.caption, color: colors.textPrimary },
  selectedChipText: { color: colors.warmIvory, fontWeight: '800' },
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  recent: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  recentTitle: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800', marginBottom: spacing.xs },
  title: { ...typography.h4, color: colors.deepMaroon },
  status: { ...typography.caption, color: colors.saffronDark, marginVertical: spacing.xs, fontWeight: '800' },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  error: { ...typography.caption, color: colors.statusEmergency },
  empty: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', padding: spacing.xxxl },
  state: { padding: spacing.xxxl, alignItems: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  pageButton: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800' },
  pageNumber: { ...typography.caption, color: colors.textSecondary },
  disabled: { opacity: 0.4 }
});
