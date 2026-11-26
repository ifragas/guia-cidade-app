import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCity } from '../context/CityContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LocationCard({ item, onClose, onSeeDetails, isVisible }) {
  const { cidadeAtual } = useCity();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isVisible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start();
  }, [isVisible]);

  if (!item) return null;

  const imagem = item.imagem || item.imagens?.[0] || 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]} pointerEvents={isVisible ? 'auto' : 'none'}>
      <LinearGradient colors={['rgba(11, 45, 107, 0.97)', 'rgba(7, 27, 66, 0.99)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <View style={styles.handleBar} />

      <View style={styles.content}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imagem }} style={styles.image} contentFit="cover" />
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          {item.categoriaLabel && (
            <View style={[styles.categoryBadge, { backgroundColor: item.categoriaColor || '#10b981' }]}>
              <Text style={styles.categoryBadgeText}>{item.categoriaLabel}</Text>
            </View>
          )}
        </View>

        <Text numberOfLines={2} style={styles.title}>{item.nome || item.titulo || 'Sem nome'}</Text>

        {item.endereco && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text numberOfLines={1} style={styles.infoText}>{item.endereco}</Text>
          </View>
        )}

        {item.distancia && (
          <View style={styles.infoRow}>
            <Ionicons name="navigate-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.distanciaText}>{item.distancia}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.detailsButton} onPress={onSeeDetails} activeOpacity={0.85}>
          <Text style={styles.detailsButtonText}>Ver detalhes</Text>
          <Ionicons name="arrow-forward" size={16} color="#0f172a" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 20, maxHeight: SCREEN_HEIGHT * 0.55, overflow: 'hidden' },
  handleBar: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginTop: 10, marginBottom: 4, zIndex: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 28, zIndex: 2 },
  imageWrapper: { position: 'relative', marginBottom: 14 },
  image: { width: '100%', height: 150, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  closeButton: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  categoryBadge: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  categoryBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  title: { fontSize: 19, fontWeight: '800', color: '#fff', marginBottom: 8, lineHeight: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', flex: 1 },
  distanciaText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  detailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', paddingVertical: 15, borderRadius: 16, marginTop: 14, shadowColor: '#F59E0B', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  detailsButtonText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
});