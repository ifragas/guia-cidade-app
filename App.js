
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import RestaurantesScreen from './src/screens/RestaurantesScreen';
import AcomodacoesScreen from './src/screens/AcomodacoesScreen';
import FavoritosScreen from './src/screens/FavoritosScreen';
import DetalhesScreen from './src/screens/DetalhesScreen';

import { useThemeColors } from './src/utils/ThemeContext';
import './src/locales/i18n';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const defaultScreenOptions = {
  headerShown: false,
};

function PontosStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="PontosList" component={HomeScreen} />
      <Stack.Screen name="Detalhes" component={DetalhesScreen} />
    </Stack.Navigator>
  );
}

function RestaurantesStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="RestaurantesList" component={RestaurantesScreen} />
      <Stack.Screen name="Detalhes" component={DetalhesScreen} />
    </Stack.Navigator>
  );
}

function AcomodacoesStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="AcomodacoesList" component={AcomodacoesScreen} />
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

  if (!ready) return null;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => {
            let iconName;

            if (route.name === 'PontosTab') {
              iconName = focused ? 'compass' : 'compass-outline';
            } else if (route.name === 'RestaurantesTab') {
              iconName = focused ? 'restaurant' : 'restaurant-outline';
            } else if (route.name === 'AcomodacoesTab') {
              iconName = focused ? 'bed' : 'bed-outline';
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
        <Tab.Screen name="PontosTab" component={PontosStack} />
        <Tab.Screen name="RestaurantesTab" component={RestaurantesStack} />
        <Tab.Screen name="AcomodacoesTab" component={AcomodacoesStack} />
        <Tab.Screen name="FavoritosTab" component={FavoritosStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  
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
