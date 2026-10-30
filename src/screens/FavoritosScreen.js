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
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ImageBackground } from 'expo-image';
import * as Location from 'expo-location';
import { getFavoritos, toggleFavorito } from '../utils/FavoritosHelper';
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
  const [favoritosIds, setFavoritosIds] = useState([]);
  
  const { t } = useTranslation();
  const { colors, isDark } = useThemeColors();

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
      setFavoritosIds(favIds);

      if (favIds.length === 0) {
        setFavoritosList([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      let todosOsItens = [];

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

  const handleToggleFavorito = async (idItem, e) => {
    if (e) e.stopPropagation();
    if (!idItem) return;
    const atualizados = await toggleFavorito(idItem);
    setFavoritosIds(atualizados);
    // Atualiza a lista filtrando o item removido instantaneamente
    setFavoritosList(prev => prev.filter(item => item.id !== idItem));
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
    const isFavorito = favoritosIds.includes(item.id);
    const distanciaKm = userLocation && item.latitude && item.longitude 
      ? calcularDistancia(userLocation.latitude, userLocation.longitude, parseFloat(item.latitude), parseFloat(item.longitude))
      : null;

    const imagemCap = item.imagem || item.imagens?.[0] || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb';

    return (
      <TouchableOpacity
        style={[styles.travelCard, { backgroundColor: isDark ? '#1e1e1e' : '#ffffff' }]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate('Detalhes', {
            id: item.id,
            nome: item.nome,
            descricao: item.descricao,
            endereco: item.endereco,
            horario: item.horario,
            imagem: imagemCap,
            imagens: item.imagens || [imagemCap],
            tipo: 'Favorito',
            latitude: item.latitude,
            longitude: item.longitude,
          })
        }
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
            <View style={styles.badgeRowContainer}>
              <View style={styles.travelTypeBadge}>
                <Text style={styles.travelTypeBadgeText}>Salvo</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.travelHeartButton}
              onPress={(e) => handleToggleFavorito(item.id, e)}
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

        <View style={styles.travelCardContent}>
          <View style={styles.travelCardHeaderRow}>
            <Text style={[styles.travelCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.nome}
            </Text>
            {distanciaKm && (
              <View style={styles.travelDistanceRow}>
                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.travelDistanceText, { color: colors.textSecondary }]}>
                  {distanciaKm} km
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.travelCardSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.endereco || 'Riozinho, RS'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
        <View style={[styles.cardSkeleton, { backgroundColor: colors.skeleton }]} />
        <View style={[styles.cardSkeleton, { backgroundColor: colors.skeleton }]} />
      </View>
    );
  }

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* BANNER IMERSIVO DE TOPO */}
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop',
          }}
          style={styles.topHeroBanner}
        >
          <View style={styles.heroOverlayDark}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitleText}>
                Seus Lugares{'\n'}Favoritos Salvos
              </Text>
              <Text style={styles.heroSubText}>
                Acesse rapidamente os recantos que você mais gostou em Riozinho
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* PAINEL PRINCIPAL (BOTTOM SHEET) */}
        <View style={[styles.sheetContentContainer, { backgroundColor: colors.background }]}>
          <View pointerEvents="none" style={styles.sheetGlow} />

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

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Lista de Favoritos ({favoritosList.length})
            </Text>
          </View>

          {processados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-dislike-outline" size={60} color={colors.textSecondary} style={{ marginBottom: 15 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhum favorito encontrado</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Explore os pontos turísticos, restaurantes e acomodações e toque no coração para guardar os seus locais favoritos!
              </Text>
            </View>
          ) : (
            processados.map((item) => (
              <React.Fragment key={item.id.toString()}>
                {renderItem({ item })}
              </React.Fragment>
            ))
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  topHeroBanner: {
    width: '100%',
    height: 240,
    justifyContent: 'flex-start',
  },
  heroOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroTextContainer: {
    width: '100%',
    marginTop: 10,
  },
  heroTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 30,
  },
  heroSubText: {
    fontSize: 13,
    color: '#e0e0e0',
    marginTop: 6,
  },
  sheetContentContainer: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 24,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  sheetGlow: {
    position: 'absolute',
    top: -7,
    left: 5,
    right: 5,
    height: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.28,
    shadowRadius: 9,
    elevation: 3,
    zIndex: 1,
  },
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
  filterWrapper: { height: 42, marginBottom: 16 },
  filterContainer: { alignItems: 'center' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipActive: { backgroundColor: '#0066cc', borderColor: '#0066cc' },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: 'bold' },
  travelCard: {
    width: '100%',
    marginBottom: 18,
    backgroundColor: 'transparent',
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  cardSkeleton: { width: '100%', height: 180, borderRadius: 20, marginBottom: 15 },
});