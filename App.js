import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import EventosScreen from './src/screens/EventosScreen';
import FavoritosScreen from './src/screens/FavoritosScreen';
import DetalhesScreen from './src/screens/DetalhesScreen';
import CitySelectionScreen from './src/screens/CitySelectionScreen';
import CitySplashScreen from './src/screens/CitySplashScreen';
import SmartHomeScreen from './src/screens/SmartHomeScreen';
import SmartListScreen from './src/screens/SmartListScreen';
import AIScreen from './src/screens/AIScreen';

// Components & Context
import CustomSmartTabBar from './src/components/CustomSmartTabBar';
import { CityProvider, useCity } from './src/context/CityContext';
import './src/locales/i18n';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const defaultScreenOptions = { headerShown: false };

// --- Navegação do App ROLANTE ---
function RolanteNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;
          if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'EventosTab') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'FavoritosTab') iconName = focused ? 'heart' : 'heart-outline';
          return (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Ionicons name={iconName} size={21} color={focused ? '#FFFFFF' : '#888888'} />
            </View>
          );
        },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="EventosTab" component={EventosScreen} />
      <Tab.Screen name="FavoritosTab" component={FavoritosScreen} />
    </Tab.Navigator>
  );
}

// --- Navegação do App SMART (Com Tab Bar Customizada) ---
function SmartNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomSmartTabBar {...props} />}
      screenOptions={{ ...defaultScreenOptions, lazy: false }}
    >
      <Tab.Screen name="SmartHome" component={SmartHomeScreen} options={{ title: 'Mapa' }} />
      <Tab.Screen name="SmartList" component={SmartListScreen} options={{ title: 'Explorar' }} />
      {/* 🚨 CORREÇÃO AQUI: Trocado de Favoritos para AI */}
      <Tab.Screen name="AI" component={AIScreen} options={{ title: 'Guia IA' }} />
    </Tab.Navigator>
  );
}

// --- Stack Principal ---
function MainStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="SmartTabs" component={SmartNavigator} />
      <Stack.Screen name="Detalhes" component={DetalhesScreen} />
    </Stack.Navigator>
  );
}

// --- Controlador Principal de Fluxo ---
function AppNavigator() {
  const { ready } = useTranslation();
  const { isMultiCityApp, cidadeAtual, loading } = useCity();
  const [showCitySplash, setShowCitySplash] = useState(true);

  useEffect(() => {
    if (cidadeAtual) {
      setShowCitySplash(true);
    }
  }, [cidadeAtual]);

  if (loading || !ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!isMultiCityApp) {
    return (
      <NavigationContainer>
        <RolanteNavigator />
      </NavigationContainer>
    );
  }

  if (!cidadeAtual) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={defaultScreenOptions}>
          <Stack.Screen name="CitySelection" component={CitySelectionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (showCitySplash) {
    return <CitySplashScreen onFinished={() => setShowCitySplash(false)} />;
  }

  return (
    <NavigationContainer>
      <MainStack />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <CityProvider>
      <AppNavigator />
    </CityProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  tabBar: {
    position: 'absolute', bottom: 24, left: 0, right: 0, width: '88%', marginHorizontal: '6%',
    height: 66, borderRadius: 33, backgroundColor: '#161616', borderTopWidth: 0,
    elevation: 18, shadowColor: '#000000', shadowOpacity: 0.40, shadowRadius: 14, shadowOffset: { width: 0, height: 7 },
  },
  tabBarItem: { flex: 1, height: 66, alignItems: 'center', justifyContent: 'center', padding: 0, margin: 0 },
  tabBarIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', margin: 0, padding: 0 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconContainerFocused: { backgroundColor: '#2B2B2B' },
});