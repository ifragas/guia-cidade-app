// src/screens/FavoritosScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ImageBackground } from 'expo-image';
import * as Location from 'expo-location';
import { getFavoritos } from '../utils/FavoritosHelper';
import { calcularDistancia } from '../utils/LocationHelper';
import { useThemeColors } from '../utils/ThemeContext';
import { obterCache } from '../utils/CacheHelper';

const APIS = [
  { url: 'https://turismo-api-vv62.onrender.com/api/pontos-turisticos', key: 'pontos_turisticos' },
  { url: 'https://turismo-api-vv62.onrender.com/api/acomodacoes', key: 'acomodacoes' },
  { url: 'https://turismo-api-vv62.onrender.com/api/restaurantes', key: 'restaurantes' },
];

export default function FavoritosScreen({ navigation }) {
  const [favoritosList, setFavoritosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [ordenarPorProximidade, setOrdenarPorProximidade] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  const { t } = useTranslation();
  const { colors } = useThemeColors();

  const obterLocalizacao = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.log('Erro ao obter localização:', error);
    }
  };

  const carregarFavoritos = async () => {
    try {
      setLoading(true);
      const favIds = await getFavoritos();

      if (favIds.length === 0) {
        setFavoritosList([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      let todosOsItens = [];
      let offlineDetectado = false;

      try {
        const responses = await Promise.all(
          APIS.map(item => fetch(item.url).then(res => {
            if (!res.ok) throw new Error('Erro API');
            return res.json();
          }))
        );
        todosOsItens = responses.flat();
        setIsOffline(false);
      } catch (err) {
        console.log('Modo offline nos Favoritos. Carregando dados locais do cache...');
        offlineDetectado = true;
        const caches = await Promise.all(APIS.map(item => obterCache(item.key)));
        todosOsItens = caches.filter(c => c !== null).flat();
        setIsOffline(true);
      }

      const itensFavoritados = todosOsItens.filter(item => favIds.includes(item.id));
      setFavoritosList(itensFavoritados);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarFavoritos();
      obterLocalizacao();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    carregarFavoritos();
    obterLocalizacao();
  };

  let processados = [...favoritosList];

  if (userLocation) {
    processados = processados.map(item => {
      const distancia = calcularDistancia(
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(item.latitude),
        parseFloat(item.longitude)
      );
      return { ...item, distanciaNum: distancia ? parseFloat(distancia) : 9999 };
    });

    if (ordenarPorProximidade) {
      processados.sort((a, b) => a.distanciaNum - b.distanciaNum);
    }
  }

  const renderItem = ({ item }) => {
    const distanciaKm = userLocation && item.latitude && item.longitude 
      ? calcularDistancia(userLocation.latitude, userLocation.longitude, parseFloat(item.latitude), parseFloat(item.longitude))
      : null;

    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
        onPress={() =>
          navigation.navigate('Detalhes', {
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            endereco: item.endereco,
            horario: item.horario,
            imagem: item.imagem,
            imagens: item.imagens || [],
            tipo: 'Favorito',
            latitude: item.latitude,
            longitude: item.longitude,
          })
        }
      >
        <ImageBackground
          source={{ uri: item.imagem || item.imagens?.[0] || '/placeholder.jpg' }}
          style={styles.cardImage}
          contentFit="cover"
          placeholder={require('../../assets/placeholder.jpg')}
          cachePolicy="memory-disk"
        >
          <View style={styles.cardOverlay}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardNome}>{item.nome}</Text>
              {distanciaKm && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="location" size={12} color="#fff" />
                  <Text style={styles.distanceText}>{distanciaKm} km</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardDescricao} numberOfLines={2}>
              {item.descricao ? item.descricao.substring(0, 100) + '...' : ''}
            </Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.cardSkeleton, { backgroundColor: colors.skeleton }]} />
        <View style={[styles.cardSkeleton, { backgroundColor: colors.skeleton }]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.offlineText}>Modo Offline: exibindo informações salvas.</Text>
        </View>
      )}

      {favoritosList.length > 0 && (
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder },
                ordenarPorProximidade && styles.filterChipActive,
              ]}
              onPress={() => setOrdenarPorProximidade(!ordenarPorProximidade)}
            >
              <Ionicons 
                name="navigate" 
                size={14} 
                color={ordenarPorProximidade ? '#fff' : colors.textSecondary} 
                style={{ marginRight: 4 }} 
              />
              <Text style={[styles.filterChipText, { color: colors.chipText }, ordenarPorProximidade && styles.filterChipTextActive]}>
                Mais Próximos
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <FlatList
        data={processados}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-dislike-outline" size={60} color={colors.textSecondary} style={{ marginBottom: 15 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhum favorito encontrado</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Explore os pontos turísticos, restaurantes e acomodações e toque no coração para guardar os seus locais favoritos!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9534f',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  filterWrapper: { height: 45, marginBottom: 15 },
  filterContainer: { alignItems: 'center' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  filterChipActive: { backgroundColor: '#0066cc', borderColor: '#0066cc' },
  filterChipText: { fontSize: 14, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  card: {
    width: '100%',
    height: 180,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 15,
    justifyContent: 'flex-end',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardNome: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  distanceText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 3 },
  cardDescricao: { fontSize: 14, color: '#fff', lineHeight: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  cardSkeleton: { width: '100%', height: 180, borderRadius: 12, marginBottom: 15 },
});