// src/screens/DetalhesScreen.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getFavoritos, toggleFavorito } from '../utils/FavoritosHelper';
import { useThemeColors } from '../utils/ThemeContext';
import { isAbertoAgora } from '../utils/ScheduleHelper';
import api from '../services/api';

import OfflineMapCard from '../components/OfflineMapCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DIAS_SEMANA_LABELS = [
  { id: 'segunda', label: 'Segunda-feira' },
  { id: 'terca', label: 'Terça-feira' },
  { id: 'quarta', label: 'Quarta-feira' },
  { id: 'quinta', label: 'Quinta-feira' },
  { id: 'sexta', label: 'Sexta-feira' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' }
];

// Função para mascarar o telefone no padrão brasileiro
const formatarTelefoneBR = (numero) => {
  if (!numero) return '';
  const cleaned = String(numero).replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return cleaned;
};

// Função auxiliar para ícones de serviços
const getIconeServico = (tipoServico) => {
  const icones = {
    saude: 'hospital',
    seguranca: 'police-badge',
    combustivel: 'gas-station',
    mercado: 'shopping',
    automotivo: 'wrench',
    publico: 'city',
    farmacia: 'pharmacy',
    banco: 'bank',
  };
  return icones[tipoServico] || 'information';
};

export default function DetalhesScreen({ route, navigation }) {
  const initialItem = route.params || {};
  const { id } = initialItem;
  
  const [item, setItem] = useState(initialItem);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFavorito, setIsFavorito] = useState(false);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const flatListRef = useRef(null);
  const { t } = useTranslation();
  const { colors, isDark } = useThemeColors();

  useEffect(() => {
    async function fetchDetalhesCompletos() {
      if (!id) return;
      try {
        let rotaTipo = 'pontos-turisticos';
        const tipoAtual = initialItem.tipo;
        if (tipoAtual) {
          const tLower = tipoAtual.toLowerCase();
          if (tLower.includes('restaurante') || tLower.includes('gastronomia')) rotaTipo = 'restaurantes';
          else if (tLower.includes('acomodacao') || tLower.includes('hotel') || tLower.includes('hospedagem')) rotaTipo = 'acomodacoes';
          else if (tLower === 'servicos') rotaTipo = 'servicos';
        }

        const lista = await api.get(`/${rotaTipo}`);
        if (Array.isArray(lista)) {
          const itemAtualizado = lista.find(el => el.id === id);
          if (itemAtualizado) {
            setItem(prev => ({ ...prev, ...itemAtualizado }));
          }
        }
      } catch (error) {
        console.log('Erro ao buscar detalhes completos da API:', error.message);
      }
    }
    fetchDetalhesCompletos();
  }, [id]);

  const {
    nome,
    descricao,
    endereco,
    horario,
    horarios,
    sempreAberto,
    whatsapp,
    redesSociais,
    linkExterno,
    imagem,
    imagens,
    tipo,
    latitude,
    longitude,
    coordenadas,
    tipoServico,
    funcionamento24h,
    telefone
  } = item;

  const isServico = tipo?.toLowerCase() === 'servicos';
  const is24h = funcionamento24h === true || funcionamento24h === 'true' || sempreAberto === true;
  const ehSempreAberto = sempreAberto || is24h;

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

  const estaAberto = isAbertoAgora(item);

  const whatsappList = useMemo(() => {
    if (typeof whatsapp === 'string' && whatsapp.trim()) {
      return [whatsapp];
    }
    if (Array.isArray(whatsapp)) {
      return whatsapp.filter(Boolean);
    }
    return [];
  }, [whatsapp]);

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
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
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

  // ✅ NOVA FUNÇÃO: Abrir o discador do telefone
  const abrirTelefone = async (numero) => {
    if (!numero) return;
    const cleanNum = String(numero).replace(/\D/g, ''); // Remove tudo que não é número
    const url = `tel:${cleanNum}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('error', 'Erro'), 'Não foi possível abrir o discador neste dispositivo.');
      }
    } catch (err) {
      Alert.alert(t('error', 'Erro'), 'Erro ao abrir o discador.');
    }
  };

  const abrirWhatsapp = async (numero) => {
    const cleanNum = String(numero).replace(/\D/g, '');
    const url = `https://wa.me/55${cleanNum}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('error', 'Erro'), 'Não foi possível abrir o WhatsApp neste dispositivo.');
      }
    } catch (err) {
      Alert.alert(t('error', 'Erro'), 'Erro ao abrir WhatsApp.');
    }
  };

  const abrirLinkExterno = async (urlLink) => {
    if (!urlLink) return;
    let targetUrl = urlLink.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }
    try {
      await Linking.openURL(targetUrl);
    } catch (err) {
      Alert.alert(t('error', 'Erro'), 'Não foi possível abrir o link externo.');
    }
  };

  const abrirRedeSocial = async (url) => {
    if (!url) return;
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }
    try {
      await Linking.openURL(targetUrl);
    } catch (err) {
      Alert.alert(t('error', 'Erro'), 'Não foi possível abrir o link.');
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
  const hasRedesSociais = redesSociais && (redesSociais.instagram || redesSociais.facebook || redesSociais.tiktok);

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 5 }}
        scrollEnabled={!isMapInteracting}
        nestedScrollEnabled={true}
        overScrollMode="never"
        bounces={false}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
      >
        
        {/* CARROSSEL IMERSIVO NO TOPO */}
        <View style={styles.carouselContainer}>
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
                source={{ uri: imgUri || 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f' }}
                style={styles.carouselImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            )}
          />

          <TouchableOpacity style={styles.floatingBackButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.floatingActionsRow}>
            <TouchableOpacity style={styles.floatingActionButton} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatingActionButton} onPress={handleToggleFavorito} activeOpacity={0.8}>
              <Ionicons name={isFavorito ? 'heart' : 'heart-outline'} size={18} color={isFavorito ? '#ff3b30' : '#fff'} />
            </TouchableOpacity>
          </View>

          {imageList.length > 1 && activeIndex > 0 && (
            <TouchableOpacity style={[styles.arrowButton, { left: 14 }]} onPress={() => scrollToIndex(activeIndex - 1)}>
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
          {imageList.length > 1 && activeIndex < imageList.length - 1 && (
            <TouchableOpacity style={[styles.arrowButton, { right: 14 }]} onPress={() => scrollToIndex(activeIndex + 1)}>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          )}

          {imageList.length > 1 && (
            <View style={styles.paginationContainer}>
              {imageList.map((_, idx) => (
                <View key={idx} style={[styles.dot, activeIndex === idx ? styles.activeDot : styles.inactiveDot]} />
              ))}
            </View>
          )}
        </View>

        {/* PAINEL DE CONTEÚDO PRINCIPAL */}
        <View style={[styles.sheetContentContainer, { backgroundColor: colors.background }]}>
          
          <View style={styles.headerTitleRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{tipo || 'Atração'}</Text>
            </View>

            <View style={[
              styles.statusBadge, 
              { backgroundColor: semAbertoBadgeBg(ehSempreAberto), borderColor: semAbertoBadgeBorder(ehSempreAberto) }
            ]}>
              <Text style={{ color: semAbertoBadgeColor(ehSempreAberto), fontWeight: 'bold', fontSize: 11 }}>
                {ehSempreAberto ? '● Sempre Aberto' : (estaAberto ? '● Aberto Agora' : '● Fechado')}
              </Text>
            </View>
          </View>

          <Text style={[styles.titulo, { color: colors.textPrimary }]}>{nome}</Text>

          {/* Badge 24h e Tipo de Serviço (Apenas para Serviços Essenciais) */}
          {isServico && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {is24h && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc2626', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                  <Ionicons name="time" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>24 HORAS</Text>
                </View>
              )}
              {tipoServico && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#334155' : '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <MaterialCommunityIcons name={getIconeServico(tipoServico)} size={18} color={isDark ? '#94a3b8' : '#475569'} />
                  <Text style={{ color: isDark ? '#cbd5e1' : '#334155', fontSize: 14, fontWeight: '600', marginLeft: 6, textTransform: 'capitalize' }}>
                    {tipoServico}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ✅ TELEFONE FIXO CLICÁVEL (Abre o discador) */}
          {telefone && String(telefone).trim() !== '' && (
            <View style={styles.secao}>
              <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>Ligar (Telefone Fixo)</Text>
              <TouchableOpacity 
                style={[styles.infoRowLink, { borderColor: colors.border }]} 
                onPress={() => abrirTelefone(telefone)}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={18} color="#10b981" style={{ marginRight: 8 }} />
                <Text style={[styles.textoLink, { color: '#10b981', flex: 1 }]}>
                  {formatarTelefoneBR(telefone)}
                </Text>
                <Ionicons name="call" size={16} color="#10b981" />
              </TouchableOpacity>
            </View>
          )}

          {/* LINK EXTERNO / CARDÁPIO DIGITAL */}
          {linkExterno && String(linkExterno).trim() !== '' ? (
            <View style={styles.secao}>
              <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>Link Externo / Cardápio</Text>
              <TouchableOpacity 
                style={[styles.infoRowLink, { backgroundColor: isDark ? '#1e1e1e' : '#f8fafc', borderColor: colors.border }]} 
                onPress={() => abrirLinkExterno(linkExterno)}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={18} color="#10b981" style={{ marginRight: 8 }} />
                <Text style={[styles.textoLink, { color: '#10b981', flex: 1 }]} numberOfLines={1}>
                  {linkExterno}
                </Text>
                <Ionicons name="open-outline" size={16} color="#10b981" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* CONTATO WHATSAPP */}
          {whatsappList.length > 0 && (
            <View style={styles.secao}>
              <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>WhatsApp</Text>
              <View style={styles.whatsappContainer}>
                {whatsappList.map((num, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.btnWhatsapp}
                    onPress={() => abrirWhatsapp(num)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                    <Text style={styles.btnWhatsappText}>{formatarTelefoneBR(num)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* REDES SOCIAIS */}
          {hasRedesSociais && (
            <View style={styles.secao}>
              <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>Redes Sociais</Text>
              <View style={styles.redesContainer}>
                {redesSociais.instagram && (
                  <TouchableOpacity style={[styles.btnRedeSocial, { backgroundColor: '#e1306c' }]} onPress={() => abrirRedeSocial(redesSociais.instagram)} activeOpacity={0.8}>
                    <Ionicons name="logo-instagram" size={18} color="#fff" />
                    <Text style={styles.btnRedeText}>Instagram</Text>
                  </TouchableOpacity>
                )}
                {redesSociais.facebook && (
                  <TouchableOpacity style={[styles.btnRedeSocial, { backgroundColor: '#1877f2' }]} onPress={() => abrirRedeSocial(redesSociais.facebook)} activeOpacity={0.8}>
                    <Ionicons name="logo-facebook" size={18} color="#fff" />
                    <Text style={styles.btnRedeText}>Facebook</Text>
                  </TouchableOpacity>
                )}
                {redesSociais.tiktok && (
                  <TouchableOpacity style={[styles.btnRedeSocial, { backgroundColor: '#000000' }]} onPress={() => abrirRedeSocial(redesSociais.tiktok)} activeOpacity={0.8}>
                    <Ionicons name="logo-tiktok" size={18} color="#fff" />
                    <Text style={styles.btnRedeText}>TikTok</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* DESCRIÇÃO */}
          <View style={styles.secao}>
            <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('description', 'Descrição')}</Text>
            <Text style={[styles.texto, { color: colors.textSecondary }]}>{descricao}</Text>
          </View>

          {/* ENDEREÇO */}
          {endereco && (
            <View style={styles.secao}>
              <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('address', 'Endereço')}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.texto, { color: colors.textSecondary, flex: 1 }]}>{endereco}</Text>
              </View>
            </View>
          )}

          {/* HORÁRIO DE FUNCIONAMENTO */}
          <View style={styles.secao}>
            <Text style={[styles.secaoTitulo, { color: colors.textPrimary }]}>{t('schedule', 'Horário de Funcionamento')}</Text>
            
            {sempreAberto || is24h ? (
              <View style={[styles.sempreAbertoBox, { backgroundColor: isDark ? '#1e1e1e' : '#f9fafb', borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={18} color="#10b981" />
                <Text style={[styles.sempreAbertoText, { color: colors.textSecondary }]}>
                  Este local possui acesso livre a qualquer momento, sem restrição de horários.
                </Text>
              </View>
            ) : hasHorariosObj ? (
              <View style={styles.horariosListaContainer}>
                {DIAS_SEMANA_LABELS.map((dia) => {
                  const info = horarios[dia.id];
                  if (!info) return null;
                  return (
                    <View key={dia.id} style={[styles.horarioRowItem, { backgroundColor: colors.cardBackground || (isDark ? '#1e1e1e' : '#f8fafc') }]}>
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

          <OfflineMapCard
            latitude={lat}
            longitude={lng}
            nome={nome}
            endereco={endereco}
            isDark={isDark}
          />

          {/* BOTÃO MAPA */}
          {hasValidCoords && (
            <TouchableOpacity style={styles.botaoMapaEstilizado} onPress={abrirNoMapa} activeOpacity={0.85}>
              <Ionicons name="map" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.botaoMapaTexto}>📍 {t('openInMaps', 'Ver rota no mapa')}</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

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
  mainWrapper: { flex: 1 },
  carouselContainer: { width: SCREEN_WIDTH, height: 310, position: 'relative' },
  carouselImage: { width: SCREEN_WIDTH, height: 310 },
  floatingBackButton: { position: 'absolute', top: 48, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  floatingActionsRow: { position: 'absolute', top: 48, right: 20, flexDirection: 'row', gap: 10, zIndex: 10 },
  floatingActionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  arrowButton: { position: 'absolute', top: '45%', backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 18, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  paginationContainer: { position: 'absolute', bottom: 35, flexDirection: 'row', alignSelf: 'center', zIndex: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 3 },
  activeDot: { backgroundColor: '#FFF', width: 16 },
  inactiveDot: { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  sheetContentContainer: { flex: 1, marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 10 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { backgroundColor: 'rgba(0, 102, 204, 0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  typeBadgeText: { color: '#0066cc', fontSize: 12, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, lineHeight: 30 },
  secao: { marginBottom: 20 },
  secaoTitulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoRowLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  textoLink: { fontSize: 13, fontWeight: '600' },
  texto: { fontSize: 14, lineHeight: 20 },
  whatsappContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnWhatsapp: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#25D366', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 6 },
  btnWhatsappText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  redesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnRedeSocial: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 6 },
  btnRedeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  sempreAbertoBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  sempreAbertoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  horariosListaContainer: { gap: 8 },
  horarioRowItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  horarioDiaLabel: { fontSize: 13, fontWeight: '600' },
  horarioHorasText: { fontSize: 13, color: '#10b981', fontWeight: '600' },
  botaoMapaEstilizado: { backgroundColor: '#0066cc', paddingVertical: 14, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 100, elevation: 4, shadowColor: '#0066cc', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  botaoMapaTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});