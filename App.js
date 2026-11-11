// App.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import HomeScreen from './src/screens/HomeScreen';
import EventosScreen from './src/screens/EventosScreen';
import FavoritosScreen from './src/screens/FavoritosScreen';
import DetalhesScreen from './src/screens/DetalhesScreen';

import { useThemeColors } from './src/utils/ThemeContext';
import './src/locales/i18n';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const defaultScreenOptions = {
  headerShown: false,
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="Detalhes" component={DetalhesScreen} />
    </Stack.Navigator>
  );
}

function EventosStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="EventosList" component={EventosScreen} />
      <Stack.Screen name="Detalhes" component={DetalhesScreen} />
    </Stack.Navigator>
  );
}

function FavoritosStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="FavoritosList" component={FavoritosScreen} />
      <Stack.Screen name="Detalhes" component={DetalhesScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { ready } = useTranslation();
  const { isDark } = useThemeColors();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [ready]);

  if (!ready || showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/splash.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => {
            let iconName;
            if (route.name === 'HomeTab') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'EventosTab') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'FavoritosTab') {
              iconName = focused ? 'heart' : 'heart-outline';
            }
            return (
              <View
                style={[
                  styles.iconContainer,
                  focused && styles.iconContainerFocused,
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={21}
                  color={focused ? '#FFFFFF' : '#888888'}
                />
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
        <Tab.Screen name="HomeTab" component={HomeStack} />
        <Tab.Screen name="EventosTab" component={EventosStack} />
        <Tab.Screen name="FavoritosTab" component={FavoritosStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#EAF8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    width: '88%',
    marginHorizontal: '6%',
    height: 66,
    borderRadius: 33,
    backgroundColor: '#161616',
    borderTopWidth: 0,
    paddingHorizontal: 6,
    paddingTop: 0,
    paddingBottom: 0,
    elevation: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.40,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 7,
    },
  },
  tabBarItem: {
    flex: 1,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    margin: 0,
  },
  tabBarIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
    padding: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerFocused: {
    backgroundColor: '#2B2B2B',
  },
});