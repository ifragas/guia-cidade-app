// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ImageBackground } from 'expo-image';
import * as Location from 'expo-location';
import { calcularDistancia } from '../utils/LocationHelper';
import { useThemeColors } from '../utils/ThemeContext';
import { salvarCache, obterCache } from '../utils/CacheHelper';
import { obterClimaRiozinho } from '../services/WeatherService'; // 🔹 Import do clima

const API_URL = 'https://turismo-api-vv62.onrender.com/api/pontos-turisticos';
const CACHE_KEY = 'pontos_turisticos';

export default function HomeScreen({ navigation }) {
  const [pontos, setPontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [userLocation, setUserLocation] = useState(null);
  const [ordenarPorProximidade, setOrdenarPorProximidade] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [clima, setClima] = useState(null); // 🔹 Estado do clima

  const { t } = useTranslation();
  const { colors } = useThemeColors();

  const carregarClima = async () => {
    const dadosClima = await obterClimaRiozinho();
    if (dadosClima) {
      setClima(dadosClima);
    }
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

  const buscarPontos = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Erro na API');
      const data = await response.json();

      setPontos(data);
      setIsOffline(false);
      await salvarCache(CACHE_KEY, data);
    } catch (error) {
      console.log('Sem conexão. Buscando dados do cache local...');
      const dadosEmCache = await obterCache(CACHE_KEY);

      if (dadosEmCache && dadosEmCache.length > 0) {
        setPontos(dadosEmCache);
        setIsOffline(true);
      } else {
        Alert.alert('Atenção', 'Não foi possível carregar as atrações e não há dados offline salvos.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    buscarPontos();
    obterLocalizacao();
    carregarClima();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    buscarPontos();
    obterLocalizacao();
    carregarClima();
  };

  const categories = ['Todos', 'Cascata', 'Trilha', 'Camping'];

  let processados = pontos.filter(ponto => {
    const matchesSearch = ponto.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Todos' ||
      ponto.nome.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      (ponto.descricao && ponto.descricao.toLowerCase().includes(selectedCategory.toLowerCase()));
    return matchesSearch && matchesCategory;
  });

  if (userLocation) {
    processados = processados.map(ponto => {
      const distancia = calcularDistancia(
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(ponto.latitude),
        parseFloat(ponto.longitude)
      );
      return { ...ponto, distanciaNum: distancia ? parseFloat(distancia) : 9999 };
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
            tipo: 'Ponto Turístico',
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainerSkeleton, { backgroundColor: colors.skeleton }]} />
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

      {/* Widget de Clima em Riozinho */}
      {clima && (
        <View style={[styles.weatherWidget, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.weatherInfoLeft}>
            <Ionicons name={clima.icone} size={28} color={colors.textPrimary} style={{ marginRight: 8 }} />
            <View>
              <Text style={[styles.weatherCity, { color: colors.textPrimary }]}>Riozinho, RS</Text>
              <Text style={[styles.weatherDesc, { color: colors.textSecondary }]}>{clima.descricao}</Text>
            </View>
          </View>
          <Text style={[styles.weatherTemp, { color: colors.textPrimary }]}>{clima.temperatura}°C</Text>
        </View>
      )}

      {/* Barra de pesquisa */}
      <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={t('searchPlaceholder', 'Pesquisar locais...')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
      </View>

      {/* Filtros e Proximidade */}
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

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder },
                selectedCategory === cat && !ordenarPorProximidade && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.chipText },
                  selectedCategory === cat && !ordenarPorProximidade && styles.filterChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista */}
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
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResults', 'Nenhum local encontrado.')}</Text>
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
  weatherWidget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  weatherInfoLeft: { flexDirection: 'row', alignItems: 'center' },
  weatherCity: { fontSize: 14, fontWeight: 'bold' },
  weatherDesc: { fontSize: 12 },
  weatherTemp: { fontSize: 22, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  searchIcon: { marginLeft: 10 },
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  searchContainerSkeleton: { height: 45, borderRadius: 10, marginBottom: 15 },
  cardSkeleton: { width: '100%', height: 180, borderRadius: 12, marginBottom: 15 },
});