
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { useCity } from '../context/CityContext';
import { CATEGORY_COLORS } from '../utils/CityTheme';
import { calcularDistancia } from '../utils/LocationHelper';
import api from '../services/api';
import LocationCard from '../components/LocationCard';

// ======================================================
// CONFIGURAÇÃO DO MAPA
// ======================================================

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const MAP_LIB_URL =
  'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';

const MAP_CSS_URL =
  'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';

const CATEGORY_ICONS = {
  turismo: '🌿',
  gastronomia: '🍽️',
  hospedagem: '🛏️',
  servicos: '🏢',
  evento: '⭐',
};

const DEFAULT_REGION = {
  latitude: -29.6419,
  longitude: -50.4503,
};

// ======================================================
// HTML DO MAPLIBRE
// ======================================================

function criarHTMLMapa(pontos, centro) {
  const pontosJSON = JSON.stringify(
    pontos.map((ponto) => ({
      id: ponto.id,
      nome: ponto.nome || ponto.titulo || 'Local',
      lat: ponto.lat,
      lng: ponto.lng,
      cor: ponto.categoriaColor || '#4CAF50',
      icone: CATEGORY_ICONS[ponto.categoriaKey] || '📍',
    }))
  ).replace(/</g, '\\u003c');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />

  <link
    href="${MAP_CSS_URL}"
    rel="stylesheet"
  />

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body, #map {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #e8edf2;
    }

    .map-pin {
      width: 38px;
      height: 38px;
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    }

    .user-pin {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #2563eb;
      border: 4px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    .maplibregl-ctrl-group {
      border-radius: 12px !important;
      overflow: hidden;
    }

    .maplibregl-ctrl-attrib {
      font-size: 9px !important;
    }

    #erro {
      display: none;
      position: absolute;
      bottom: 40px;
      left: 15px;
      right: 15px;
      background: white;
      padding: 15px;
      border-radius: 12px;
      color: #b91c1c;
      font-family: Arial;
      font-size: 13px;
      z-index: 999;
    }
  </style>
</head>

<body>

  <div id="map"></div>
  <div id="erro"></div>

  <script src="${MAP_LIB_URL}"></script>

  <script>
    const PONTOS = ${pontosJSON};

    const CENTRO = [
      ${centro.longitude},
      ${centro.latitude}
    ];

    let map;
    let userMarker = null;
    let erroEnviado = false;

    function enviarMensagem(dados) {
      if (
        window.ReactNativeWebView &&
        window.ReactNativeWebView.postMessage
      ) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify(dados)
        );
      }
    }

    function mostrarErro(mensagem) {
      console.error('[MAPLIBRE]', mensagem);

      if (!erroEnviado) {
        erroEnviado = true;

        enviarMensagem({
          type: 'mapError',
          message: String(mensagem)
        });
      }
    }

    function criarMarcadores() {
      PONTOS.forEach((ponto, index) => {
        const elemento = document.createElement('div');

        elemento.className = 'map-pin';
        elemento.style.backgroundColor = ponto.cor;
        elemento.textContent = ponto.icone;

        elemento.addEventListener('click', function(event) {
          event.stopPropagation();

          enviarMensagem({
            type: 'pointPress',
            index: index
          });
        });

        new maplibregl.Marker({
          element: elemento,
          anchor: 'bottom'
        })
          .setLngLat([ponto.lng, ponto.lat])
          .addTo(map);
      });
    }

    function atualizarLocalUsuario(latitude, longitude, centralizar) {
      if (!map) return;

      if (!userMarker) {
        const elemento = document.createElement('div');

        elemento.className = 'user-pin';

        userMarker = new maplibregl.Marker({
          element: elemento
        })
          .setLngLat([longitude, latitude])
          .addTo(map);
      } else {
        userMarker.setLngLat([longitude, latitude]);
      }

      if (centralizar) {
        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          duration: 1000
        });
      }
    }

    window.atualizarLocalUsuario = atualizarLocalUsuario;

    window.centralizarUsuario = function(latitude, longitude) {
      atualizarLocalUsuario(latitude, longitude, true);
    };

    try {
      if (!window.maplibregl) {
        throw new Error('Biblioteca MapLibre não carregada.');
      }

      map = new maplibregl.Map({
        container: 'map',
        style: '${MAP_STYLE_URL}',
        center: CENTRO,
        zoom: PONTOS.length > 0 ? 13 : 10,
        attributionControl: true
      });

      map.addControl(
        new maplibregl.NavigationControl(),
        'top-right'
      );

      map.on('load', function() {
        criarMarcadores();

        enviarMensagem({
          type: 'mapReady',
          totalPontos: PONTOS.length
        });
      });

      map.on('error', function(event) {
        const mensagem =
          event && event.error
            ? event.error.message
            : 'Erro ao carregar o mapa.';

        mostrarErro(mensagem);
      });

    } catch (error) {
      mostrarErro(error.message);
    }
  </script>

