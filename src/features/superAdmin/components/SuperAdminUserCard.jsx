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
  REJECTED: '#C62828',
};

export const SuperAdminUserCard = ({ user, onPress, translate }) => {
  const isDualRole = user.isDualRole || (user.roles && user.roles.includes('ADMIN') && user.roles.includes('SEVAK'));

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => onPress(user)}>
      <View style={styles.avatar}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
        ) : (
          <UserIcon size={24} color={colors.deepMaroon} />
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {user.full_name || translate('super_admin.users.unnamed')}
          </Text>
          {isDualRole && (
            <View style={styles.dualBadge}>
              <Text style={styles.dualBadgeText}>2 ROLES</Text>
            </View>
          )}
        </View>
        <Text style={styles.contact} numberOfLines={1}>
          {user.phone || user.email || '—'}
        </Text>
        {user.email && user.phone ? (
          <Text style={styles.contact} numberOfLines={1}>
            {user.email}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={isDualRole ? styles.rolePillDual : styles.rolePill}>
            <Text style={isDualRole ? styles.roleTextDual : styles.roleText}>
              {user.role || 'Unassigned'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: (statusColor[user.status] || colors.textSecondary) + '18' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: statusColor[user.status] || colors.textSecondary },
              ]}
            >
              {user.status || 'UNKNOWN'}
            </Text>
          </View>
        </View>
        {user.status === 'REJECTED' && user.rejection_reason ? (
          <Text style={styles.rejectionReason} numberOfLines={1}>
            Reason: {user.rejection_reason}
          </Text>
        ) : null}
        <Text style={styles.area} numberOfLines={1}>
          {[user.city, user.area].filter(Boolean).join(' · ') || '—'}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 48, height: 48 },
  info: { flex: 1, marginLeft: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { ...typography.body, color: colors.deepMaroon, fontWeight: '700', flexShrink: 1 },
  dualBadge: {
    backgroundColor: '#FFF0D4',
    borderColor: colors.saffronDark,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: spacing.xs,
  },
  dualBadgeText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  contact: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, flexWrap: 'wrap', gap: 6 },
  rolePill: {
    backgroundColor: colors.softCream,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  roleText: { ...typography.caption, color: colors.saffronDark, fontWeight: '700', fontSize: 11 },
  rolePillDual: {
    backgroundColor: '#FFF4E5',
    borderColor: colors.saffron,
    borderWidth: 1,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  roleTextDual: { ...typography.caption, color: colors.deepMaroon, fontWeight: '800', fontSize: 11 },
  statusBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  statusText: { ...typography.caption, fontWeight: '800', fontSize: 11 },
  rejectionReason: {
    ...typography.caption,
    color: '#C62828',
    fontStyle: 'italic',
    marginTop: 2,
    fontSize: 11,
  },
  area: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  chevron: { color: colors.saffron, fontSize: 24, marginLeft: spacing.sm },
});
