import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminViharService } from '../services/superAdminViharService';

const date = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';
const Section = ({ title, children }) => <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
const Row = ({ children }) => <Text style={styles.row}>{children}</Text>;

export const SuperAdminViharDetailsScreen = ({ route, navigation }) => {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    const response = await superAdminViharService.getViharDetails(route.params?.viharId);
    setRecord(response.data); setError(response.error?.message || null); setLoading(false); setRefreshing(false);
  }, [route.params?.viharId]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <View style={styles.container}><AppHeader title={t('super_admin.vihar_operations.details')} showBack onBack={() => navigation.goBack()} /><ActivityIndicator style={styles.loader} color={colors.saffron} /></View>;
  const vihar = record?.vihar;
  return <View style={styles.container}><AppHeader title={t('super_admin.vihar_operations.details')} showBack onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {vihar ? <><Section title={vihar.title || vihar.id}><Row>{vihar.status} · {vihar.safety_status}</Row><Row>{vihar.source_name || '—'} → {vihar.dest_name || '—'}</Row><Row>{t('super_admin.vihar_operations.responsible')}: {vihar.profiles?.full_name || '—'}</Row><Row>{t('super_admin.vihar_operations.started')}: {date(vihar.started_at)}</Row><Row>{t('super_admin.vihar_operations.completed_time')}: {date(vihar.completed_at)}</Row></Section>
      <Section title={t('super_admin.vihar_operations.sub_vihars')}>{record.subVihars.length ? record.subVihars.map((item) => <View style={styles.item} key={item.id}><Text style={styles.itemTitle}>#{item.sub_vihar_number} {item.title}</Text><Row>{item.status} · {date(item.started_at)} — {date(item.completed_at)}</Row>{(item.vihar_participants || []).filter((participant) => participant.is_current_responsible && !participant.left_at).map((participant) => <Row key={participant.id}>{t('super_admin.vihar_operations.responsible')}: {participant.profiles?.full_name || participant.user_id}</Row>)}</View>) : <Row>{t('super_admin.vihar_operations.empty')}</Row>}</Section>
      <Section title={t('super_admin.vihar_operations.participants')}>{record.participants.length ? record.participants.map((item) => <View style={styles.item} key={item.id}><Text style={styles.itemTitle}>{item.profiles?.full_name || item.user_id}</Text><Row>{item.role} · {item.is_current_responsible ? t('super_admin.vihar_operations.current_responsible') : t('super_admin.vihar_operations.former_participant')}</Row><Row>{date(item.joined_at)} — {date(item.left_at)}</Row></View>) : <Row>{t('super_admin.vihar_operations.empty')}</Row>}</Section>
      <Section title={t('super_admin.vihar_operations.handovers')}>{record.handovers.length ? record.handovers.map((item) => <View style={styles.item} key={item.id}><Text style={styles.itemTitle}>{item.status}</Text><Row>{item.from_profile?.full_name || '—'} → {item.to_profile?.full_name || item.next_sevak_name || '—'}</Row><Row>{date(item.handover_time)} · {item.handover_location_name || '—'}</Row></View>) : <Row>{t('super_admin.vihar_operations.empty')}</Row>}</Section>
      <Section title={t('super_admin.vihar_operations.holds')}>{record.holds.length ? record.holds.map((item) => <View style={styles.item} key={item.id}><Text style={styles.itemTitle}>{item.reason} · {item.status}</Text><Row>{item.profiles?.full_name || '—'} · {item.location_name || '—'}</Row><Row>{date(item.hold_start)} — {date(item.hold_end)}</Row></View>) : <Row>{t('super_admin.vihar_operations.empty')}</Row>}</Section>
      <Section title={t('super_admin.vihar_operations.activity')}>{record.routeEvents.length ? record.routeEvents.map((item) => <View style={styles.item} key={item.id}><Text style={styles.itemTitle}>{item.event_type} · {item.severity}</Text><Row>{item.message || '—'}</Row><Row>{date(item.created_at)}</Row></View>) : <Row>{t('super_admin.vihar_operations.empty')}</Row>}</Section>
      <Section title={t('super_admin.vihar_operations.locations')}><Row>{record.locations.length ? `${record.locations.length} ${t('super_admin.vihar_operations.location_records')}` : t('super_admin.vihar_operations.empty')}</Row>{record.locations.slice(0, 5).map((item) => <Row key={item.id}>{item.latitude}, {item.longitude} · {date(item.recorded_at)}</Row>)}</Section>
      <Section title={t('super_admin.vihar_operations.participant_audit')}><Row>{record.audit.length ? `${record.audit.length} ${t('super_admin.vihar_operations.audit_records')}` : t('super_admin.vihar_operations.empty')}</Row>{record.audit.slice(0, 5).map((item) => <Row key={item.id}>{item.action} · {date(item.created_at)}</Row>)}</Section>
    </> : <Text style={styles.error}>{t('super_admin.vihar_operations.not_found')}</Text>}
  </ScrollView></View>;
};

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.warmIvory }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl }, loader: { marginTop: spacing.xxxl }, section: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md }, sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm }, row: { ...typography.caption, color: colors.textSecondary, marginTop: 3 }, item: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.sm, marginTop: spacing.sm }, itemTitle: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700' }, error: { ...typography.bodySmall, color: colors.statusEmergency, marginBottom: spacing.md } });
