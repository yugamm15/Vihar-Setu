import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminEmergencyService } from '../services/superAdminEmergencyService';

const date = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';
const elapsed = (value) => value ? `${Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))} min` : '—';
const locationAge = (value) => value && Date.now() - new Date(value).getTime() <= 15 * 60 * 1000 ? 'recent' : 'stale';
const statuses = ['ALL', 'TRIGGERED', 'ESCALATING', 'RESPONDED', 'RESOLVED', 'FALSE_ALARM'];

export const SuperAdminEmergencyMonitoringScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ status: 'ALL', triggerType: 'ALL', severity: 'ALL', from: '', to: '', viharId: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    const result = await superAdminEmergencyService.listEmergencies(filters);
    setItems(result.data || []);
    setError(result.error?.message || null);
    setLoading(false); setRefreshing(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.emergency_operations.title')} subtitle={t('super_admin.emergency_operations.subtitle')} showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>{t('super_admin.emergency_operations.status_filter')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {statuses.map((status) => <TouchableOpacity key={status} style={[styles.filterChip, filters.status === status && styles.selectedChip]} onPress={() => setFilters((current) => ({ ...current, status }))}><Text style={styles.filterText}>{status}</Text></TouchableOpacity>)}
          </ScrollView>
          <TextInput value={filters.triggerType === 'ALL' ? '' : filters.triggerType} onChangeText={(triggerType) => setFilters((current) => ({ ...current, triggerType: triggerType || 'ALL' }))} placeholder={t('super_admin.emergency_operations.type_filter')} placeholderTextColor={colors.textMuted} style={styles.input} />
          <TextInput value={filters.severity === 'ALL' ? '' : filters.severity} onChangeText={(severity) => setFilters((current) => ({ ...current, severity: severity || 'ALL' }))} placeholder={t('super_admin.emergency_operations.severity_filter')} placeholderTextColor={colors.textMuted} style={styles.input} />
          <TextInput value={filters.viharId} onChangeText={(viharId) => setFilters((current) => ({ ...current, viharId }))} placeholder={t('super_admin.emergency_operations.vihar_filter')} placeholderTextColor={colors.textMuted} style={styles.input} />
          <View style={styles.dateRow}><TextInput value={filters.from} onChangeText={(from) => setFilters((current) => ({ ...current, from }))} placeholder={t('super_admin.emergency_operations.from')} placeholderTextColor={colors.textMuted} style={[styles.input, styles.dateInput]} /><TextInput value={filters.to} onChangeText={(to) => setFilters((current) => ({ ...current, to }))} placeholder={t('super_admin.emergency_operations.to')} placeholderTextColor={colors.textMuted} style={[styles.input, styles.dateInput]} /></View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : items.length ? items.map((item) => (
          <TouchableOpacity key={item.id} style={styles.card} onPress={() => navigation.navigate('SuperAdminEmergencyDetails', { emergencyId: item.id })}>
            <View style={styles.cardHeader}><Text style={styles.id}>{item.id}</Text><Text style={styles.status}>{item.status}</Text></View>
            <Text style={styles.severity}>{item.severity || '—'} · {item.trigger_type}</Text>
            <Text style={styles.detail}>{t('super_admin.emergency_operations.triggered')}: {date(item.triggered_at)} ({elapsed(item.triggered_at)})</Text>
            <Text style={styles.detail}>{t('super_admin.emergency_operations.vihar')}: {item.vihars?.title || item.vihar_id || '—'}</Text>
            <Text style={styles.detail}>{t('super_admin.emergency_operations.responsible')}: {item.profiles?.full_name || '—'}</Text>
            <Text style={styles.detail}>{t('super_admin.emergency_operations.location')}: {item.lastLocation ? `${item.lastLocation.latitude}, ${item.lastLocation.longitude} · ${date(item.lastLocation.recorded_at)} · ${locationAge(item.lastLocation.recorded_at)}` : '—'}</Text>
          </TouchableOpacity>
        )) : <Text style={styles.empty}>{t('super_admin.emergency_operations.empty')}</Text>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  filters: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md }, filterLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }, filterChip: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginRight: spacing.xs }, selectedChip: { backgroundColor: colors.deepMaroon }, filterText: { ...typography.caption, color: colors.textPrimary }, input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.sm, padding: spacing.sm, marginTop: spacing.sm, color: colors.textPrimary }, dateRow: { flexDirection: 'row', gap: spacing.sm }, dateInput: { flex: 1 }, card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between' }, id: { ...typography.caption, color: colors.textMuted }, status: { ...typography.caption, color: colors.deepMaroon, fontWeight: '800' }, severity: { ...typography.h4, color: colors.statusEmergency, marginVertical: spacing.xs }, detail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 }, error: { ...typography.caption, color: colors.statusEmergency, marginBottom: spacing.md }, empty: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', padding: spacing.xxxl }, state: { padding: spacing.xxxl, alignItems: 'center' },
});
