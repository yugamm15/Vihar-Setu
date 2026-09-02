import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SevakHomeScreen } from '../features/sevak/screens/SevakHomeScreen';
import { SevakViharScreen } from '../features/sevak/screens/SevakViharScreen';
import { SevakHistoryScreen } from '../features/sevak/screens/SevakHistoryScreen';
import { SevakProfileScreen } from '../features/sevak/screens/SevakProfileScreen';
import { SevakMoreScreen } from '../features/sevak/screens/SevakMoreScreen';
import {
  HomeIcon,
  NavigationIcon,
  HistoryIcon,
  UserIcon,
  MenuIcon,
} from '../shared/components/CustomSvgIcons';
import { colors } from '../core/theme/colors';
import { typography } from '../core/theme/typography';

const Tab = createBottomTabNavigator();

export const SevakNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 0);

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
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
        name="HomeTab"
        component={SevakHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="ViharTab"
        component={SevakViharScreen}
        options={{
          tabBarLabel: 'Vihar',
          tabBarIcon: ({ color }) => (
            <NavigationIcon size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={SevakHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => <HistoryIcon size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={SevakProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <UserIcon size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={SevakMoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color }) => <MenuIcon size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