</body>
</html>
`;
}

// ======================================================
// TELA PRINCIPAL
// ======================================================

export default function SmartHomeScreen({ navigation }) {

  const { cidadeAtual, trocarCidade } = useCity();

  const webViewRef = useRef(null);

  const [pontos, setPontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // ====================================================
  // CARREGAR DADOS DA CIDADE
  // ====================================================

  useEffect(() => {

    const carregarTudo = async () => {

      if (!cidadeAtual?.slug) return;

      setLoading(true);
      setMapReady(false);
      setSelectedPoint(null);

      console.log(
        `🔍 [SMART HOME] Cidade: ${cidadeAtual.slug}`
      );

      try {

        const [
          turismo,
          restaurantes,
          acomodacoes,
          eventos,
        ] = await Promise.allSettled([

          api.get('/pontos-turisticos', cidadeAtual.slug),
          api.get('/restaurantes', cidadeAtual.slug),
          api.get('/acomodacoes', cidadeAtual.slug),
          api.get('/eventos', cidadeAtual.slug),

        ]);

        const lista = [];

        const adicionar = (res, categoriaKey, label) => {

          if (
            res.status === 'fulfilled' &&
            Array.isArray(res.value)
          ) {

            res.value.forEach((item) => {

              const lat = parseFloat(item.latitude);
              const lng = parseFloat(item.longitude);

              if (
                !isNaN(lat) &&
                !isNaN(lng) &&
                lat >= -90 &&
                lat <= 90 &&
                lng >= -180 &&
                lng <= 180
              ) {

                lista.push({
                  ...item,
                  categoriaKey,
                  categoriaLabel: label,
                  categoriaColor:
                    CATEGORY_COLORS[categoriaKey],
                  lat,
                  lng,
                });

              } else {

                console.warn(
                  'Coordenadas inválidas:',
                  item.nome
                );

              }

            });

          } else {

            console.error(
              `Falha ao carregar ${categoriaKey}:`,
              res.reason
            );

          }

        };

        adicionar(turismo, 'turismo', 'Turismo');
        adicionar(restaurantes, 'gastronomia', 'Gastronomia');
        adicionar(acomodacoes, 'hospedagem', 'Hospedagem');
        adicionar(eventos, 'evento', 'Evento');

        console.log(
          `✅ Total de pontos: ${lista.length}`
        );

        setPontos(lista);

      } catch (error) {

        console.error(
          'Erro ao carregar dados:',
          error
        );

        Alert.alert(
          'Atenção',
          'Não foi possível carregar os dados.'
        );

      } finally {

        setLoading(false);

      }

    };

    carregarTudo();

  }, [cidadeAtual?.slug]);

  // ====================================================
  // LOCALIZAÇÃO GPS
  // ====================================================

  useEffect(() => {

    let ativo = true;

    const obterLocalizacao = async () => {

      try {

        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          return;
        }

        const loc =
          await Location.getCurrentPositionAsync({});

        if (ativo) {

          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });

        }

      } catch (error) {

        console.log(
          'GPS indisponível:',
          error
        );

      }

    };

    obterLocalizacao();

    return () => {
      ativo = false;
    };

  }, []);

  // ====================================================
  // CENTRO INICIAL DO MAPA
  // ====================================================

  const centroInicial = useMemo(() => {

    if (pontos.length > 0) {

      return {
        latitude: pontos[0].lat,
        longitude: pontos[0].lng,
      };

    }

    return DEFAULT_REGION;

  }, [pontos]);

  // ====================================================
  // HTML DO MAPA
  // ====================================================

  const htmlMapa = useMemo(() => {

    return criarHTMLMapa(
      pontos,
      centroInicial
    );

  }, [pontos, centroInicial]);

  // ====================================================
  // RECEBER EVENTOS DA WEBVIEW
  // ====================================================

  const handleWebViewMessage = (event) => {

    try {

      const mensagem = JSON.parse(
        event.nativeEvent.data
      );

      switch (mensagem.type) {

        case 'mapReady':

          console.log(
            '🗺️ MapLibre carregado!',
            mensagem.totalPontos,
            'pontos'
          );

          setMapReady(true);

          if (userLocation) {

            const { latitude, longitude } = userLocation;

            webViewRef.current?.injectJavaScript(`
              window.atualizarLocalUsuario(
                ${latitude},
                ${longitude},
                false
              );
              true;
            `);

          }

          break;

        case 'pointPress':

          if (typeof mensagem.index === 'number') {

            const ponto = pontos[mensagem.index];

            if (ponto) {
              setSelectedPoint(ponto);
            }

          }

          break;

        case 'mapError':

          console.error(
            '❌ Erro no MapLibre:',
            mensagem.message
          );

          break;

        default:
          break;

      }

    } catch (error) {

      console.error(
        'Erro ao interpretar mensagem do mapa:',
        error
      );

    }

  };

  // ====================================================
  // ATUALIZAR MARCADOR GPS
  // ====================================================

  useEffect(() => {

    if (!mapReady || !userLocation) return;

    webViewRef.current?.injectJavaScript(`
      window.atualizarLocalUsuario(
        ${userLocation.latitude},
        ${userLocation.longitude},
        false
      );
      true;
    `);

  }, [userLocation, mapReady]);

  // ====================================================
  // PONTO SELECIONADO
  // ====================================================

  const selectedPointData = useMemo(() => {

    if (!selectedPoint) return null;

    let distancia = null;

    if (userLocation) {

      const d = calcularDistancia(
        userLocation.latitude,
        userLocation.longitude,
        selectedPoint.lat,
        selectedPoint.lng
      );

      if (d) {

        const num = parseFloat(d);

        distancia =
          num < 1
            ? `${Math.round(num * 1000)} m`
            : `${num.toFixed(1)} km`;

      }

    }

    return {
      ...selectedPoint,
      distancia,
    };

  }, [selectedPoint, userLocation]);

  // ====================================================
  // TROCAR CIDADE
  // ====================================================

  const handleTrocarCidade = () => {

    setSelectedPoint(null);
    setMapReady(false);

    trocarCidade();

  };

  // ====================================================
  // CENTRALIZAR NO USUÁRIO
  // ====================================================

  const voltarParaMim = () => {

    if (!userLocation) {

      Alert.alert(
        'Localização',
        'Não foi possível obter sua localização atual.'
      );

      return;

    }

    if (!mapReady) return;

    webViewRef.current?.injectJavaScript(`
      window.centralizarUsuario(
        ${userLocation.latitude},
        ${userLocation.longitude}
      );
      true;
    `);

  };

  // ====================================================
  // CARREGAMENTO DOS DADOS
  // ====================================================

  if (loading) {

    return (

      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              cidadeAtual?.corPrimaria || '#4CAF50',
          },
        ]}
      >

        <ActivityIndicator
          size="large"
          color="#fff"
        />

        <Text style={styles.loadingText}>
          Preparando mapa de {cidadeAtual?.nome}...
        </Text>

      </View>

    );

  }

  // ====================================================
  // INTERFACE
  // ====================================================

  return (

    <View style={styles.container}>

      {/* 1. MAPA MAPLIBRE */}

      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{
          html: htmlMapa,
        }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        onMessage={handleWebViewMessage}
        onError={(event) => {

          console.error(
            'Erro na WebView:',
            event.nativeEvent
          );

        }}
        onHttpError={(event) => {

          console.error(
            'Erro HTTP na WebView:',
            event.nativeEvent.statusCode,
            event.nativeEvent.url
          );

        }}
        onRenderProcessGone={() => {

          console.error(
            'Processo de renderização do mapa encerrado.'
          );

          setMapReady(false);

        }}
        androidLayerType="hardware"
        mixedContentMode="never"
      />

      {/* 2. CARD DE EXPLORAÇÃO */}

      {pontos.length === 0 && (

        <View
          style={styles.emptyStateOverlay}
          pointerEvents="box-none"
        >

          <View
            style={styles.emptyStateCard}
            pointerEvents="auto"
          >

            <View style={styles.emptyIconContainer}>

              <Ionicons
                name="map-outline"
                size={40}
                color="#4CAF50"
              />

            </View>

            <Text style={styles.emptyStateTitle}>
              Exploração em andamento
            </Text>

            <Text style={styles.emptyStateText}>
              Ainda não há pontos turísticos cadastrados
              para {cidadeAtual?.nome}.
              {'\n'}
              Volte em breve para descobrir novos lugares!
            </Text>

          </View>

        </View>

      )}

      {/* 3. BOTÃO MEU LOCAL */}

      <TouchableOpacity
        style={styles.fabButton}
        onPress={voltarParaMim}
        activeOpacity={0.8}
      >

        <Ionicons
          name="locate"
          size={22}
          color="#fff"
        />

      </TouchableOpacity>

      {/* 4. HEADER DA CIDADE */}

      <View style={styles.header}>

        <View style={styles.headerCard}>

          <View
            style={[
              styles.headerDot,
              {
                backgroundColor:
                  cidadeAtual?.corPrimaria || '#4CAF50',
              },
            ]}
          />

          <View style={styles.headerTextContainer}>

            <Text
              style={styles.headerCity}
              numberOfLines={1}
            >
              {cidadeAtual?.nome}
            </Text>

            <Text
              style={styles.headerCount}
              numberOfLines={1}
            >
              {pontos.length > 0
                ? `${pontos.length} lugares`
                : 'Em breve'}
            </Text>

          </View>

          <TouchableOpacity
            style={styles.swapButton}
            onPress={handleTrocarCidade}
            activeOpacity={0.7}
          >

            <Ionicons
              name="swap-horizontal"
              size={16}
              color="#64748b"
            />

            <Text style={styles.swapButtonText}>
              Trocar
            </Text>

          </TouchableOpacity>

        </View>

      </View>

      {/* 5. CARD DE DETALHES */}

      <LocationCard
        item={selectedPointData}
        isVisible={!!selectedPoint}
        onClose={() => setSelectedPoint(null)}
        onSeeDetails={() => {

          if (!selectedPoint) return;

          navigation.navigate('Detalhes', {

            id: selectedPoint.id,

            nome:
              selectedPoint.nome ||
              selectedPoint.titulo,

            descricao: selectedPoint.descricao,
            endereco: selectedPoint.endereco,

            imagem:
              selectedPoint.imagem ||
              selectedPoint.imagens?.[0],

            imagens: selectedPoint.imagens,

            tipo: selectedPoint.categoriaLabel,

            latitude: selectedPoint.lat,
            longitude: selectedPoint.lng,

            whatsapp: selectedPoint.whatsapp,
            telefone: selectedPoint.telefone,

            horarios: selectedPoint.horarios,

            sempreAberto:
              selectedPoint.sempreAberto,

          });

        }}
      />

    </View>

  );

}

// ======================================================
// ESTILOS
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#e8edf2',
  },

  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e8edf2',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 14,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // CARD DE EXPLORAÇÃO

  emptyStateOverlay: {
    position: 'absolute',
    top: 100,
    bottom: 0,
    left: 0,
    right: 0,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: 'transparent',

    zIndex: 50,

    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  emptyStateCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,

    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 12,
  },

  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
  },

  emptyStateText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },

  // BOTÃO MEU LOCAL

  fabButton: {
    position: 'absolute',
    right: 16,
    bottom: 110,

    width: 50,
    height: 50,
    borderRadius: 25,

    backgroundColor: '#0B2D6B',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#0B2D6B',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 8,
    zIndex: 90,
  },

  // HEADER

  header: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
  },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: 'rgba(255, 255, 255, 0.95)',

    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },

  headerCity: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },

  headerCount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,

    backgroundColor: '#f1f5f9',

    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  swapButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },

});
