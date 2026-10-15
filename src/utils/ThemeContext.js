// src/utils/ThemeContext.js
import { useColorScheme } from 'react-native';

export function useThemeColors() {
  const colorScheme = useColorScheme(); // 'dark' ou 'light'
  const isDark = colorScheme === 'dark'; // ✅ Volta ao comportamento dinâmico automático!

  return {
    isDark,
    colors: {
      background: isDark ? '#121212' : '#ffffff',
      cardBackground: isDark ? '#1e1e1e' : '#f0f8ff',
      textPrimary: isDark ? '#ffffff' : '#333333',
      textSecondary: isDark ? '#b0b0b0' : '#555555',
      border: isDark ? '#2c2c2c' : '#ddd',
      cardBorder: isDark ? '#333333' : '#b0e0e6',
      chipBackground: isDark ? '#1e1e1e' : '#f0f2f5',
      chipBorder: isDark ? '#333' : '#e1e4e8',
      chipText: isDark ? '#ccc' : '#555',
      skeleton: isDark ? '#2c2c2c' : '#e1e4e8',
      tint: '#0066cc',
    },
  };
}