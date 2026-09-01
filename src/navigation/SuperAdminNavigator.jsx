import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SuperAdminDashboardScreen } from '../features/superAdmin/screens/SuperAdminDashboardScreen';

const Stack = createNativeStackNavigator();

export const SuperAdminNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="SuperAdminDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="SuperAdminDashboard"
        component={SuperAdminDashboardScreen}
      />
    </Stack.Navigator>
  );
};
