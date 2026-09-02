import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../features/auth/hooks/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { SevakNavigator } from './SevakNavigator';
import { ProfileSetupScreen } from '../features/auth/screens/ProfileSetupScreen';
import { SevakPendingApprovalScreen } from '../features/sevak/screens/SevakPendingApprovalScreen';
import { AdminNavigator } from './AdminNavigator';
import { SuperAdminNavigator } from './SuperAdminNavigator';
import { ROLES } from '../core/constants/roles';

export const AppNavigator = () => {
  const { isAuthenticated, role, status, profile } = useAuthStore();

  const userStatus = status || profile?.status || 'PENDING';

  // Check if profile information (Name, Phone, Area, City) has been captured
  const isProfileComplete = Boolean(
    profile?.full_name &&
      profile.full_name.trim().length > 0 &&
      profile?.phone &&
      profile.phone.trim().length > 0 &&
      profile?.area &&
      profile.area.trim().length > 0
  );

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
        // Step 1: If profile is not complete, show Profile Setup form first
        if (!isProfileComplete) {
          return <ProfileSetupScreen />;
        }

        // Step 2: Once details are saved to Supabase, show Restricted Pending Screen
        if (userStatus === 'PENDING') {
          return <SevakPendingApprovalScreen />;
        }

        // Step 3: Once approved by Admin, unlock full 5-tab Sevak app
        return <SevakNavigator />;
    }
  };

  return <NavigationContainer>{renderRoleNavigator()}</NavigationContainer>;
};
