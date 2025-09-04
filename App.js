// App.js (mobile)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// 🔹 Importe o hook de tradução
import { useTranslation } from 'react-i18next';

// Telas
import HomeScreen from './src/screens/HomeScreen';
import RestaurantesScreen from './src/screens/RestaurantesScreen';
import AcomodacoesScreen from './src/screens/AcomodacoesScreen';
import DetalhesScreen from './src/screens/DetalhesScreen';

// Inicialize o i18n
import './src/locales/i18n';

// Criar os Navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack para Pontos Turísticos
function PontosStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTitleAlign: 'center',
        headerTintColor: '#000',
        headerStyle: {
          borderBottomWidth: 0, // ✅ Remove a borda inferior
          elevation: 0, // ✅ Remove sombra no Android
          shadowOpacity: 0, // ✅ Remove sombra no iOS
        },
        
      }}
    >
      <Stack.Screen 
        name="PontosList" // ✅ Nome único
        component={HomeScreen} 
        options={{ 
           headerTitleStyle: {
            fontSize: 24, // Set your desired font size here
            fontWeight: 'bold',
          },
          title: t('touristAttractions') }} // ✅ Chave correta          
          
        
      />
      <Stack.Screen
        name="Detalhes"
        component={DetalhesScreen}
        options={({ route }) => ({ 
           headerTitleStyle: {
            fontSize: 24, // Set your desired font size here
            fontWeight: 'bold',
          },        
          title: route.params.nome })}
      />
    </Stack.Navigator>
  );
}

// Stack para Restaurantes
function RestaurantesStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTitleAlign: 'center',
        headerTintColor: '#000',   
        headerStyle: {
          borderBottomWidth: 0, // ✅ Remove a borda inferior
          elevation: 0, // ✅ Remove sombra no Android
          shadowOpacity: 0, // ✅ Remove sombra no iOS
        },    
      }}
    >
      <Stack.Screen 
        name="RestaurantesList" // ✅ Nome único
        component={RestaurantesScreen} 
        options={{ 
           headerTitleStyle: {
            fontSize: 24, // Set your desired font size here
            fontWeight: 'bold',
          },        
          title: t('restaurantsTitle') }} // ✅ Chave correta
      />
      <Stack.Screen
        name="Detalhes"
        component={DetalhesScreen}
        options={({ route }) => ({ title: route.params.nome })}
      />
    </Stack.Navigator>
  );
}

// Stack para Acomodações
function AcomodacoesStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTitleAlign: 'center',
        headerTintColor: '#000',
        headerStyle: {
          borderBottomWidth: 0, // ✅ Remove a borda inferior
          elevation: 0, // ✅ Remove sombra no Android
          shadowOpacity: 0, // ✅ Remove sombra no iOS
        },
      }}
    >
      <Stack.Screen 
        name="AcomodacoesList" // ✅ Nome único
        component={AcomodacoesScreen} 
        options={{ 
           headerTitleStyle: {
            fontSize: 24, // Set your desired font size here
            fontWeight: 'bold',
          },
          title: t('accommodationsTitle') }} // ✅ Chave correta
      />
      <Stack.Screen
        name="Detalhes"
        component={DetalhesScreen}
        options={({ route }) => ({ title: route.params.nome })}
      />
    </Stack.Navigator>
  );
}

// App Principal
export default function App() {
  const { t, i18n, ready } = useTranslation();

  // ✅ Só renderiza o app quando estiver pronto
  if (!ready) {
    return null;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'PontosTab') { // ✅ Nome único
              iconName = focused ? 'map' : 'map-outline';
            } else if (route.name === 'RestaurantesTab') { // ✅ Nome único
              iconName = focused ? 'restaurant' : 'restaurant-outline';
            } else if (route.name === 'AcomodacoesTab') { // ✅ Nome único
              iconName = focused ? 'bed' : 'bed-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#000',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="PontosTab" // ✅ Nome único
          component={PontosStack} 
          options={{ title: t('touristAttractions') }} // ✅ Chave correta
        />
        <Tab.Screen 
          name="RestaurantesTab" // ✅ Nome único
          component={RestaurantesStack} 
          options={{ title: t('restaurantsTitle') }} // ✅ Chave correta
        />
        <Tab.Screen 
          name="AcomodacoesTab" // ✅ Nome único
          component={AcomodacoesStack} 
          options={{ title: t('accommodationsTitle') }} // ✅ Chave correta
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}