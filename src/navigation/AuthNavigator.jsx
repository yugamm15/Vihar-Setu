import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../features/auth/screens/SplashScreen';
import { OnboardingScreen } from '../features/auth/screens/OnboardingScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { OtpVerificationScreen } from '../features/auth/screens/OtpVerificationScreen';
import { ProfileSetupScreen } from '../features/auth/screens/ProfileSetupScreen';

const Stack = createNativeStackNavigator();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
};
