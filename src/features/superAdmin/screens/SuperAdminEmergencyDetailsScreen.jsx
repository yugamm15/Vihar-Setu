import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminEmergencyService } from '../services/superAdminEmergencyService';

const date = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';
const Section = ({ title, children }) => <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
const Row = ({ children }) => <View style={styles.row}><Text style={styles.rowText}>{children}</Text></View>;

export const SuperAdminEmergencyDetailsScreen = ({ route, navigation }) => {
  const emergencyId = route?.params?.emergencyId;
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setResult(await superAdminEmergencyService.getEmergencyDetails(emergencyId));
    setLoading(false); setRefreshing(false);
  }, [emergencyId]);
  useEffect(() => { load(); }, [load]);

  const action = (name) => Alert.alert(t('super_admin.emergency_operations.confirm_title'), `${name}?`, [
    { text: t('super_admin.management.cancel'), style: 'cancel' },
    { text: t('super_admin.management.confirm'), onPress: async () => {
      const response = await superAdminEmergencyService.manageEmergency(emergencyId, name === 'Acknowledge' ? 'ACKNOWLEDGE' : name === 'Resolve' ? 'RESOLVE' : 'FALSE_ALARM');
      if (response.error) Alert.alert(t('super_admin.management.error_title'), response.error.message);
      else { await load(); Alert.alert(t('super_admin.management.success_title'), t('super_admin.management.saved')); }
    } },
  ]);

  const data = result?.data;
  return <View style={styles.container}>
    <AppHeader title={t('super_admin.emergency_operations.details_title')} showBack onBack={() => navigation.goBack()} />
    {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : result?.error ? <Text style={styles.error}>{result.error.message}</Text> : (
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
        <View style={styles.card}><Text style={styles.id}>{data.emergency.id}</Text><Text style={styles.status}>{data.emergency.status}</Text><Row>{t('super_admin.emergency_operations.triggered')}: {date(data.emergency.triggered_at)}</Row><Row>{t('super_admin.emergency_operations.type')}: {data.emergency.trigger_type}</Row><Row>{t('super_admin.emergency_operations.severity')}: {data.emergency.severity}</Row><Row>{t('super_admin.emergency_operations.triggering_user')}: {data.emergency.profiles?.full_name || data.emergency.user_id}</Row><Row>{t('super_admin.emergency_operations.vihar')}: {data.emergency.vihars?.title || data.emergency.vihar_id || '—'}</Row></View>
        <View style={styles.actions}>{['TRIGGERED', 'ESCALATING'].includes(data.emergency.status) ? <TouchableOpacity style={styles.action} onPress={() => action('Acknowledge')}><Text style={styles.actionText}>{t('super_admin.emergency_operations.acknowledge')}</Text></TouchableOpacity> : null}{data.emergency.status === 'RESPONDED' ? <TouchableOpacity style={styles.action} onPress={() => action('Resolve')}><Text style={styles.actionText}>{t('super_admin.emergency_operations.resolve')}</Text></TouchableOpacity> : null}{!['RESOLVED', 'FALSE_ALARM'].includes(data.emergency.status) ? <TouchableOpacity style={styles.secondaryAction} onPress={() => action('False alarm')}><Text style={styles.secondaryText}>{t('super_admin.emergency_operations.false_alarm')}</Text></TouchableOpacity> : null}</View>
        <Section title={t('super_admin.emergency_operations.location_history')}>{data.locations.length ? data.locations.slice(0, 10).map((item) => <Row key={item.id}>{item.latitude}, {item.longitude} · {date(item.recorded_at)}</Row>) : <Text style={styles.empty}>—</Text>}</Section>
        <Section title={t('super_admin.emergency_operations.attempts')}>{data.attempts.length ? data.attempts.map((item) => <Row key={item.id}>#{item.attempt_number} · {item.status} · {date(item.notified_at)}{item.responded_at ? ` · ${date(item.responded_at)}` : ''}</Row>) : <Text style={styles.empty}>—</Text>}</Section>
        <Section title={t('super_admin.emergency_operations.route_events')}>{data.routeEvents.length ? data.routeEvents.map((item) => <Row key={item.id}>{item.severity} · {item.event_type} · {item.message} · {date(item.created_at)}</Row>) : <Text style={styles.empty}>—</Text>}</Section>
        <Section title={t('super_admin.emergency_operations.holds')}>{data.holds.length ? data.holds.map((item) => <Row key={item.id}>{item.status} · {item.reason || item.location_name || '—'} · {date(item.created_at)}</Row>) : <Text style={styles.empty}>—</Text>}</Section>
        <Section title={t('super_admin.emergency_operations.audit')}>{data.audit.length ? data.audit.map((item) => <Row key={item.id}>{item.action} · {date(item.created_at)}</Row>) : <Text style={styles.empty}>—</Text>}</Section>
      </ScrollView>
    )}
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl }, card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md }, id: { ...typography.caption, color: colors.textMuted }, status: { ...typography.h3, color: colors.statusEmergency, marginVertical: spacing.xs }, row: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.xs }, rowText: { ...typography.caption, color: colors.textPrimary }, actions: { marginVertical: spacing.md }, action: { backgroundColor: colors.deepMaroon, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.sm }, actionText: { ...typography.bodySmall, color: colors.warmIvory, textAlign: 'center', fontWeight: '800' }, secondaryAction: { borderColor: colors.deepMaroon, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md }, secondaryText: { ...typography.bodySmall, color: colors.deepMaroon, textAlign: 'center', fontWeight: '800' }, section: { marginTop: spacing.md }, sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm }, empty: { ...typography.caption, color: colors.textSecondary }, error: { ...typography.body, color: colors.statusEmergency, padding: spacing.lg }, state: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
