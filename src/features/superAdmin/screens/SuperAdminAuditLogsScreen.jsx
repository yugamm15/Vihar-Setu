import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminAuditService } from '../services/SuperAdminAuditService';

const formatDate = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';

export const SuperAdminAuditLogsScreen = ({ navigation }) => {
  const [filters, setFilters] = useState({ recordId: '', action: '', entity: '', actorId: '', dateFrom: '', dateTo: '' });
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (nextPage = 0, refresh = false) => {
    if (refresh) setRefreshing(true);
    const response = await superAdminAuditService.listAuditLogs(filters, nextPage);
    setResult(response);
    setPage(nextPage);
    setRefreshing(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  const records = result?.data || [];
  const totalPages = result ? Math.ceil(result.count / superAdminAuditService.pageSize) : 0;

  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.audit.title')} subtitle={t('super_admin.audit.subtitle')} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(page, true)} tintColor={colors.saffron} />}>
        <TouchableOpacity style={styles.overviewLink} onPress={() => navigation.navigate('SuperAdminSecurityOverview')}><Text style={styles.overviewLinkText}>{t('super_admin.audit.security_title')}</Text></TouchableOpacity>
        <View style={styles.filters}>
          <TextInput value={filters.recordId} onChangeText={(value) => setFilters({ ...filters, recordId: value })} placeholder={t('super_admin.audit.record_id_filter')} placeholderTextColor={colors.textMuted} style={styles.input} autoCapitalize="none" />
          <TextInput value={filters.action} onChangeText={(value) => setFilters({ ...filters, action: value })} placeholder={t('super_admin.audit.action_filter')} placeholderTextColor={colors.textMuted} style={styles.input} />
          <TextInput value={filters.entity} onChangeText={(value) => setFilters({ ...filters, entity: value })} placeholder={t('super_admin.audit.entity_filter')} placeholderTextColor={colors.textMuted} style={styles.input} />
          <TextInput value={filters.actorId} onChangeText={(value) => setFilters({ ...filters, actorId: value })} placeholder={t('super_admin.audit.actor_filter')} placeholderTextColor={colors.textMuted} style={styles.input} autoCapitalize="none" />
          <TextInput value={filters.dateFrom} onChangeText={(value) => setFilters({ ...filters, dateFrom: value })} placeholder={t('super_admin.audit.date_from')} placeholderTextColor={colors.textMuted} style={styles.input} />
          <TextInput value={filters.dateTo} onChangeText={(value) => setFilters({ ...filters, dateTo: value })} placeholder={t('super_admin.audit.date_to')} placeholderTextColor={colors.textMuted} style={styles.input} />
          <TouchableOpacity style={styles.apply} onPress={() => load(0)}><Text style={styles.applyText}>{t('super_admin.audit.apply')}</Text></TouchableOpacity>
        </View>
        {result?.error ? <View style={styles.state}><Text style={styles.error}>{t('super_admin.audit.load_error')}</Text><TouchableOpacity onPress={() => load(page)}><Text style={styles.retry}>{t('common.retry')}</Text></TouchableOpacity></View> : null}
        {!result ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : records.length ? records.map((record) => (
          <TouchableOpacity key={record.id} style={styles.card} onPress={() => navigation.navigate('SuperAdminAuditLogDetails', { auditLogId: record.id })}>
            <Text style={styles.action}>{record.action}</Text>
            <Text style={styles.meta}>{record.entity || '—'} · {record.entity_id || '—'}</Text>
            <Text style={styles.meta}>{t('super_admin.audit.actor')}: {record.actor_id || '—'}</Text>
            <Text style={styles.date}>{formatDate(record.created_at)}</Text>
          </TouchableOpacity>
        )) : !result?.error ? <Text style={styles.empty}>{t('super_admin.audit.empty')}</Text> : null}
        {result && totalPages > 1 ? <View style={styles.pagination}><TouchableOpacity disabled={page === 0} onPress={() => load(page - 1)}><Text style={page === 0 ? styles.disabled : styles.pageAction}>{t('super_admin.audit.previous')}</Text></TouchableOpacity><Text style={styles.pageText}>{page + 1} / {totalPages}</Text><TouchableOpacity disabled={page + 1 >= totalPages} onPress={() => load(page + 1)}><Text style={page + 1 >= totalPages ? styles.disabled : styles.pageAction}>{t('super_admin.audit.next')}</Text></TouchableOpacity></View> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  overviewLink: { backgroundColor: colors.softCream, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md }, overviewLinkText: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800', textAlign: 'center' }, filters: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md }, input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: borderRadius.sm, padding: spacing.sm, color: colors.textPrimary, marginBottom: spacing.sm }, apply: { backgroundColor: colors.deepMaroon, borderRadius: borderRadius.sm, padding: spacing.sm }, applyText: { ...typography.bodySmall, color: colors.textLight, textAlign: 'center', fontWeight: '700' },
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm }, action: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800' }, meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }, date: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs }, empty: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', padding: spacing.xxxl },
  state: { alignItems: 'center', padding: spacing.xxxl }, error: { ...typography.bodySmall, color: colors.statusEmergency }, retry: { ...typography.bodySmall, color: colors.saffronDark, fontWeight: '800', marginTop: spacing.md }, pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md }, pageAction: { ...typography.bodySmall, color: colors.saffronDark, fontWeight: '800' }, disabled: { ...typography.bodySmall, color: colors.disabled }, pageText: { ...typography.caption, color: colors.textSecondary },
});
