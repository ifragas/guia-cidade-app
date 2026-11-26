// src/components/OfflineBanner.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner({ visible, message }) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={[styles.container, { top: insets.top + 8 }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{message || 'Você está offline. Alguns recursos estão limitados.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9534f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});