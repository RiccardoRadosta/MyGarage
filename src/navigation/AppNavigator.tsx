import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createNavigationContainerRef,
  DefaultTheme,
  LinkingOptions,
  NavigationContainer,
} from '@react-navigation/native';
import { Home, CarFront, Wrench, Wallet, User } from 'lucide-react-native';
import { useApp } from '../store/AppContext';
import { getAppColors } from '../theme/theme';
import { useThemePreference } from '../theme/ThemeContext';
import { extractResetTokenFromUrl } from '../utils/linkingUtils';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { GarageScreen } from '../screens/garage/GarageScreen';
import { CostsScreen } from '../screens/costs/CostsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ProfileEditScreen } from '../screens/profile/ProfileEditScreen';
import { VehicleDetailScreen } from '../screens/vehicle/VehicleDetailScreen';
import { VehicleFormScreen } from '../screens/vehicle/VehicleFormScreen';
import { PrimaryVehicleSelectionScreen } from '../screens/vehicle/PrimaryVehicleSelectionScreen';
import { MaintenanceFormScreen } from '../screens/maintenance/MaintenanceFormScreen';
import { MaintenanceDetailScreen } from '../screens/maintenance/MaintenanceDetailScreen';
import { MaintenanceHistoryScreen } from '../screens/maintenance/MaintenanceHistoryScreen';
import { MaintenanceActivityScreen } from '../screens/maintenance/MaintenanceActivityScreen';

export const navigationRef = createNavigationContainerRef<any>();

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking: LinkingOptions<any> = {
  prefixes: [
    'mygarage://',
    'exp://',
  ],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      ForgotPassword: 'forgot-password',
      Login: 'login',
      Register: 'register',
      Welcome: 'welcome',
    },
  },
};

const MainTabs = () => {
  const { isDarkMode } = useThemePreference();
  const colors = getAppColors(isDarkMode);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
          paddingTop: 8,
          height: 72,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: 'Manrope_600SemiBold',
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'HomeTab') return <Home size={size} color={color} />;
          if (route.name === 'GarageTab') return <CarFront size={size} color={color} />;
          if (route.name === 'ActivitiesTab') return <Wrench size={size} color={color} />;
          if (route.name === 'CostsTab') return <Wallet size={size} color={color} />;
          return <User size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="GarageTab" component={GarageScreen} options={{ title: 'Garage' }} />
      <Tab.Screen name="ActivitiesTab" component={MaintenanceActivityScreen} options={{ title: 'Attività' }} />
      <Tab.Screen name="CostsTab" component={CostsScreen} options={{ title: 'Costi' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profilo' }} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, isInitializing } = useApp();
  const { isDarkMode } = useThemePreference();
  const colors = getAppColors(isDarkMode);
  const initialUrlHandledRef = React.useRef(false);
  const navTheme = {
    ...(isDarkMode ? { ...DefaultTheme, dark: true } : DefaultTheme),
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
      border: colors.border,
      primary: colors.primary,
      text: colors.text,
      notification: colors.accent,
    },
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleIncomingUrl = (url: string | null | undefined) => {
      if (!url || isAuthenticated) return;
      const token = extractResetTokenFromUrl(url);
      if (url.includes('reset-password') || token) {
        if (navigationRef.isReady()) {
          navigationRef.navigate('ResetPassword', { token: token ?? '' });
        } else {
          timeoutId = setTimeout(() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('ResetPassword', { token: token ?? '' });
            }
          }, 350);
        }
      }
    };

    if (!initialUrlHandledRef.current) {
      initialUrlHandledRef.current = true;
      void Linking.getInitialURL().then(handleIncomingUrl);
    }

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.remove();
    };
  }, [isAuthenticated]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <RootStack.Screen name="Welcome" component={WelcomeScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={RegisterScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen name="PrimaryVehicleSelection" component={PrimaryVehicleSelectionScreen} />
            <RootStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <RootStack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
            <RootStack.Screen name="VehicleForm" component={VehicleFormScreen} />
            <RootStack.Screen name="MaintenanceForm" component={MaintenanceFormScreen} />
            <RootStack.Screen name="MaintenanceDetail" component={MaintenanceDetailScreen} />
            <RootStack.Screen name="MaintenanceHistory" component={MaintenanceHistoryScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
