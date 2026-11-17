import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { UserIcon } from '../../../shared/components/CustomSvgIcons';

const statusColor = {
  ACTIVE: colors.statusSafe,
  PENDING: colors.saffron,
  DISABLED: colors.statusEmergency,
  REJECTED: colors.textSecondary,
};

export const SuperAdminUserCard = ({ user, onPress, translate }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => onPress(user)}>
    <View style={styles.avatar}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
      ) : (
        <UserIcon size={24} color={colors.deepMaroon} />
      )}
    </View>
    <View style={styles.info}>
      <Text style={styles.name} numberOfLines={1}>{user.full_name || translate('super_admin.users.unnamed')}</Text>
      <Text style={styles.contact} numberOfLines={1}>{user.phone || user.email || '—'}</Text>
      {user.email && user.phone ? <Text style={styles.contact} numberOfLines={1}>{user.email}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={styles.role}>{user.role || 'Unassigned'}</Text>
        <Text style={[styles.status, { color: statusColor[user.status] || colors.textSecondary }]}>{user.status || 'UNKNOWN'}</Text>
      </View>
      <Text style={styles.area} numberOfLines={1}>{[user.city, user.area].filter(Boolean).join(' · ') || '—'}</Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.softCream, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 48, height: 48 },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.body, color: colors.deepMaroon, fontWeight: '700' },
  contact: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  role: { ...typography.caption, color: colors.saffronDark, fontWeight: '700' },
  status: { ...typography.caption, fontWeight: '800', marginLeft: spacing.sm },
  area: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  chevron: { color: colors.saffron, fontSize: 24, marginLeft: spacing.sm },
});
