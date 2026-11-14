import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SuperAdminDashboardScreen } from '../features/superAdmin/screens/SuperAdminDashboardScreen';
import { AdminLiveTrackingScreen } from '../features/admin/screens/AdminLiveTrackingScreen';
import { AdminAlertsScreen } from '../features/admin/screens/AdminAlertsScreen';
import { AdminRequestsScreen } from '../features/admin/screens/AdminRequestsScreen';
import { AdminMoreScreen } from '../features/admin/screens/AdminMoreScreen';
import {
  DashboardGridIcon,
  LiveRadarIcon,
  AlertsBellIcon,
  RequestsIcon,
  MenuIcon,
} from '../shared/components/CustomSvgIcons';
import { adminService } from '../features/admin/services/adminService';
import { colors } from '../core/theme/colors';
import { typography } from '../core/theme/typography';

const Tab = createBottomTabNavigator();

export const SuperAdminNavigator = () => {
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 0);

  const fetchBadge = async () => {
    try {
      const { pendingRequests } = await adminService.fetchDashboardMetrics();
      setPendingCount(pendingRequests || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchBadge();
    const unsubscribe = adminService.subscribeToRequests(() => {
      fetchBadge();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Tab.Navigator
      initialRouteName="SuperDashboardTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.saffron,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '700',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="SuperDashboardTab"
        component={SuperAdminDashboardScreen}
        options={{
          tabBarLabel: 'Super Admin',
          tabBarIcon: ({ color }) => (
            <DashboardGridIcon size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LiveTab"
        component={AdminLiveTrackingScreen}
        options={{
          tabBarLabel: 'Live Radar',
          tabBarIcon: ({ color }) => <LiveRadarIcon size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={AdminAlertsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => (
            <AlertsBellIcon size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RequestsTab"
        component={AdminRequestsScreen}
        options={{
          tabBarLabel: 'Approvals',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.saffron,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
          },
          tabBarIcon: ({ color }) => <RequestsIcon size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={AdminMoreScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <MenuIcon size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
