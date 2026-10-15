// App.js (mobile)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Telas
import HomeScreen from './src/screens/HomeScreen';
import RestaurantesScreen from './src/screens/RestaurantesScreen';
import AcomodacoesScreen from './src/screens/AcomodacoesScreen';
import FavoritosScreen from './src/screens/FavoritosScreen';
import DetalhesScreen from './src/screens/DetalhesScreen';

// Helper do Tema
import { useThemeColors } from './src/utils/ThemeContext';

// Inicialize o i18n
import './src/locales/i18n';

// Criar os Navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack para Pontos Turísticos
function PontosStack() {
  const { t } = useTranslation();
  const { colors } = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTitleAlign: 'center',
        headerTintColor: colors.textPrimary,
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Stack.Screen 
        name="PontosList"
        component={HomeScreen} 
        options={{ 
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.textPrimary,
          },
          title: t('touristAttractions') 
        }} 
      />
      <Stack.Screen
        name="Detalhes"
        component={DetalhesScreen}
        options={({ route }) => ({ 
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.textPrimary,
          },        
          title: route.params.nome 
        })}
      />
    </Stack.Navigator>
  );
}

// Stack para Restaurantes
function RestaurantesStack() {
  const { t } = useTranslation();
  const { colors } = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTitleAlign: 'center',
        headerTintColor: colors.textPrimary,   
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },    
      }}
    >
      <Stack.Screen 
        name="RestaurantesList"
        component={RestaurantesScreen} 
        options={{ 
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.textPrimary,
          },        
          title: t('restaurantsTitle') 
        }}
      />
      <Stack.Screen
        name="Detalhes"
        component={DetalhesScreen}
        options={({ route }) => ({ 
          headerTitleStyle: {
            color: colors.textPrimary,
          },
          title: route.params.nome 
        })}
      />
    </Stack.Navigator>
  );
}

// Stack para Acomodações
function AcomodacoesStack() {
  const { t } = useTranslation();
  const { colors } = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTitleAlign: 'center',
        headerTintColor: colors.textPrimary,
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Stack.Screen 
        name="AcomodacoesList"
        component={AcomodacoesScreen} 
        options={{ 
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.textPrimary,
          },
          title: t('accommodationsTitle') 
        }}
      />
      <Stack.Screen
        name="Detalhes"
        component={DetalhesScreen}
        options={({ route }) => ({ 
          headerTitleStyle: {
            color: colors.textPrimary,
          },
          title: route.params.nome 
        })}
      />
    </Stack.Navigator>
  );
}

// Stack para Favoritos
function FavoritosStack() {
  const { t } = useTranslation();
  const { colors } = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTitleAlign: 'center',
        headerTintColor: colors.textPrimary,
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Stack.Screen 
        name="FavoritosList"
        component={FavoritosScreen} 
        options={{ 
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.textPrimary,
          },
          title: 'Favoritos' 
        }}
      />
      <Stack.Screen
        name="Detalhes"
        component={DetalhesScreen}
        options={({ route }) => ({ 
          headerTitleStyle: {
            color: colors.textPrimary,
          },
          title: route.params.nome 
        })}
      />
    </Stack.Navigator>
  );
}

// App Principal
export default function App() {
  const { ready } = useTranslation();
  const { colors, isDark } = useThemeColors();

  if (!ready) {
    return null;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'PontosTab') {
              iconName = focused ? 'map' : 'map-outline';
            } else if (route.name === 'RestaurantesTab') {
              iconName = focused ? 'restaurant' : 'restaurant-outline';
            } else if (route.name === 'AcomodacoesTab') {
              iconName = focused ? 'bed' : 'bed-outline';
            } else if (route.name === 'FavoritosTab') {
              iconName = focused ? 'heart' : 'heart-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
          tabBarActiveTintColor: isDark ? '#ffffff' : '#000000',
          tabBarInactiveTintColor: isDark ? '#777777' : 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="PontosTab"
          component={PontosStack} 
          options={{ title: 'Turismo' }}
        />
        <Tab.Screen 
          name="RestaurantesTab"
          component={RestaurantesStack} 
          options={{ title: 'Restaurantes' }}
        />
        <Tab.Screen 
          name="AcomodacoesTab"
          component={AcomodacoesStack} 
          options={{ title: 'Acomodações' }}
        />
        <Tab.Screen 
          name="FavoritosTab"
          component={FavoritosStack} 
          options={{ title: 'Favoritos' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}