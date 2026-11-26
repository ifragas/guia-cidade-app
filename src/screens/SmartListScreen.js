import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar, ActivityIndicator, TextInput, ScrollView, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useCity } from '../context/CityContext';
import { calcularDistancia } from '../utils/LocationHelper';
import { obterCache } from '../services/cacheService';
import SkeletonOverlay from '../components/SkeletonOverlay';
import useConnectivity from '../hooks/useConnectivity';
import OfflineBanner from '../components/OfflineBanner';

const FUNDO_URI = require('../../assets/fundo-selecao.jpg');
const LOGO_URI = require('../../assets/smart-turismo.png');

const CATEGORY_STYLES = { turismo: '#0ea5e9', gastronomia: '#f59e0b', hospedagem: '#8b5cf6', servicos: '#10b981', evento: '#6366f1' };
const CATEGORY_BADGE_ICONS = { turismo: 'location', gastronomia: 'restaurant', hospedagem: 'bed', servicos: 'business', evento: 'calendar' };
const CATEGORIAS_LISTA = [
  { id: 'todos', label: 'Todos' }, { id: 'turismo', label: 'Atrações' },
  { id: 'gastronomia', label: 'Gastronomia' }, { id: 'hospedagem', label: 'Hospedagem' },
  { id: 'servicos', label: 'Serviços' }, { id: 'evento', label: 'Eventos' },
];
const CATEGORIA_LABEL_CARD = { turismo: 'Atração', gastronomia: 'Gastronomia', hospedagem: 'Hospedagem', servicos: 'Serviço', evento: 'Evento' };

