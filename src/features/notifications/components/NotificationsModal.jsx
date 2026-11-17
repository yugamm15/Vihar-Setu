import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import {
  AlertsBellIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ShieldIcon,
  ClockIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useNotificationStore } from '../hooks/useNotificationStore';
import { useAuthStore } from '../../auth/hooks/useAuthStore';

export const NotificationsModal = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { notifications, unreadCount, isLoading, markRead, markAllRead } =
    useNotificationStore();

  const renderIconForType = (type) => {
    switch (type) {
      case 'EMERGENCY':
      case 'POLICE_CALL':
        return <AlertTriangleIcon size={18} color={colors.statusEmergency} />;
      case 'DEVIATION':
        return <AlertTriangleIcon size={18} color={colors.statusWarning} />;
      case 'HOLD':
        return <ClockIcon size={18} color={colors.gold} />;
      case 'BATTERY':
        return <ShieldIcon size={18} color={colors.statusWarning} />;
      default:
        return <AlertsBellIcon size={18} color={colors.deepMaroon} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bellIconBox}>
                <AlertsBellIcon size={20} color={colors.gold} />
              </View>
              <View>
                <Text style={styles.title}>Safety Notifications</Text>
                <Text style={styles.subtitle}>
                  {unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'All alerts up to date'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Row */}
          {unreadCount > 0 ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => user?.id && markAllRead(user.id)}
                style={styles.markAllBtn}
              >
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Notifications List */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.deepMaroon} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <CheckCircleIcon size={34} color={colors.statusSafe} />
              </View>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySub}>
                You are all caught up! Safety alerts and Vihar updates will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.notificationCard,
                    !item.is_read && styles.unreadCard,
                  ]}
                  onPress={() => !item.is_read && markRead(item.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                      {renderIconForType(item.type)}
                    </View>
                    <View style={styles.titleCol}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      <Text style={styles.notifTime}>
                        {new Date(item.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {!item.is_read ? <View style={styles.unreadDot} /> : null}
                  </View>

                  <Text style={styles.notifBody}>{item.body}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 17, 18, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    maxHeight: '85%',
    minHeight: 320,
    borderTopWidth: 1.5,
    borderTopColor: colors.gold,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bellIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: {
    fontSize: 16,
    fontFamily: typography.semiBold,
    color: colors.deepMaroon,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  actionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    alignItems: 'flex-end',
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: colors.saffronDark,
  },
  loadingBox: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    minHeight: 220,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.statusSafeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: typography.semiBold,
    color: colors.deepMaroon,
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  list: {
    flex: 1,
  },
  notificationCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  unreadCard: {
    borderColor: colors.gold,
    backgroundColor: colors.softCream,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconBox: {
    marginRight: spacing.xs + 2,
  },
  titleCol: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  notifTime: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.saffron,
  },
  notifBody: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.textPrimary,
    lineHeight: 17,
  },
});
