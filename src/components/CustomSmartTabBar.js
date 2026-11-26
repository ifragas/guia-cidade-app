import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomSmartTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  // 🚨 As chaves aqui DEVEM ser idênticas aos 'name' dos Tab.Screen no App.js
  const tabConfig = {
    SmartHome: { label: 'Início', iconActive: 'map', iconInactive: 'map-outline' },
    SmartList: { label: 'Explorar', iconActive: 'list', iconInactive: 'list-outline' },
    AI: { label: 'Guia IA', iconActive: 'sparkles', iconInactive: 'sparkles-outline' },
  };

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom + 8 }]}>
      {state.routes.map((route, index) => {
        const config = tabConfig[route.name] || { label: route.name, iconActive: 'ellipse', iconInactive: 'ellipse-outline' };
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isFocused ? config.iconActive : config.iconInactive} 
              size={24} 
              color={isFocused ? '#F59E0B' : 'rgba(255,255,255,0.85)'} 
              style={styles.icon} 
            />
            <Text style={[styles.label, { color: isFocused ? '#F59E0B' : 'rgba(255,255,255,0.85)', fontWeight: isFocused ? '800' : '600' }]}>
              {config.label}
            </Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B2D6B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  icon: { marginBottom: 4 },
  label: { fontSize: 11, letterSpacing: 0.2 },
  activeIndicator: { position: 'absolute', bottom: -2, width: 5, height: 5, borderRadius: 3, backgroundColor: '#F59E0B' },
});