export default function SmartListScreen({ navigation }) {
  const { cidadeAtual, isOffline } = useCity();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const cacheRef = useRef({ cidade: null, data: null });
  const { isConnected } = useConnectivity();

  useEffect(() => {
    const carregar = async () => {
      if (!cidadeAtual?.slug) return;

      // Cache em memória (sessão atual)
      if (cacheRef.current.cidade === cidadeAtual.slug && cacheRef.current.data) {
        setData(cacheRef.current.data);
        setLoading(false);
        setShowSkeleton(false);
        return;
      }

      setLoading(true);
      setShowSkeleton(true);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let loc = null;
        if (status === 'granted') {
          loc = await Location.getCurrentPositionAsync({});
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }

        // 🚨 TENTAR CACHE PRIMEIRO
        const cacheKey = `cidade_${cidadeAtual.slug}`;
        const dadosCache = await obterCache(cacheKey);

        let turismoData = [], restaurantesData = [], acomodacoesData = [], servicosData = [], eventosData = [];

        if (dadosCache) {
          console.log(`📴 [Lista] Usando cache para: ${cidadeAtual.slug}`);
          turismoData = dadosCache.pontosTuristicos || [];
          restaurantesData = dadosCache.restaurantes || [];
          acomodacoesData = dadosCache.acomodacoes || [];
          servicosData = dadosCache.servicos || [];
          eventosData = dadosCache.eventos || [];
        } else {
          console.log(`🌐 [Lista] Cache vazio, buscando online: ${cidadeAtual.slug}`);
          const [turismo, restaurantes, acomodacoes, servicos, eventos] = await Promise.allSettled([
            api.get('/pontos-turisticos', cidadeAtual.slug),
            api.get('/restaurantes', cidadeAtual.slug),
            api.get('/acomodacoes', cidadeAtual.slug),
            api.get('/servicos', cidadeAtual.slug),
            api.get('/eventos', cidadeAtual.slug),
          ]);
          turismoData = turismo.status === 'fulfilled' ? turismo.value : [];
          restaurantesData = restaurantes.status === 'fulfilled' ? restaurantes.value : [];
          acomodacoesData = acomodacoes.status === 'fulfilled' ? acomodacoes.value : [];
          servicosData = servicos.status === 'fulfilled' ? servicos.value : [];
          eventosData = eventos.status === 'fulfilled' ? eventos.value : [];
        }

        const lista = [];
        const adicionar = (items, categoriaKey) => {
          if (Array.isArray(items)) {
            items.forEach((item) => {
              const lat = parseFloat(item.latitude), lng = parseFloat(item.longitude);
              let dist = null;
              if (loc && !isNaN(lat) && !isNaN(lng)) {
                const d = calcularDistancia(loc.coords.latitude, loc.coords.longitude, lat, lng);
                dist = d ? parseFloat(d) : null;
              }
              lista.push({ ...item, categoriaKey, lat, lng, dist });
            });
          }
        };
        adicionar(turismoData, 'turismo');
        adicionar(restaurantesData, 'gastronomia');
        adicionar(acomodacoesData, 'hospedagem');
        adicionar(servicosData, 'servicos');
        adicionar(eventosData, 'evento');
        if (loc) lista.sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999));
        setData(lista);
        cacheRef.current = { cidade: cidadeAtual.slug, data: lista };
      } catch (error) {
        console.error('Erro ao carregar lista:', error);
      } finally {
        setLoading(false);
        setTimeout(() => setShowSkeleton(false), 300);
      }
    };
    carregar();
  }, [cidadeAtual?.slug]);

  const listaFiltrada = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      const matchCat = filtroAtivo === 'todos' || item.categoriaKey === filtroAtivo;
      const matchSearch = !q || (item.nome || '').toLowerCase().includes(q) || (item.titulo || '').toLowerCase().includes(q) || (item.descricao || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [data, filtroAtivo, searchQuery]);

  const formatarDistancia = (dist) => {
    if (dist == null) return null;
    return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
  };

  const abrirDetalhes = (item) => {
    navigation.navigate('Detalhes', {
      id: item.id, nome: item.nome || item.titulo, titulo: item.titulo, descricao: item.descricao,
      endereco: item.endereco, imagem: item.imagem || item.imagens?.[0], imagens: item.imagens,
      tipo: CATEGORIA_LABEL_CARD[item.categoriaKey] || 'Atração', latitude: item.lat, longitude: item.lng,
      whatsapp: item.whatsapp, telefone: item.telefone, horarios: item.horarios, sempreAberto: item.sempreAberto,
      linkExterno: item.linkExterno, dataInicio: item.dataInicio, dataFim: item.dataFim,
      proximaOcorrencia: item.proximaOcorrencia, gratuito: item.gratuito, preco: item.preco,
      recorrenciaDescricao: item.recorrenciaDescricao, funcionamento24h: item.funcionamento24h,
      tipoServico: item.tipoServico, redesSociais: item.redesSociais,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <RNImage source={FUNDO_URI} style={styles.backgroundImage} resizeMode="cover" />
      <LinearGradient colors={['rgba(7, 27, 66, 0.30)', 'rgba(7, 27, 66, 0.20)', 'rgba(7, 27, 66, 0.55)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.overlayGradient} pointerEvents="none" />

      <SkeletonOverlay visible={showSkeleton} type="list" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <RNImage source={LOGO_URI} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('SmartHome')} activeOpacity={0.75}>
            <Ionicons name="map-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Explorar {cidadeAtual?.nome}</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.85)" />
          <TextInput style={styles.searchInput} placeholder="Buscar pontos, restaurantes..." placeholderTextColor="rgba(255,255,255,0.65)" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} style={styles.chipsScroll}>
          {CATEGORIAS_LISTA.map((cat) => {
            const isActive = filtroAtivo === cat.id;
            return (
              <TouchableOpacity key={cat.id} style={[styles.chip, isActive && styles.chipActive]} onPress={() => setFiltroAtivo(cat.id)} activeOpacity={0.8}>
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Perto de você</Text>
          <Text style={styles.sectionSubtitle}>
            {listaFiltrada.length} {listaFiltrada.length === 1 ? 'local encontrado' : 'locais encontrados'}
            {!isConnected && ' (offline)'}
          </Text>
        </View>
        <FlatList
          data={listaFiltrada}
          keyExtractor={(item, index) => `${item.categoriaKey}-${item.id}-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="compass-outline" size={44} color="rgba(255,255,255,0.6)" />
              <Text style={styles.emptyText}>
                {isConnected ? 'Nenhum local encontrado.' : 'Sem conexão e sem dados em cache.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const dist = formatarDistancia(item.dist);
            const label = CATEGORIA_LABEL_CARD[item.categoriaKey] || 'Atração';
            const cor = CATEGORY_STYLES[item.categoriaKey] || '#10b981';
            const icone = CATEGORY_BADGE_ICONS[item.categoriaKey] || 'location';
            const imgUri = item.imagem || item.imagens?.[0];
            return (
              <TouchableOpacity style={styles.card} onPress={() => abrirDetalhes(item)} activeOpacity={0.85}>
                <Image source={{ uri: imgUri || 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f' }} style={styles.cardImage} contentFit="cover" transition={200} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.nome || item.titulo || 'Local'}</Text>
                  <View style={styles.cardSubtitleRow}>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{label}{dist ? ` • ${dist}` : ''}</Text>
                    {dist ? <Ionicons name="navigate" size={11} color="rgba(255,255,255,0.7)" /> : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
                <View style={[styles.categoryBadge, { backgroundColor: cor }]}>
                  <Ionicons name={icone} size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
      <OfflineBanner visible={!isConnected} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#071B42' },
  backgroundImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 0 },
  overlayGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 18, zIndex: 10 },
  topBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 12, paddingBottom: 6, position: 'relative' },
  logo: { width: 298, height: 89 },
  iconButton: { position: 'absolute', right: 0, width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255, 255, 255, 0.16)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.26)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 10, marginBottom: 14, letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.35)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, padding: 0 },
  chipsScroll: { flexGrow: 0, flexShrink: 0, height: 42, marginBottom: 16 },
  chipsRow: { gap: 10, paddingHorizontal: 4, alignItems: 'center' },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, backgroundColor: 'rgba(11, 45, 107, 0.55)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.18)', flexShrink: 0 },
  chipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  chipTextActive: { color: '#0f172a' },
  sectionHeader: { marginBottom: 12, flexShrink: 0 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  sectionSubtitle: { fontSize: 13.5, color: 'rgba(255, 255, 255, 0.85)', marginTop: 2, fontWeight: '500' },
  flatList: { flex: 1, flexGrow: 1, flexShrink: 1 },
  listContent: { paddingBottom: 120 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(11, 45, 107, 0.62)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.16)', borderRadius: 18, padding: 10, paddingRight: 40, minHeight: 92, marginBottom: 14, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  cardImage: { width: 72, height: 72, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  cardContent: { flex: 1, marginLeft: 14, marginRight: 8, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4, lineHeight: 20 },
  cardSubtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', flexShrink: 1 },
  categoryBadge: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 30, borderTopLeftRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: 'rgba(255, 255, 255, 0.85)', marginTop: 12, fontSize: 14 },
});