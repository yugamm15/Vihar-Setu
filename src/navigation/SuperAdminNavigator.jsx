import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SuperAdminDashboardScreen } from '../features/superAdmin/screens/SuperAdminDashboardScreen';
import { SuperAdminAreaManagementScreen } from '../features/superAdmin/screens/SuperAdminAreaManagementScreen';
import { SuperAdminUsersScreen } from '../features/superAdmin/screens/SuperAdminUsersScreen';
import { SuperAdminUserDetailsScreen } from '../features/superAdmin/screens/SuperAdminUserDetailsScreen';
import { SuperAdminAdministratorsScreen } from '../features/superAdmin/screens/SuperAdminAdministratorsScreen';
import { SuperAdminAdministratorDetailsScreen } from '../features/superAdmin/screens/SuperAdminAdministratorDetailsScreen';
import { SuperAdminMonitoringScreen } from '../features/superAdmin/screens/SuperAdminMonitoringScreen';
import { SuperAdminSystemHealthScreen } from '../features/superAdmin/screens/SuperAdminSystemHealthScreen';
import { SuperAdminEmergencyMonitoringScreen } from '../features/superAdmin/screens/SuperAdminEmergencyMonitoringScreen';
import { SuperAdminEmergencyDetailsScreen } from '../features/superAdmin/screens/SuperAdminEmergencyDetailsScreen';
import { SuperAdminDeviceMonitoringScreen } from '../features/superAdmin/screens/SuperAdminDeviceMonitoringScreen';
import { SuperAdminReportsScreen } from '../features/superAdmin/screens/SuperAdminReportsScreen';
import { SuperAdminUserReportsScreen } from '../features/superAdmin/screens/SuperAdminUserReportsScreen';
import { SuperAdminViharReportsScreen } from '../features/superAdmin/screens/SuperAdminViharReportsScreen';
import { SuperAdminEmergencyReportsScreen } from '../features/superAdmin/screens/SuperAdminEmergencyReportsScreen';
import { SuperAdminSafetyReportsScreen } from '../features/superAdmin/screens/SuperAdminSafetyReportsScreen';
import { SuperAdminAdministratorReportsScreen } from '../features/superAdmin/screens/SuperAdminAdministratorReportsScreen';
import { SuperAdminAuditReportsScreen } from '../features/superAdmin/screens/SuperAdminAuditReportsScreen';
import { SuperAdminUserAnalyticsScreen } from '../features/superAdmin/screens/SuperAdminUserAnalyticsScreen';
import { SuperAdminViharAnalyticsScreen } from '../features/superAdmin/screens/SuperAdminViharAnalyticsScreen';
import { SuperAdminSafetyAnalyticsScreen } from '../features/superAdmin/screens/SuperAdminSafetyAnalyticsScreen';
import { SuperAdminDeviceAnalyticsScreen } from '../features/superAdmin/screens/SuperAdminDeviceAnalyticsScreen';
import { SuperAdminConfigurationScreen } from '../features/superAdmin/screens/SuperAdminConfigurationScreen';
import { SuperAdminConfigurationDetailsScreen } from '../features/superAdmin/screens/SuperAdminConfigurationDetailsScreen';
import { SuperAdminAuditLogsScreen } from '../features/superAdmin/screens/SuperAdminAuditLogsScreen';
import { SuperAdminAuditLogDetailsScreen } from '../features/superAdmin/screens/SuperAdminAuditLogDetailsScreen';
import { SuperAdminSecurityOverviewScreen } from '../features/superAdmin/screens/SuperAdminSecurityOverviewScreen';
import { SuperAdminViharManagementScreen } from '../features/superAdmin/screens/SuperAdminViharManagementScreen';
import { SuperAdminViharDetailsScreen } from '../features/superAdmin/screens/SuperAdminViharDetailsScreen';
import { SuperAdminCommunicationScreen } from '../features/superAdmin/screens/SuperAdminCommunicationScreen';
import { SuperAdminNotificationDetailsScreen } from '../features/superAdmin/screens/SuperAdminNotificationDetailsScreen';
import { SuperAdminGovernanceScreen } from '../features/superAdmin/screens/SuperAdminGovernanceScreen';
import { SuperAdminPlatformHealthScreen } from '../features/superAdmin/screens/SuperAdminPlatformHealthScreen';
import { SuperAdminPolicyManagementScreen } from '../features/superAdmin/screens/SuperAdminPolicyManagementScreen';
import { SuperAdminFeatureManagementScreen } from '../features/superAdmin/screens/SuperAdminFeatureManagementScreen';
import { SuperAdminGovernanceActivityScreen } from '../features/superAdmin/screens/SuperAdminGovernanceActivityScreen';
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
  MapPinIcon,
} from '../shared/components/CustomSvgIcons';
import { adminService } from '../features/admin/services/adminService';
import { superAdminUserService } from '../features/superAdmin/services/superAdminUserService';
import { colors } from '../core/theme/colors';
import { typography } from '../core/theme/typography';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from '../core/localization/i18n';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const SuperAdminTabs = () => {
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 0);

  const fetchBadge = async () => {
    try {
      const { count } = await superAdminUserService.listUsers({ role: 'SEVAK', status: 'PENDING' });
      setPendingCount(count || 0);
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
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="AreaTab"
        component={SuperAdminAreaManagementScreen}
        options={{
          tabBarLabel: 'Areas',
          tabBarIcon: ({ color }) => <MapPinIcon size={22} color={color} />,
        }}
      />
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
        name="UsersTab"
        component={SuperAdminUsersScreen}
        options={{
          tabBarLabel: t('super_admin.users.title'),
          tabBarIcon: ({ color }) => <RequestsIcon size={22} color={color} />,
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
    </Tab.Navigator>
  );
};

export const SuperAdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SuperAdminTabs" component={SuperAdminTabs} />
    <Stack.Screen name="SuperAdminSettings" component={AdminMoreScreen} />
    <Stack.Screen name="Settings" component={AdminMoreScreen} />
    <Stack.Screen name="MoreTab" component={AdminMoreScreen} />
    <Stack.Screen name="SuperAdminAreaManagement" component={SuperAdminAreaManagementScreen} />
    <Stack.Screen name="SuperAdminUserDetails" component={SuperAdminUserDetailsScreen} />
    <Stack.Screen name="SuperAdminAdministrators" component={SuperAdminAdministratorsScreen} />
    <Stack.Screen name="SuperAdminAdministratorDetails" component={SuperAdminAdministratorDetailsScreen} />
    <Stack.Screen name="SuperAdminMonitoring" component={SuperAdminMonitoringScreen} />
    <Stack.Screen name="SuperAdminSystemHealth" component={SuperAdminSystemHealthScreen} />
    <Stack.Screen name="SuperAdminEmergencyMonitoring" component={SuperAdminEmergencyMonitoringScreen} />
    <Stack.Screen name="SuperAdminEmergencyDetails" component={SuperAdminEmergencyDetailsScreen} />
    <Stack.Screen name="SuperAdminDeviceMonitoring" component={SuperAdminDeviceMonitoringScreen} />
    <Stack.Screen name="SuperAdminReports" component={SuperAdminReportsScreen} />
    <Stack.Screen name="SuperAdminUserReports" component={SuperAdminUserReportsScreen} />
    <Stack.Screen name="SuperAdminViharReports" component={SuperAdminViharReportsScreen} />
    <Stack.Screen name="SuperAdminEmergencyReports" component={SuperAdminEmergencyReportsScreen} />
    <Stack.Screen name="SuperAdminSafetyReports" component={SuperAdminSafetyReportsScreen} />
    <Stack.Screen name="SuperAdminAdministratorReports" component={SuperAdminAdministratorReportsScreen} />
    <Stack.Screen name="SuperAdminAuditReports" component={SuperAdminAuditReportsScreen} />
    <Stack.Screen name="SuperAdminUserAnalytics" component={SuperAdminUserAnalyticsScreen} />
    <Stack.Screen name="SuperAdminViharAnalytics" component={SuperAdminViharAnalyticsScreen} />
    <Stack.Screen name="SuperAdminSafetyAnalytics" component={SuperAdminSafetyAnalyticsScreen} />
    <Stack.Screen name="SuperAdminDeviceAnalytics" component={SuperAdminDeviceAnalyticsScreen} />
    <Stack.Screen name="SuperAdminConfiguration" component={SuperAdminConfigurationScreen} />
    <Stack.Screen name="SuperAdminConfigurationDetails" component={SuperAdminConfigurationDetailsScreen} />
    <Stack.Screen name="SuperAdminAuditLogs" component={SuperAdminAuditLogsScreen} />
    <Stack.Screen name="SuperAdminAuditLogDetails" component={SuperAdminAuditLogDetailsScreen} />
    <Stack.Screen name="SuperAdminSecurityOverview" component={SuperAdminSecurityOverviewScreen} />
    <Stack.Screen name="SuperAdminViharManagement" component={SuperAdminViharManagementScreen} />
    <Stack.Screen name="SuperAdminViharDetails" component={SuperAdminViharDetailsScreen} />
    <Stack.Screen name="SuperAdminCommunication" component={SuperAdminCommunicationScreen} />
    <Stack.Screen name="SuperAdminNotificationDetails" component={SuperAdminNotificationDetailsScreen} />
    <Stack.Screen name="SuperAdminGovernance" component={SuperAdminGovernanceScreen} />
    <Stack.Screen name="SuperAdminPlatformHealth" component={SuperAdminPlatformHealthScreen} />
    <Stack.Screen name="SuperAdminPolicyManagement" component={SuperAdminPolicyManagementScreen} />
    <Stack.Screen name="SuperAdminFeatureManagement" component={SuperAdminFeatureManagementScreen} />
    <Stack.Screen name="SuperAdminGovernanceActivity" component={SuperAdminGovernanceActivityScreen} />
  </Stack.Navigator>
);
