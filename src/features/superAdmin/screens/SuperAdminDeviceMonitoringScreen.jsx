import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminMonitoringService } from '../services/SuperAdminMonitoringService';

const date = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';

export const SuperAdminDeviceMonitoringScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback(async (refresh = false) => {
    const next = refresh ? 0 : page;
    if (refresh) setRefreshing(true); else setLoading(true);
    const result = await superAdminMonitoringService.listDevices(next);
    setError(result.error?.message || null);
    if (!result.error) {
      setItems((current) => next === 0 ? result.data : [...current, ...result.data]);
      setTotal(result.count);
      setPage(next);
    }
    setLoading(false); setRefreshing(false);
  }, [page]);
  useEffect(() => { load(); }, [load]);
  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.monitoring.devices')} subtitle={`${t('super_admin.monitoring.total_records')}: ${total}`} showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
        {error ? <View style={styles.notice}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={() => load(true)}><Text style={styles.retry}>{t('super_admin.common.retry')}</Text></TouchableOpacity></View> : null}
        {loading && !items.length ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : items.length ? items.map((item) => (
          <View style={styles.card} key={item.id}>
            <View style={styles.row}><Text style={styles.status}>{item.network_status || '—'}</Text><Text style={styles.appState}>{item.app_state || '—'}</Text></View>
            <Text style={styles.detail}>{t('super_admin.monitoring.user_reference')}: {item.user_id || '—'}</Text>
            <Text style={styles.detail}>{t('super_admin.monitoring.last_heartbeat')}: {date(item.last_heartbeat)}</Text>
            <Text style={styles.detail}>{t('super_admin.monitoring.battery')}: {item.battery_percentage === null || item.battery_percentage === undefined ? '—' : `${item.battery_percentage}%`}</Text>
            <Text style={styles.detail}>{t('super_admin.monitoring.gps')}: {item.gps_enabled === null || item.gps_enabled === undefined ? '—' : item.gps_enabled ? t('super_admin.monitoring.enabled') : t('super_admin.monitoring.disabled')}</Text>
          </View>
        )) : <Text style={styles.empty}>{t('super_admin.monitoring.no_devices')}</Text>}
        {!loading && items.length < total ? <TouchableOpacity style={styles.more} onPress={() => setPage((current) => current + 1)}><Text style={styles.moreText}>{t('super_admin.monitoring.load_more')}</Text></TouchableOpacity> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { ...typography.h4, color: colors.deepMaroon },
  appState: { ...typography.caption, color: colors.textSecondary },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  empty: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', padding: spacing.xxxl },
  state: { padding: spacing.xxxl, alignItems: 'center' },
  notice: { backgroundColor: colors.statusWarningBg, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  error: { ...typography.caption, color: colors.statusEmergency },
  retry: { ...typography.caption, color: colors.deepMaroon, fontWeight: '700', marginTop: spacing.sm },
  more: { backgroundColor: colors.deepMaroon, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.sm },
  moreText: { ...typography.bodySmall, color: colors.warmIvory, textAlign: 'center', fontWeight: '700' },
});
