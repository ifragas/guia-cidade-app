import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, ActivityIndicator, TextInput, Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCity } from '../context/CityContext';
import SkeletonOverlay from '../components/SkeletonOverlay';

const BLUE_DEEP = '#071B42';

const ICON_MAP = {
  camera: 'camera', foto: 'camera', tree: 'leaf', natureza: 'leaf',
  restaurant: 'restaurant', comida: 'restaurant', mountain: 'triangle',
  montanha: 'triangle', museum: 'business', museu: 'business',
  cultura: 'business', beach: 'water', praia: 'water', default: 'location',
};

export default function CitySelectionScreen() {
  const { cidadesDisponiveis, selecionarCidade, loading } = useCity();
  const [selecionando, setSelecionando] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🚨 NOVO: controle fino do skeleton
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Skeleton só some quando: dados carregados E logo renderizada
  useEffect(() => {
    if (!loading && logoLoaded) {
      const timer = setTimeout(() => setShowSkeleton(false), 300);
      return () => clearTimeout(timer);
    }
  }, [loading, logoLoaded]);

  // Reseta estados ao trocar de cidade (caso o contexto recarregue)
  useEffect(() => {
    if (loading) {
      setShowSkeleton(true);
      setLogoLoaded(false);
    }
  }, [loading]);

  const handleSelecionar = async (cidade) => {
    setSelecionando(cidade.slug);
    await selecionarCidade(cidade);
  };

  const cidadesFiltradas = useMemo(() => {
    if (!searchQuery.trim()) return cidadesDisponiveis;
    const q = searchQuery.toLowerCase();
    return cidadesDisponiveis.filter(
      (c) => (c.nome || '').toLowerCase().includes(q) || (c.estado || '').toLowerCase().includes(q)
    );
  }, [cidadesDisponiveis, searchQuery]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SkeletonOverlay visible={showSkeleton} type="cities" />

      <RNImage source={require('../../assets/fundo-selecao.jpg')} style={styles.backgroundImage} resizeMode="cover" />

      <LinearGradient
        colors={['rgba(7, 27, 66, 0.25)', 'rgba(7, 27, 66, 0.15)', 'rgba(7, 27, 66, 0.45)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={styles.overlayGradient} pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={styles.logoWrapper}>
            <RNImage 
              source={require('../../assets/smart-turismo.png')} 
              style={styles.logo} 
              resizeMode="contain"
              onLoad={() => setLogoLoaded(true)}
            />
          </View>
        </View>

        <Text style={styles.greeting}>Olá! Próxima parada?</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.85)" />
          <TextInput
            style={styles.searchInput} placeholder="Buscar por cidade..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery} onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          style={styles.list} data={cidadesFiltradas}
          keyExtractor={(item, index) => String(item.slug || item.id || index)}
          showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Todas as cidades</Text>
              <Text style={styles.sectionSubtitle}>Próximas de você</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.7)" />
              <Text style={styles.emptySearchText}>Nenhuma cidade encontrada.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelecionando = selecionando === item.slug;
            const icone = ICON_MAP[(item.categoriaIcone || '').toLowerCase()] || ICON_MAP.default;
            const corBadge = item.categoriaCor || item.corPrimaria || '#0284C7';
            const imagemUri = item.heroImageUrl || item.splashImageUrl || item.imagemSplash;

            return (
              <TouchableOpacity
                style={styles.cardOuter} onPress={() => handleSelecionar(item)}
                disabled={selecionando !== null} activeOpacity={0.85}
              >
                <LinearGradient colors={['rgba(11, 45, 107, 0.78)', 'rgba(7, 27, 66, 0.72)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cityCard}>
                  {imagemUri ? (
                    <Image source={{ uri: imagemUri }} style={styles.cardImage} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                      <Ionicons name="image-outline" size={22} color="rgba(255,255,255,0.6)" />
                    </View>
                  )}
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.nome}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{item.categoriaLabel || item.estado || 'Descubra esta cidade'}</Text>
                  </View>
                  <View style={styles.rightAction}>
                    {isSelecionando ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="chevron-forward" size={19} color="rgba(255,255,255,0.9)" />
                    )}
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: corBadge }]}>
                    <Ionicons name={icone} size={14} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_DEEP },
  backgroundImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 0 },
  overlayGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 18, zIndex: 10 },
  
  topBar: { alignItems: 'center', justifyContent: 'center', paddingTop: 32, paddingBottom: 16 },
  logoWrapper: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 350, height: 105 },
  
  greeting: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 14, marginBottom: 16, letterSpacing: -0.3, textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.35)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, padding: 0 },
  
  list: { flex: 1 },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0, 0, 0, 0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  sectionSubtitle: { fontSize: 13.5, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2, fontWeight: '500' },
  listContent: { paddingBottom: 36 },
  
  cardOuter: { marginBottom: 14, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6 },
  cityCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.28)', borderRadius: 18, padding: 10, paddingRight: 42, minHeight: 84, overflow: 'hidden' },
  cardImage: { width: 84, height: 62, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.35)', backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  cardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardTextContainer: { flex: 1, marginLeft: 14, marginRight: 8, justifyContent: 'center' },
  cardName: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3 },
  cardSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' },
  rightAction: { position: 'absolute', top: 12, right: 12 },
  categoryBadge: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 30, borderTopLeftRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  emptySearch: { alignItems: 'center', paddingVertical: 40 },
  emptySearchText: { color: 'rgba(255, 255, 255, 0.85)', marginTop: 12, fontSize: 14 },
});