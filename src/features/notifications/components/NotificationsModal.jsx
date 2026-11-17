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
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
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
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Container: 100% Solid Opaque Background */}
        <View style={[styles.container, shadows.prominent]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bellIconBox}>
                <AlertsBellIcon size={20} color={colors.saffron} />
              </View>
              <View>
                <Text style={styles.title}>Safety Notifications</Text>
                <Text style={styles.subtitle}>
                  {unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'All alerts up to date'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
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
              <ActivityIndicator color={colors.deepMaroon} size="large" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <CheckCircleIcon size={44} color={colors.statusSafe} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySub}>
                You are all caught up! Safety alerts, emergency dispatches and Vihar updates will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#FFFFFF', // 100% solid, fully opaque background
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    borderTopWidth: 2,
    borderTopColor: colors.gold,
    elevation: 24, // Android modal elevation to prevent underlying screen bleeding
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.warmIvory,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bellIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  title: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 22,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  actionRow: {
    backgroundColor: colors.softCream,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    alignItems: 'flex-end',
  },
  markAllBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  markAllText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.saffronDark,
  },
  loadingBox: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyBox: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  listContent: {
    backgroundColor: '#FFFFFF', // Solid opaque list background
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  notificationCard: {
    backgroundColor: colors.warmIvory, // Solid ivory card background
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  unreadCard: {
    backgroundColor: '#FFF8E7', // Soft warm saffron tone for unread card
    borderColor: colors.saffron,
    borderLeftWidth: 4,
    borderLeftColor: colors.saffron,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconBox: {
    marginRight: spacing.xs + 4,
  },
  titleCol: {
    flex: 1,
  },
  notifTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  notifTime: {
    ...typography.caption,
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
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: 2,
  },
});
