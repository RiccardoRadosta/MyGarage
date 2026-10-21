import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Home, CarFront, Wrench, Wallet, User } from 'lucide-react-native';
import { useApp } from '../store/AppContext';
import { getAppColors } from '../theme/theme';
import { useThemePreference } from '../theme/ThemeContext';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { GarageScreen } from '../screens/garage/GarageScreen';
import { CostsScreen } from '../screens/costs/CostsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ProfileEditScreen } from '../screens/profile/ProfileEditScreen';
import { VehicleDetailScreen } from '../screens/vehicle/VehicleDetailScreen';
import { VehicleFormScreen } from '../screens/vehicle/VehicleFormScreen';
import { MaintenanceFormScreen } from '../screens/maintenance/MaintenanceFormScreen';
import { MaintenanceDetailScreen } from '../screens/maintenance/MaintenanceDetailScreen';
import { MaintenanceHistoryScreen } from '../screens/maintenance/MaintenanceHistoryScreen';
import { MaintenanceActivityScreen } from '../screens/maintenance/MaintenanceActivityScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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

  if (isInitializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <RootStack.Screen name="Welcome" component={WelcomeScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
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
