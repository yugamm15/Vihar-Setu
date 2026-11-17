import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';

export const SUPER_ADMIN_USER_TABS = [
  { key: 'ALL', labelKey: 'super_admin.users.tabs.all' },
  { key: 'SEVAK', labelKey: 'super_admin.users.tabs.sevaks' },
  { key: 'ADMIN', labelKey: 'super_admin.users.tabs.administrators' },
  { key: 'SUPER_ADMIN', labelKey: 'super_admin.users.tabs.super_administrators' },
];

export const SuperAdminUserTabs = ({ activeTab, onChange, translate }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
    {SUPER_ADMIN_USER_TABS.map((tab) => (
      <TouchableOpacity key={tab.key} onPress={() => onChange(tab.key)} style={[styles.tab, activeTab === tab.key && styles.activeTab]}>
        <Text style={[styles.label, activeTab === tab.key && styles.activeLabel]}>{translate(tab.labelKey)}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.softCream, marginRight: spacing.sm },
  activeTab: { backgroundColor: colors.deepMaroon },
  label: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  activeLabel: { color: colors.warmIvory, fontWeight: '800' },
});

