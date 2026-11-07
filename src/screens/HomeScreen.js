// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ImageBackground } from 'expo-image';
import * as Location from 'expo-location';
import { calcularDistancia } from '../utils/LocationHelper';
import { useThemeColors } from '../utils/ThemeContext';
import { salvarCache, obterCache } from '../utils/CacheHelper';
import { getFavoritos, toggleFavorito } from '../utils/FavoritosHelper';
import api from '../services/api';
import TravelCard from '../components/TravelCard';
import TravelCardSkeleton from '../components/TravelCardSkeleton';

const CACHE_KEY = 'global_discover_data_v12';

export default function HomeScreen({ navigation }) {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [userLocation, setUserLocation] = useState(null);
  const [ordenarPorProximidade, setOrdenarPorProximidade] = useState(false);
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

  const buscarTodosDados = async () => {
    try {
      const [resTurismo, resRestaurantes, resAcomodacoes, resServicos] =
        await Promise.allSettled([
          api.get('/pontos-turisticos'),
          api.get('/restaurantes'),
          api.get('/acomodacoes'),
          api.get('/servicos'),
        ]);

      const turismoData = (
        resTurismo.status === 'fulfilled' ? resTurismo.value : []
      ).map((item) => ({
        ...item,
        categoriaPai: 'Turismo',
        tipoBadge: 'Turismo',
      }));

      const restaurantesData = (
        resRestaurantes.status === 'fulfilled' ? resRestaurantes.value : []
      ).map((item) => ({
        ...item,
        categoriaPai: 'Restaurantes',
        tipoBadge: 'Gastronomia',
      }));

      const acomodacoesData = (
        resAcomodacoes.status === 'fulfilled' ? resAcomodacoes.value : []
      ).map((item) => ({
        ...item,
        categoriaPai: 'Acomodações',
        tipoBadge: 'Hospedagem',
      }));

      const servicosData = (
        resServicos.status === 'fulfilled' ? resServicos.value : []
      ).map((item) => ({
        ...item,
        categoriaPai: 'Serviços',
        tipoBadge: 'servicos',
      }));

      const combinados = [
        ...turismoData,
        ...restaurantesData,
        ...acomodacoesData,
        ...servicosData,
      ];

      if (combinados.length > 0) {
        setAllData(combinados);
        setIsOffline(false);
        await salvarCache(CACHE_KEY, combinados);
      } else {
        throw new Error('Sem resposta');
      }
    } catch (error) {
      const dadosEmCache = await obterCache(CACHE_KEY);
      if (dadosEmCache && dadosEmCache.length > 0) {
        setAllData(dadosEmCache);
        setIsOffline(true);
      } else {
        Alert.alert(
          'Atenção',
          'Não foi possível carregar as atrações e não há dados offline salvos.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    buscarTodosDados();
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
    buscarTodosDados();
    obterLocalizacao();
    carregarFavoritos();
  };

  const handleToggleFavorito = async (idItem, e) => {
    if (e) e.stopPropagation();
    if (!idItem) return;
    const atualizados = await toggleFavorito(idItem);
    setFavoritosIds(atualizados);
  };

  // Array de categorias com cores individuais
  const categoriesData = [
    { id: 'Todos', label: 'Todos', icon: 'apps', color: '#6366f1' },
    { id: 'Turismo', label: 'Turismo', icon: 'location', color: '#0ea5e9' },
    { id: 'Restaurantes', label: 'Restaurantes', icon: 'restaurant', color: '#f59e0b' },
    { id: 'Acomodações', label: 'Acomodações', icon: 'bed', color: '#8b5cf6' },
    { id: 'Serviços', label: 'Serviços', icon: 'business', color: '#10b981' },
  ];

  // Pega a categoria selecionada para exibir no cabeçalho
  const categoriaSelecionada = categoriesData.find(cat => cat.id === selectedCategory);

  let processados = allData.filter((item) => {
    const nomeItem = item.nome || item.title || '';
    const descItem = item.descricao || item.description || '';

    const matchesSearch =
      nomeItem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      descItem.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'Todos' ||
      item.categoriaPai === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (userLocation) {
    processados = processados.map((item) => {
      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);

      const distancia =
        !isNaN(lat) && !isNaN(lng)
          ? calcularDistancia(
              userLocation.latitude,
              userLocation.longitude,
              lat,
              lng
            )
          : null;

      return {
        ...item,
        distanciaNum: distancia ? parseFloat(distancia) : 9999,
      };
    });

    if (ordenarPorProximidade) {
      processados.sort((a, b) => a.distanciaNum - b.distanciaNum);
    }
  }

  const navegarParaDetalhes = (item) => {
    const imagemCap =
      item.imagem ||
      item.imagens?.[0] ||
      'https://images.unsplash.com/photo-1432821596592-e2c18b78144f';

    navigation.navigate('Detalhes', {
      id: item.id,
      nome: item.nome,
      descricao: item.descricao,
      endereco: item.endereco,
      horario: item.horario,
      imagem: imagemCap,
      imagens: item.imagens || [imagemCap],
      tipo: item.tipoBadge,
      latitude: item.latitude,
      longitude: item.longitude,
    });
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <TravelCardSkeleton />
        <TravelCardSkeleton />
        <TravelCardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ScrollView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop',
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
                placeholder={t(
                  'searchPlaceholder',
                  'Pesquisar locais...'
                )}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#888"
              />

              <Ionicons
                name="options-outline"
                size={18}
                color="#666"
              />
            </View>

            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitleText}>
                Descubra Novos{'\n'}Lugares Incríveis
              </Text>

              <Text style={styles.heroSubText}>
                Explore as melhores atrações e recantos de Rolante!
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View
          style={[
            styles.sheetContentContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            pointerEvents="none"
            style={styles.sheetGlow}
          />

          {isOffline && (
            <View style={styles.offlineBanner}>
              <Ionicons
                name="cloud-offline-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.offlineText}>
                Modo Offline: exibindo informações salvas.
              </Text>
            </View>
          )}

          {/* CABEÇALHO COM PÍLULA ÚNICA ENVOLVENDO "Categoria: Nome" */}
          <View style={styles.sectionHeaderRow}>
            {/* PÍLULA ÚNICA COM "Categoria: Nome" */}
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: categoriaSelecionada?.color || '#0066cc' },
              ]}
            >
              <Text style={styles.categoryPillText}>
                Categoria: {categoriaSelecionada?.label || 'Todos'}
              </Text>
            </View>
            
            {/* Botão "Mais Próximos" */}
            <TouchableOpacity
              style={[
                styles.sortButton,
                ordenarPorProximidade && styles.sortButtonActive,
              ]}
              onPress={() =>
                setOrdenarPorProximidade(!ordenarPorProximidade)
              }
            >
              <Ionicons
                name="navigate"
                size={14}
                color={
                  ordenarPorProximidade
                    ? '#fff'
                    : colors.textSecondary
                }
                style={{ marginRight: 4 }}
              />

              <Text
                style={[
                  styles.sortButtonText,
                  { color: colors.textSecondary },
                  ordenarPorProximidade &&
                    styles.sortButtonTextActive,
                ]}
              >
                Próximos
              </Text>
            </TouchableOpacity>
          </View>

          {/* LISTA HORIZONTAL DE BOLINHAS COLORIDAS */}
          <View style={styles.categoriesRow}>
            {categoriesData.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCircle,
                    {
                      backgroundColor: isSelected ? cat.color : (isDark ? '#334155' : '#f1f5f9'),
                      borderColor: isSelected ? cat.color : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={cat.icon}
                    size={24}
                    color={isSelected ? '#ffffff' : cat.color}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* LISTA DE RESULTADOS */}
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textPrimary },
              ]}
            >
              {searchQuery !== ''
                ? 'Resultados da Pesquisa'
                : 'Recomendados para você'}
            </Text>
          </View>

          {processados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={colors.textSecondary}
                style={{ marginBottom: 10 }}
              />

              <Text
                style={[
                  styles.emptyText,
                  { color: colors.textSecondary },
                ]}
              >
                Nenhum local encontrado.
              </Text>
            </View>
          ) : (
            processados.map((item) => (
              <TravelCard
                key={`${item.categoriaPai}-${item.id}`}
                item={item}
                isDark={isDark}
                isFavorito={favoritosIds.includes(item.id)}
                userLocation={userLocation}
                badgeType={item.tipoBadge}
                onPress={() => navegarParaDetalhes(item)}
                onToggleFavorito={(e) => handleToggleFavorito(item.id, e)}
              />
            ))
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
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
    shadowOffset: {
      width: 0,
      height: -4,
    },
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
    shadowOffset: {
      width: 0,
      height: -3,
    },
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
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  // NOVO: Pílula única envolvendo "Categoria: Nome"
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryPillText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  sortButtonActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  categoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});