// src/components/FeaturedEventsCarousel.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { calcularDistancia } from '../utils/LocationHelper';
import { useThemeColors } from '../utils/ThemeContext';
import api from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72; 

export default function FeaturedEventsCarousel({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const { colors, isDark } = useThemeColors();

  useEffect(() => {
    const init = async () => {
      // 1. Buscar eventos
      try {
        const data = await api.get('/eventos?destaque=true&limit=5');
        if (Array.isArray(data) && data.length > 0) {
          setEvents(data);
        }
      } catch (error) {
        console.log('Erro ao carregar eventos em destaque:', error.message);
      }

      // 2. Buscar localização do usuário
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.log('Erro ao obter localização no carousel:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading || events.length === 0) return null;

  const handlePress = (item) => {
    const imagemCap = item.imagem || item.imagens?.[0] || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=400';
    navigation.navigate('Detalhes', {
      id: item.id,
      nome: item.titulo,
      titulo: item.titulo,
      descricao: item.descricao,
      endereco: item.endereco || item.local,
      horario: item.recorrenciaDescricao,
      recorrenciaDescricao: item.recorrenciaDescricao,
      imagem: imagemCap,
      imagens: item.imagens || [imagemCap],
      tipo: 'Evento',
      latitude: item.latitude,
      longitude: item.longitude,
      linkExterno: item.linkExterno,
      telefone: item.telefone,
      whatsapp: item.whatsapp,
      gratuito: item.gratuito,
      preco: item.preco,
      acontecendoAgora: item.acontecendoAgora,
      dataInicio: item.dataInicio,
      dataFim: item.dataFim,
      proximaOcorrencia: item.proximaOcorrencia,
    });
  };

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          <Ionicons name="star" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
          Eventos em Destaque
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {events.map((item) => {
          const imagemCap = item.imagem || item.imagens?.[0] || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=400';
          
          // Cálculo dinâmico da distância
          let distText = null;
          if (userLocation && item.latitude && item.longitude) {
            const lat = parseFloat(item.latitude);
            const lng = parseFloat(item.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              const dist = calcularDistancia(userLocation.latitude, userLocation.longitude, lat, lng);
              if (dist && parseFloat(dist) < 9999) {
                const d = parseFloat(dist);
                distText = d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
              }
            }
          }

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card, 
                { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }
              ]}
              activeOpacity={0.85}
              onPress={() => handlePress(item)}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: imagemCap }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
                <View style={[styles.badge, { backgroundColor: item.acontecendoAgora ? '#10b981' : '#6366f1' }]}>
                  <Text style={styles.badgeText}>
                    {item.acontecendoAgora ? 'Acontecendo Agora' : 'Em Breve'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.content}>
                <Text numberOfLines={2} style={[styles.title, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {item.titulo}
                </Text>
                
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                  <Text numberOfLines={1} style={[styles.infoText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    {item.recorrenciaDescricao || 'Confira a data'}
                  </Text>
                </View>

                {item.local && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text numberOfLines={1} style={[styles.infoText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                      {item.local}
                    </Text>
                  </View>
                )}

                {/* Exibição da Distância (se disponível) */}
                {distText && (
                  <View style={styles.infoRow}>
                    <Ionicons name="navigate" size={14} color="#0ea5e9" />
                    <Text style={[styles.infoText, { color: '#0ea5e9', fontWeight: 'bold' }]}>
                      {distText}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  scrollContainer: { paddingRight: 18 },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginRight: 16,
  },
  imageContainer: { position: 'relative', height: 120 },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  content: { padding: 12 },
  title: { fontSize: 15, fontWeight: 'bold', marginBottom: 8, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 12, marginLeft: 6, flex: 1 },
});