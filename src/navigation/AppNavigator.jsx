import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../features/auth/hooks/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { SevakNavigator } from './SevakNavigator';
import { AdminNavigator } from './AdminNavigator';
import { SuperAdminNavigator } from './SuperAdminNavigator';
import { ROLES } from '../core/constants/roles';

export const AppNavigator = () => {
  const { isAuthenticated, role } = useAuthStore();

  const renderRoleNavigator = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }

    switch (role) {
      case ROLES.SUPER_ADMIN:
        return <SuperAdminNavigator />;
      case ROLES.ADMIN:
        return <AdminNavigator />;
      case ROLES.SEVAK:
      default:
        return <SevakNavigator />;
    }
  };

  return <NavigationContainer>{renderRoleNavigator()}</NavigationContainer>;
};
