// src/screens/DetalhesScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  Dimensions,
  Share,
  Platform,
  ActionSheetIOS,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getFavoritos, toggleFavorito } from '../utils/FavoritosHelper';
import { useThemeColors } from '../utils/ThemeContext';
import { isAbertoAgora } from '../utils/ScheduleHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - 40;

export default function DetalhesScreen({ route }) {
  const item = route.params;
  const { id, nome, descricao, endereco, horario, imagem, imagens, tipo, latitude, longitude } = item;
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFavorito, setIsFavorito] = useState(false);
  const flatListRef = useRef(null);
  const { t } = useTranslation();
  const { colors, isDark } = useThemeColors();

  // Verifica o estado de abertura com base na string de horário
  const estaAberto = horario ? isAbertoAgora(horario) : null;

  const parsedLat = parseFloat(latitude);
  const parsedLng = parseFloat(longitude);
  const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng);
  const imageList = Array.isArray(imagens) && imagens.length > 0 ? imagens : [imagem];

  useEffect(() => {
    async function checkFavorito() {
      const favs = await getFavoritos();
      if (favs.includes(id)) {
        setIsFavorito(true);
      }
    }
    checkFavorito();
  }, [id]);

  const handleToggleFavorito = async () => {
    const atualizados = await toggleFavorito(id);
    setIsFavorito(atualizados.includes(id));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Confira ${nome} no Guia Turístico de Riozinho! ${endereco ? 'Endereço: ' + endereco : ''}`,
      });
    } catch (error) {
      Alert.alert(t('error', 'Erro'), 'Não foi possível partilhar o local.');
    }
  };

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / CONTENT_WIDTH);
    if (slide !== activeIndex && slide >= 0 && slide < imageList.length) {
      setActiveIndex(slide);
    }
  };

  const scrollToIndex = (index) => {
    if (index >= 0 && index < imageList.length) {
      flatListRef.current?.scrollToIndex({ index, animated: true });
      setActiveIndex(index);
    }
  };

  // Abre as opções de navegação nativas (ActionSheet no iOS / Alert no Android)
  const abrirNoMapa = () => {
    if (!hasValidCoords) {
      Alert.alert(t('locationUnavailable', 'Localização indisponível'));
      return;
    }

    const label = encodeURIComponent(nome);

    const opcoes = [
      {
        label: 'Google Maps',
        url: Platform.OS === 'ios'
          ? `comgooglemaps://?q=${parsedLat},${parsedLng}&center=${parsedLat},${parsedLng}`
          : `geo:${parsedLat},${parsedLng}?q=${parsedLat},${parsedLng}(${label})`,
        fallbackUrl: `https://www.google.com/maps/search/?api=1&query=${parsedLat},${parsedLng}`,
      },
      {
        label: 'Waze',
        url: `waze://?ll=${parsedLat},${parsedLng}&navigate=yes`,
        fallbackUrl: `https://waze.com/ul?ll=${parsedLat},${parsedLng}&navigate=yes`,
      },
    ];

    if (Platform.OS === 'ios') {
      opcoes.unshift({
        label: 'Apple Maps',
        url: `maps://?q=${label}&ll=${parsedLat},${parsedLng}`,
        fallbackUrl: `maps://?q=${label}&ll=${parsedLat},${parsedLng}`,
      });
    }

    const executarAbertura = async (url, fallbackUrl) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          await Linking.openURL(fallbackUrl);
        }
      } catch (err) {
        await Linking.openURL(fallbackUrl);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...opcoes.map(o => o.label), 'Cancelar'],
          cancelButtonIndex: opcoes.length,
          title: 'Como deseja navegar?',
          message: `Escolha o aplicativo de mapas para traçar a rota até ${nome}`,
        },
        (buttonIndex) => {
          if (buttonIndex < opcoes.length) {
            const escolha = opcoes[buttonIndex];
            executarAbertura(escolha.url, escolha.fallbackUrl);
          }
        }
      );
    } else {
      Alert.alert(
        'Como deseja navegar?',
        `Escolha o aplicativo de mapas para traçar a rota até ${nome}`,
        [
          ...opcoes.map(opcao => ({
            text: opcao.label,
            onPress: () => executarAbertura(opcao.url, opcao.fallbackUrl),
          })),
          { text: 'Cancelar', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Carrossel de imagens */}
      <View style={[styles.carouselContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <FlatList
          ref={flatListRef}
          data={imageList}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item: imgUri }) => (
            <Image
              source={{ uri: imgUri || '/placeholder.jpg' }}
              style={styles.carouselImage}
              contentFit="cover"
              placeholder={require('../../assets/placeholder.jpg')}
              cachePolicy="memory-disk"
            />
          )}
        />

        {/* Botão Favorito Flutuante */}
        <TouchableOpacity style={[styles.floatingFavButton, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]} onPress={handleToggleFavorito}>
          <Ionicons name={isFavorito ? 'heart' : 'heart-outline'} size={24} color={isFavorito ? '#ff3b30' : colors.textPrimary} />
        </TouchableOpacity>

        {/* Botão Partilhar Flutuante */}
        <TouchableOpacity style={[styles.floatingShareButton, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Setas de navegação */}
        {imageList.length > 1 && activeIndex > 0 && (
          <TouchableOpacity style={[styles.arrowButton, { left: 10 }]} onPress={() => scrollToIndex(activeIndex - 1)}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
        )}
        {imageList.length > 1 && activeIndex < imageList.length - 1 && (
          <TouchableOpacity style={[styles.arrowButton, { right: 10 }]} onPress={() => scrollToIndex(activeIndex + 1)}>
            <Ionicons name="chevron-forward" size={22} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Indicadores (Dots) */}
        {imageList.length > 1 && (
          <View style={styles.paginationContainer}>
            {imageList.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, activeIndex === idx ? styles.activeDot : styles.inactiveDot]}
              />
            ))}
          </View>
        )}
      </View>

      <Text style={[styles.titulo, { color: colors.textPrimary }]}>{nome}</Text>

      <View style={[styles.infoBox, { backgroundColor: isDark ? '#1e1e1e' : '#e6f7ff', borderColor: colors.cardBorder }]}>
        <Text style={styles.tipo}>📌 {tipo}</Text>
      </View>

      <View style={styles.secao}>
        <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('description')}</Text>
        <Text style={[styles.texto, { color: colors.textSecondary }]}>{descricao}</Text>
      </View>

      {endereco && (
        <View style={styles.secao}>
          <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('address')}</Text>
          <Text style={[styles.texto, { color: colors.textSecondary }]}>{endereco}</Text>
        </View>
      )}

      {/* Secção de Horários com Badge de Status de Funcionamento */}
      {horario && (
        <View style={styles.secao}>
          <View style={styles.horarioHeaderRow}>
            <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('schedule')}</Text>
            {estaAberto !== null && (
              <View style={[
                styles.statusBadge, 
                { 
                  backgroundColor: estaAberto ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                  borderColor: estaAberto ? '#28a745' : '#dc3545',
                }
              ]}>
                <Text style={{ color: estaAberto ? '#28a745' : '#dc3545', fontWeight: 'bold', fontSize: 12 }}>
                  {estaAberto ? '● Aberto Agora' : '● Fechado'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.texto, { color: colors.textSecondary }]}>{horario}</Text>
        </View>
      )}

      {/* Cartão de Acesso ao Mapa com botão "Ver no mapa" */}
      {hasValidCoords && (
        <View style={[styles.mapContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.mapFallback}>
            <Ionicons name="location" size={36} color="#4285F4" style={{ marginBottom: 8 }} />
            <Text style={[styles.mapFallbackTitle, { color: colors.textPrimary }]}>{nome}</Text>
            <Text style={[styles.mapFallbackText, { color: colors.textSecondary }]}>{endereco || 'Ver localização exata no mapa'}</Text>
            <TouchableOpacity style={styles.botaoMapaInterno} onPress={abrirNoMapa}>
              <Text style={styles.botaoMapaTexto}>📍 {t('openInMaps', 'Ver no mapa')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  carouselContainer: {
    width: CONTENT_WIDTH,
    height: 250,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  carouselImage: { width: CONTENT_WIDTH, height: 250 },
  floatingFavButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    elevation: 4,
  },
  floatingShareButton: {
    position: 'absolute',
    top: 12,
    right: 60,
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    elevation: 4,
  },
  titulo: { fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  tipo: { fontSize: 16, color: '#0066cc', fontWeight: '600' },
  infoBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  secao: { marginBottom: 15 },
  secaoTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  horarioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  texto: { fontSize: 16, lineHeight: 22 },
  mapContainer: {
    height: 200,
    width: '100%',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mapFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  mapFallbackTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  mapFallbackText: { fontSize: 14, marginBottom: 15, textAlign: 'center' },
  botaoMapaInterno: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoMapaTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  arrowButton: {
    position: 'absolute',
    top: '42%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignSelf: 'center',
    zIndex: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  activeDot: { backgroundColor: '#FFF', width: 14 },
  inactiveDot: { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
});