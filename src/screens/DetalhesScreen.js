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

const DIAS_SEMANA_LABELS = [
  { id: 'segunda', label: 'Segunda-feira' },
  { id: 'terca', label: 'Terça-feira' },
  { id: 'quarta', label: 'Quarta-feira' },
  { id: 'quinta', label: 'Quinta-feira' },
  { id: 'sexta', label: 'Sexta-feira' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' }
];

export default function DetalhesScreen({ route }) {
  const initialItem = route.params || {};
  const { id } = initialItem;
  
  const [item, setItem] = useState(initialItem);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFavorito, setIsFavorito] = useState(false);
  const flatListRef = useRef(null);
  const { t } = useTranslation();
  const { colors, isDark } = useThemeColors();

  // Busca os dados completos e atualizados diretamente na API usando a rota dinâmica
  useEffect(() => {
    async function fetchDetalhesCompletos() {
      if (!id) return;
      try {
        let rotaTipo = 'pontos-turisticos';
        const tipoAtual = initialItem.tipo;
        if (tipoAtual) {
          const tLower = tipoAtual.toLowerCase();
          if (tLower.includes('restaurante')) rotaTipo = 'restaurantes';
          else if (tLower.includes('acomodacao') || tLower.includes('hotel')) rotaTipo = 'acomodacoes';
        }

        const url = `https://turismo-api-vv62.onrender.com/api/${rotaTipo}`;
        const response = await fetch(url);
        const textResponse = await response.text();

        if (textResponse.trim().startsWith('[')) {
          const lista = JSON.parse(textResponse);
          const itemAtualizado = lista.find(el => el.id === id);
          if (itemAtualizado) {
            setItem(prev => ({ ...prev, ...itemAtualizado }));
          }
        }
      } catch (error) {
        console.log('Erro ao buscar detalhes completos da API:', error);
      }
    }
    fetchDetalhesCompletos();
  }, [id]);

  const { nome, descricao, endereco, horario, horarios, sempreAberto, imagem, imagens, tipo, latitude, longitude, coordenadas } = item;

  // Tratamento e unificação robusta das coordenadas ("lat, lng" ou campos individuais)
  let lat = latitude;
  let lng = longitude;
  if (coordenadas && typeof coordenadas === 'string' && coordenadas.includes(',')) {
    const parts = coordenadas.split(',');
    if (parts.length === 2) {
      lat = parts[0].trim();
      lng = parts[1].trim();
    }
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng);
  const imageList = Array.isArray(imagens) && imagens.length > 0 ? imagens : [imagem];

  // Verifica se está aberto utilizando o objeto completo do item
  const estaAberto = isAbertoAgora(item);

  useEffect(() => {
    async function checkFavorito() {
      if (!id) return;
      const favs = await getFavoritos();
      if (favs.includes(id)) {
        setIsFavorito(true);
      }
    }
    checkFavorito();
  }, [id]);

  const handleToggleFavorito = async () => {
    if (!id) return;
    const atualizados = await toggleFavorito(id);
    setIsFavorito(atualizados.includes(id));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Confira ${nome} no Guia Turístico! ${endereco ? 'Endereço: ' + endereco : ''}`,
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

  const abrirNoMapa = () => {
    if (!hasValidCoords) {
      Alert.alert(t('locationUnavailable', 'Localização indisponível'));
      return;
    }

    const label = encodeURIComponent(nome || 'Local');

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

  const hasHorariosObj = horarios && typeof horarios === 'object' && Object.keys(horarios).length > 0;

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
        <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('description', 'Descrição')}</Text>
        <Text style={[styles.texto, { color: colors.textSecondary }]}>{descricao}</Text>
      </View>

      {endereco && (
        <View style={styles.secao}>
          <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('address', 'Endereço')}</Text>
          <Text style={[styles.texto, { color: colors.textSecondary }]}>{endereco}</Text>
        </View>
      )}

      {/* Secção de Horários / Sempre Aberto com Badge de Status */}
      <View style={styles.secao}>
        <View style={styles.horarioHeaderRow}>
          <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('schedule', 'Horário de Funcionamento')}</Text>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: semAbertoBadgeBg(estaAberto),
              borderColor: semAbertoBadgeBorder(estaAberto),
            }
          ]}>
            <Text style={{ color: semAbertoBadgeColor(estaAberto), fontWeight: 'bold', fontSize: 12 }}>
              {sempreAberto ? '● Sempre Aberto' : (estaAberto ? '● Aberto Agora' : '● Fechado')}
            </Text>
          </View>
        </View>

        {sempreAberto ? (
          <View style={[styles.sempreAbertoBox, { backgroundColor: isDark ? '#1e1e1e' : '#f0fdf4', borderColor: '#10b981' }]}>
            <Ionicons name="time-outline" size={20} color="#10b981" />
            <Text style={[styles.sempreAbertoText, { color: colors.textPrimary }]}>
              Este local possui acesso livre a qualquer momento, sem restrição de horários.
            </Text>
          </View>
        ) : hasHorariosObj ? (
          <View style={styles.horariosListaContainer}>
            {DIAS_SEMANA_LABELS.map((dia) => {
              const info = horarios[dia.id];
              if (!info) return null;
              return (
                <View key={dia.id} style={[styles.horarioRowItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.horarioDiaLabel, { color: colors.textPrimary }]}>{dia.label}</Text>
                  <Text style={styles.horarioHorasText}>
                    {info.ativo !== false && info.abertura && info.fecho ? `${info.abertura} às ${info.fecho}` : 'Fechado'}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.texto, { color: colors.textSecondary }]}>
            {horario || 'Horário não especificado'}
          </Text>
        )}
      </View>

      {/* Cartão de Acesso ao Mapa com botão "Ver no mapa" */}
      {hasValidCoords && (
        <View style={[styles.mapContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.mapFallback}>
            <Ionicons name="location" size={36} color="#10b981" style={{ marginBottom: 8 }} />
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

// Funções auxiliares de cores atualizadas para o badge
function semAbertoBadgeBg(estaAberto) {
  return estaAberto ? 'rgba(16, 185, 129, 0.15)' : 'rgba(225, 29, 72, 0.15)';
}
function semAbertoBadgeBorder(estaAberto) {
  return estaAberto ? '#10b981' : '#e11d48';
}
function semAbertoBadgeColor(estaAberto) {
  return estaAberto ? '#10b981' : '#e11d48';
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
  tipo: { fontSize: 16, color: '#10b981', fontWeight: '600' },
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
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sempreAbertoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  sempreAbertoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  horariosListaContainer: {
    gap: 6,
    marginTop: 4,
  },
  horarioRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  horarioDiaLabel: { fontSize: 14, fontWeight: '600' },
  horarioHorasText: { fontSize: 14, color: '#10b981', fontWeight: '500' },
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
    backgroundColor: '#10b981',
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