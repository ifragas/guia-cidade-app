// src/screens/RestaurantesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ImageBackground } from 'expo-image';
import * as Location from 'expo-location';
import { calcularDistancia } from '../utils/LocationHelper';
import { useThemeColors } from '../utils/ThemeContext';
import { salvarCache, obterCache } from '../utils/CacheHelper';
import { isAbertoAgora } from '../utils/ScheduleHelper';
import { getFavoritos, toggleFavorito } from '../utils/FavoritosHelper';
import api from '../services/api';
import TravelCard from '../components/TravelCard';
import TravelCardSkeleton from '../components/TravelCardSkeleton';

const CACHE_KEY = 'restaurantes_v4';

export default function RestaurantesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [ordenarPorProximidade, setOrdenarPorProximidade] = useState(false);
  const [apenasAbertos, setApenasAbertos] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [favoritosIds, setFavoritosIds] = useState([]);

  const { t } = useTranslation();
  const { colors, isDark } = useThemeColors();

  const carregarFavoritos = async () => {
    const favs = await getFavoritos();
    setFavoritosIds(favs);
  };

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

  const fetchItems = async () => {
    try {
      const data = await api.get('/restaurantes');
      setItems(data);
      setIsOffline(false);
      await salvarCache(CACHE_KEY, data);
    } catch (error) {
      console.log('Sem conexão. Buscando restaurantes do cache local...');
      const dadosEmCache = await obterCache(CACHE_KEY);
      if (dadosEmCache && dadosEmCache.length > 0) {
        setItems(dadosEmCache);
        setIsOffline(true);
      } else {
        Alert.alert('Atenção', 'Não foi possível carregar os restaurantes e não há dados offline salvos.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
    obterLocalizacao();
    carregarFavoritos();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      carregarFavoritos();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
    obterLocalizacao();
    carregarFavoritos();
  };

  const handleToggleFavorito = async (idItem, e) => {
    if (e) e.stopPropagation();
    if (!idItem) return;
    const atualizados = await toggleFavorito(idItem);
    setFavoritosIds(atualizados);
  };

  let processados = items.filter(item =>
    item.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (apenasAbertos) {
    processados = processados.filter(item => isAbertoAgora(item));
  }

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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <TravelCardSkeleton />
        <TravelCardSkeleton />
        <TravelCardSkeleton />
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
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop',
          }}
          style={styles.topHeroBanner}
        >
          <View style={styles.heroOverlayDark}>
            <View style={styles.searchContainerFloating}>
              <Ionicons
                name="search"
                size={18}
                color="#666"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInputFloating}
                placeholder={t('searchPlaceholder', 'Pesquisar restaurantes...')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#888"
              />
              <Ionicons
                name="restaurant-outline"
                size={18}
                color="#666"
              />
            </View>

            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitleText}>
                Sabores &{'\n'}Gastronomia Local
              </Text>
              <Text style={styles.heroSubText}>
                Explore os melhores restaurantes e cafés de Riozinho
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View style={[styles.sheetContentContainer, { backgroundColor: colors.background }]}>
          <View pointerEvents="none" style={styles.sheetGlow} />

          {isOffline && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.offlineText}>Modo Offline: exibindo informações salvas.</Text>
            </View>
          )}

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

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder },
                  apenasAbertos && styles.filterChipActive,
                ]}
                onPress={() => setApenasAbertos(!apenasAbertos)}
              >
                <Ionicons 
                  name="time-outline" 
                  size={14} 
                  color={apenasAbertos ? '#fff' : colors.textSecondary} 
                  style={{ marginRight: 4 }} 
                />
                <Text style={[styles.filterChipText, { color: colors.chipText }, apenasAbertos && styles.filterChipTextActive]}>
                  Aberto Agora
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {searchQuery !== '' ? 'Resultados da Pesquisa' : 'Restaurantes Disponíveis'}
            </Text>
          </View>

          {processados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResults', 'Nenhum restaurante encontrado.')}</Text>
            </View>
          ) : (
            processados.map((item) => {
              const imagemCap = item.imagem || item.imagens?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4';
              const aberto = isAbertoAgora(item);

              return (
                <TravelCard
                  key={item.id.toString()}
                  item={item}
                  isDark={isDark}
                  isFavorito={favoritosIds.includes(item.id)}
                  userLocation={userLocation}
                  badgeType="Gastronomia"
                  statusBadge={{ aberto }}
                  onPress={() =>
                    navigation.navigate('Detalhes', {
                      id: item.id,
                      nome: item.nome,
                      descricao: item.descricao,
                      endereco: item.endereco,
                      horario: item.horario,
                      horarios: item.horarios,
                      sempreAberto: item.sempreAberto,
                      imagem: imagemCap,
                      imagens: item.imagens || [imagemCap],
                      tipo: 'Gastronomia',
                      latitude: item.latitude,
                      longitude: item.longitude,
                    })
                  }
                  onToggleFavorito={(e) => handleToggleFavorito(item.id, e)}
                />
              );
            })
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  loadingContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 18,
  },
  topHeroBanner: {
    width: '100%',
    height: 270,
    justifyContent: 'flex-start',
  },
  heroOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingTop: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  searchContainerFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 6,
    width: '88%',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  searchInputFloating: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  heroTextContainer: {
    marginTop: 24,
    width: '100%',
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});