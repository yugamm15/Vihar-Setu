import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminConfigurationService } from '../services/SuperAdminConfigurationService';

export const SuperAdminConfigurationDetailsScreen = ({ route, navigation }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const settingId = route?.params?.settingId;
  const load = useCallback(async () => {
    setLoading(true);
    const response = await superAdminConfigurationService.getSettingDetails(settingId);
    setResult(response);
    if (response.data?.setting && !response.data.setting.redacted) setValue(String(response.data.setting.value));
    setLoading(false);
  }, [settingId]);
  useEffect(() => { load(); }, [load]);
  const setting = result?.data?.setting;
  const save = () => {
    Alert.alert(t('super_admin.management.confirm_title'), t('super_admin.management.saved'), [
      { text: t('super_admin.management.cancel'), style: 'cancel' },
      { text: t('super_admin.management.confirm'), onPress: async () => {
        setSaving(true);
        const response = await superAdminConfigurationService.updateSetting(settingId, value);
        setSaving(false);
        if (response.error) return Alert.alert(t('super_admin.management.error_title'), response.error.message);
        await load();
        Alert.alert(t('super_admin.management.success_title'), t('super_admin.management.saved'));
      } },
    ]);
  };
  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.configuration.details_title')} showBack onBack={() => navigation.goBack()} />
      {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : result?.error ? <Text style={styles.error}>{result.error.message}</Text> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.key}>{setting.key}</Text>
            <Text style={styles.label}>{t('super_admin.configuration.description')}</Text><Text style={styles.text}>{setting.description || t('super_admin.configuration.no_description')}</Text>
            <Text style={styles.label}>{t('super_admin.configuration.value')}</Text><Text style={styles.text}>{setting.value}</Text>
            {!setting.redacted ? <><TextInput value={value} onChangeText={setValue} keyboardType="numeric" style={styles.input} /><TouchableOpacity disabled={saving} style={styles.save} onPress={save}><Text style={styles.saveText}>{t('super_admin.management.confirm')}</Text></TouchableOpacity></> : null}
            {setting.redacted ? <Text style={styles.notice}>{t('super_admin.configuration.redacted')}</Text> : null}
            <Text style={styles.label}>{t('super_admin.configuration.data_type')}</Text><Text style={styles.text}>{setting.dataType}</Text>
            <Text style={styles.label}>{t('super_admin.configuration.updated')}</Text><Text style={styles.text}>{setting.updated_at ? new Date(setting.updated_at).toLocaleString('en-IN') : '—'}</Text>
          </View>
          <Text style={styles.sectionTitle}>{t('super_admin.configuration.audit_title')}</Text>
          {result.data.audit.length ? result.data.audit.map((record) => <View style={styles.audit} key={record.id}><Text style={styles.text}>{record.action}</Text><Text style={styles.muted}>{record.created_at ? new Date(record.created_at).toLocaleString('en-IN') : '—'}</Text></View>) : <Text style={styles.muted}>{t('super_admin.configuration.no_audit')}</Text>}
          {result.errors?.length ? <Text style={styles.notice}>{t('super_admin.configuration.audit_unavailable')}</Text> : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center' }, error: { ...typography.body, color: colors.statusEmergency, padding: spacing.lg },
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg }, key: { ...typography.h3, color: colors.deepMaroon, marginBottom: spacing.md }, label: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', marginTop: spacing.sm }, text: { ...typography.bodySmall, color: colors.textPrimary, marginTop: 2 }, input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.sm, padding: spacing.sm, marginTop: spacing.sm, color: colors.textPrimary }, save: { backgroundColor: colors.deepMaroon, borderRadius: borderRadius.sm, padding: spacing.sm, marginTop: spacing.sm }, saveText: { ...typography.caption, color: colors.warmIvory, textAlign: 'center', fontWeight: '800' }, muted: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs }, notice: { ...typography.caption, color: colors.saffronDark, backgroundColor: colors.statusWarningBg, padding: spacing.md, borderRadius: borderRadius.sm, marginTop: spacing.sm }, sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginTop: spacing.lg, marginBottom: spacing.sm }, audit: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.xs },
});
