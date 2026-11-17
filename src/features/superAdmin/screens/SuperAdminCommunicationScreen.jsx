import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminCommunicationService } from '../services/superAdminCommunicationService';

const categories = ['GENERAL', 'SAFETY', 'WEATHER', 'VIHAR_INSTRUCTIONS', 'EMERGENCY', 'MAINTENANCE', 'IMPORTANT'];
const priorities = ['NORMAL', 'IMPORTANT', 'URGENT'];
const audiences = ['ALL_USERS', 'ALL_SEVIKAS', 'ALL_ADMINISTRATORS', 'SELECTED_AREA', 'SELECTED_VIHAR'];
const types = ['ALL', 'EMERGENCY', 'DEVIATION', 'SYSTEM', 'HANDOVER', 'HOLD', 'APPROVAL', 'POLICE_CALL'];
const BLANK_FORM = { title: '', description: '', category: 'GENERAL', priority: 'NORMAL', targetAudience: 'ALL_USERS', targetAreaId: '', targetViharId: '', expiresAt: '' };
const fmtDate = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';

export const SuperAdminCommunicationScreen = ({ navigation }) => {
  const [overview, setOverview] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifPage, setNotifPage] = useState(0);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const [filters, setFilters] = useState({ type: 'ALL', read: 'ALL', search: '', from: '', to: '' });
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    const result = await superAdminCommunicationService.listAnnouncements({ status });
    setAnnouncements(result.data);
    return result.error;
  }, [status]);

  const loadNotifications = useCallback(async (page = 0) => {
    setNotifLoading(true);
    const result = await superAdminCommunicationService.listNotifications(filters, page);
    if (page === 0) {
      setNotifications(result.data);
    } else {
      setNotifications((prev) => [...prev, ...result.data]);
    }
    setNotifPage(page);
    setNotifHasMore(result.data.length === superAdminCommunicationService.pageSize);
    setNotifLoading(false);
    return result.error;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    const [summary, announcementError, notifError] = await Promise.all([
      superAdminCommunicationService.getOverview(),
      loadAnnouncements(),
      loadNotifications(0),
    ]);
    setOverview(summary);
    const activeErr = (announcementError && announcementError.code !== 'PGRST205' ? announcementError.message : null)
      || (notifError && notifError.code !== 'PGRST205' ? notifError.message : null);
    setError(activeErr);
    setLoading(false);
  }, [loadAnnouncements, loadNotifications]);

  useEffect(() => { load(); }, [load]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const resetForm = () => { setEditingId(null); setForm(BLANK_FORM); };

  const saveDraft = async () => {
    if (!form.title.trim() || !form.description.trim()) { setError(t('super_admin.communication.required')); return; }
    if ((form.targetAudience === 'SELECTED_AREA' && !form.targetAreaId.trim()) || (form.targetAudience === 'SELECTED_VIHAR' && !form.targetViharId.trim())) {
      setError(t('super_admin.communication.target_required')); return;
    }
    setSaving(true); setError(null);
    const result = editingId
      ? await superAdminCommunicationService.updateDraft(editingId, form)
      : await superAdminCommunicationService.createDraft(form);
    setSaving(false);
    if (result.error) { setError(result.error.message || t('super_admin.communication.save_error')); }
    else { resetForm(); await load(); }
  };

  const confirmAction = (message, action) => Alert.alert(
    t('super_admin.communication.confirm_title'), message,
    [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.confirm'), onPress: action }],
  );
  const publish = (id) => confirmAction(t('super_admin.communication.publish_confirm'), async () => {
    const result = await superAdminCommunicationService.publish(id);
    if (result.error) setError(result.error.message); else load();
  });
  const archive = (id) => confirmAction(t('super_admin.communication.archive_confirm'), async () => {
    const result = await superAdminCommunicationService.archive(id);
    if (result.error) setError(result.error.message); else load();
  });

  const metric = (key) => overview?.data?.[key] ?? '—';

  const priorityColor = (p) => p === 'URGENT' ? colors.statusEmergency : p === 'IMPORTANT' ? colors.saffron : colors.textSecondary;

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('super_admin.communication.title')}
        subtitle={t('super_admin.communication.subtitle')}
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.saffron} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Metrics */}
        <View style={styles.metrics}>
          {[
            ['totalNotifications', 'total_notifications'],
            ['unreadNotifications', 'unread_notifications'],
            ['activeAnnouncements', 'active_announcements'],
            ['systemNotifications', 'system_notifications'],
          ].map(([key, label]) => (
            <View style={styles.metric} key={key}>
              <Text style={styles.metricValue}>{metric(key)}</Text>
              <Text style={styles.metricLabel}>{t(`super_admin.communication.${label}`)}</Text>
            </View>
          ))}
        </View>

        {/* Create / Edit draft form */}
        <Section title={editingId ? t('super_admin.communication.edit_title') : t('super_admin.communication.create_title')}>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => updateForm('title', v)}
            placeholder={t('super_admin.communication.announcement_title')}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.description}
            onChangeText={(v) => updateForm('description', v)}
            placeholder={t('super_admin.communication.description')}
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <PickerChips values={categories} selected={form.category} onSelect={(v) => updateForm('category', v)} />
          <PickerChips values={priorities} selected={form.priority} onSelect={(v) => updateForm('priority', v)} />
          <PickerChips values={audiences} selected={form.targetAudience} onSelect={(v) => updateForm('targetAudience', v)} />
          {form.targetAudience === 'SELECTED_AREA' && (
            <TextInput
              style={styles.input}
              value={form.targetAreaId}
              onChangeText={(v) => updateForm('targetAreaId', v)}
              placeholder={t('super_admin.communication.area_id')}
              placeholderTextColor={colors.textMuted}
            />
          )}
          {form.targetAudience === 'SELECTED_VIHAR' && (
            <TextInput
              style={styles.input}
              value={form.targetViharId}
              onChangeText={(v) => updateForm('targetViharId', v)}
              placeholder={t('super_admin.communication.vihar_id')}
              placeholderTextColor={colors.textMuted}
            />
          )}
          <TextInput
            style={styles.input}
            value={form.expiresAt}
            onChangeText={(v) => updateForm('expiresAt', v)}
            placeholder={t('super_admin.communication.expiry')}
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={saveDraft} disabled={saving}>
              {saving
                ? <ActivityIndicator color={colors.warmIvory} />
                : <Text style={styles.primaryText}>
                    {editingId ? t('super_admin.communication.update_draft') : t('super_admin.communication.save_draft')}
                  </Text>}
            </TouchableOpacity>
            {editingId ? (
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Section>

        {/* Announcements list */}
        <Section title={t('super_admin.communication.announcements')}>
          <PickerChips values={['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED']} selected={status} onSelect={setStatus} />
          {loading ? (
            <ActivityIndicator color={colors.saffron} style={styles.listLoader} />
          ) : announcements.length ? (
            announcements.map((item) => (
              <View style={styles.card} key={item.id}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={[styles.priorityBadge, { color: priorityColor(item.priority) }]}>{item.priority}</Text>
                </View>
                <Text style={styles.detail}>{item.status} · {item.category} · {item.target_audience}</Text>
                <Text style={styles.detail}>{fmtDate(item.published_at || item.created_at)}</Text>
                {item.status === 'DRAFT' ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setEditingId(item.id);
                        setForm({
                          title: item.title,
                          description: item.description,
                          category: item.category,
                          priority: item.priority,
                          targetAudience: item.target_audience,
                          targetAreaId: item.target_area_id || '',
                          targetViharId: item.target_vihar_id || '',
                          expiresAt: item.expires_at || '',
                        });
                      }}
                    >
                      <Text style={styles.actionText}>{t('super_admin.communication.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.publishButton]} onPress={() => publish(item.id)}>
                      <Text style={styles.actionText}>{t('super_admin.communication.publish')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : item.status === 'PUBLISHED' ? (
                  <TouchableOpacity style={styles.actionButton} onPress={() => archive(item.id)}>
                    <Text style={styles.actionText}>{t('super_admin.communication.archive')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.empty}>{t('super_admin.communication.empty')}</Text>
          )}
        </Section>

        {/* Notifications list */}
        <Section title={t('super_admin.communication.notifications')}>
          <PickerChips
            values={types}
            selected={filters.type}
            onSelect={(v) => setFilters((c) => ({ ...c, type: v }))}
          />
          <PickerChips
            values={['ALL', 'READ', 'UNREAD']}
            selected={filters.read}
            onSelect={(v) => setFilters((c) => ({ ...c, read: v }))}
          />
          <TextInput
            style={styles.input}
            value={filters.search}
            onChangeText={(v) => setFilters((c) => ({ ...c, search: v }))}
            placeholder={t('super_admin.communication.notification_search')}
            placeholderTextColor={colors.textMuted}
          />
          {notifications.map((item) => (
            <TouchableOpacity
              style={[styles.card, !item.is_read && styles.unread]}
              key={item.id}
              onPress={() => navigation.navigate('SuperAdminNotificationDetails', { notificationId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {!item.is_read ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.detail}>{item.type} · {item.severity}</Text>
              <Text style={styles.detail}>{item.profiles?.full_name || item.user_id} · {fmtDate(item.created_at)}</Text>
            </TouchableOpacity>
          ))}
          {notifLoading ? (
            <ActivityIndicator color={colors.saffron} style={styles.listLoader} />
          ) : notifHasMore ? (
            <TouchableOpacity style={styles.loadMoreButton} onPress={() => loadNotifications(notifPage + 1)}>
              <Text style={styles.loadMoreText}>{t('super_admin.communication.load_more')}</Text>
            </TouchableOpacity>
          ) : null}
          {!notifLoading && notifications.length === 0 ? (
            <Text style={styles.empty}>{t('super_admin.communication.empty')}</Text>
          ) : null}
        </Section>
      </ScrollView>
    </View>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const PickerChips = ({ values, selected, onSelect }) => (
  <View style={styles.chips}>
    {values.map((value) => (
      <TouchableOpacity key={value} style={[styles.chip, selected === value && styles.chipSelected]} onPress={() => onSelect(value)}>
        <Text style={[styles.chipText, selected === value && styles.chipTextSelected]}>{value}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.md },
  metric: {
    width: '48%', backgroundColor: colors.cardBackground, borderColor: colors.cardBorder,
    borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  metricValue: { ...typography.h3, color: colors.deepMaroon, fontWeight: '800' },
  metricLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  section: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.sm,
    padding: spacing.sm, color: colors.textPrimary, marginBottom: spacing.sm,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  chipSelected: { backgroundColor: colors.deepMaroon, borderColor: colors.deepMaroon },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextSelected: { color: colors.warmIvory, fontWeight: '800' },
  primaryButton: {
    backgroundColor: colors.deepMaroon, borderRadius: borderRadius.sm,
    padding: spacing.md, alignItems: 'center',
  },
  primaryText: { ...typography.bodySmall, color: colors.warmIvory, fontWeight: '700' },
  cancelButton: {
    backgroundColor: colors.softCream, borderRadius: borderRadius.sm,
    padding: spacing.md, alignItems: 'center', marginLeft: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  cancelText: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '600' },
  card: {
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.sm,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800', flex: 1, marginRight: spacing.sm },
  priorityBadge: { ...typography.caption, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  unread: { borderColor: colors.saffron, borderWidth: 1.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron, marginTop: 3 },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: {
    backgroundColor: colors.saffron, borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  publishButton: { backgroundColor: colors.statusSafe },
  actionText: { ...typography.caption, color: '#FFFFFF', fontWeight: '700' },
  listLoader: { marginVertical: spacing.md },
  loadMoreButton: {
    backgroundColor: colors.softCream, borderRadius: borderRadius.sm,
    padding: spacing.sm, alignItems: 'center', marginTop: spacing.xs,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  loadMoreText: { ...typography.caption, color: colors.deepMaroon, fontWeight: '700' },
  empty: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md },
  error: { ...typography.bodySmall, color: colors.statusEmergency, marginBottom: spacing.md },
});
