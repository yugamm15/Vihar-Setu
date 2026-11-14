import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { AlertsBellIcon } from '../../../shared/components/CustomSvgIcons';
import { useNotificationStore } from '../hooks/useNotificationStore';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { NotificationsModal } from './NotificationsModal';

export const NotificationBellButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useAuthStore();
  const { unreadCount, loadNotifications } = useNotificationStore();

  useEffect(() => {
    if (user?.id) {
      loadNotifications(user.id);
    }
  }, [user?.id]);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
        style={styles.bellButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <AlertsBellIcon size={22} color={colors.warmIvory} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <NotificationsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    padding: 6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.saffron,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.deepMaroon,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
});

