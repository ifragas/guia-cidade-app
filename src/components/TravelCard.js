// src/components/TravelCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageBackground } from 'expo-image';
import { calcularDistancia } from '../utils/LocationHelper';

export default function TravelCard({
  item,
  onPress,
  onToggleFavorito,
  isFavorito,
  userLocation,
  isDark,
  badgeType = 'Recanto',
  customBadgeColor,
  statusBadge = null, // Ex: { aberto: boolean } para restaurantes
}) {
  const distanciaKm = userLocation && item.latitude && item.longitude 
    ? calcularDistancia(userLocation.latitude, userLocation.longitude, parseFloat(item.latitude), parseFloat(item.longitude))
    : null;

  const imagemCap = item.imagem || item.imagens?.[0] || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb';

  return (
    <TouchableOpacity
      style={[styles.travelCard, { backgroundColor: isDark ? '#1e1e1e' : '#ffffff' }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.travelCardImageWrapper}>
        <ImageBackground
          source={{ uri: imagemCap }}
          style={styles.travelCardImage}
          imageStyle={{ borderRadius: 20 }}
          contentFit="cover"
          placeholder={require('../../assets/placeholder.jpg')}
          cachePolicy="memory-disk"
        >
          {/* BADGES SUPERIORES */}
          <View style={styles.badgeRowContainer}>
            <View style={[styles.travelTypeBadge, customBadgeColor && { backgroundColor: customBadgeColor }]}>
              <Text style={styles.travelTypeBadgeText}>{badgeType}</Text>
            </View>

            {statusBadge && (
              <View style={[
                styles.statusBadge, 
                { 
                  backgroundColor: statusBadge.aberto ? 'rgba(16, 185, 129, 0.9)' : 'rgba(225, 29, 72, 0.9)',
                  borderColor: statusBadge.aberto ? '#10b981' : '#e11d48'
                }
              ]}>
                <Text style={styles.statusText}>
                  {statusBadge.aberto ? '● Aberto' : '● Fechado'}
                </Text>
              </View>
            )}
          </View>

          {/* BOTÃO DE FAVORITO */}
          <TouchableOpacity
            style={styles.travelHeartButton}
            onPress={onToggleFavorito}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFavorito ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorito ? '#ff3b30' : '#333'}
            />
          </TouchableOpacity>
        </ImageBackground>
      </View>

      {/* CONTEÚDO INFERIOR DO CARD */}
      <View style={styles.travelCardContent}>
        <View style={styles.travelCardHeaderRow}>
          <Text style={[styles.travelCardTitle, { color: isDark ? '#ffffff' : '#111827' }]} numberOfLines={1}>
            {item.nome}
          </Text>
          {distanciaKm && (
            <View style={styles.travelDistanceRow}>
              <Ionicons name="location-outline" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.travelDistanceText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {distanciaKm} km
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.travelCardSub, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
          {item.endereco || 'Riozinho, RS'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  travelCard: {
    width: '100%',
    marginBottom: 18,
    borderRadius: 20,
  },
  travelCardImageWrapper: {
    width: '100%',
    height: 165,
    borderRadius: 20,
    overflow: 'hidden',
  },
  travelCardImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    flexDirection: 'row',
    padding: 12,
  },
  badgeRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  travelTypeBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  travelTypeBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  travelHeartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  travelCardContent: {
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  travelCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  travelCardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  travelDistanceRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  travelDistanceText: { fontSize: 12, marginLeft: 2 },
  travelCardSub: { fontSize: 13 },
});