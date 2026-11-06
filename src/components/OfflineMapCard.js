import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DEVIATION_THRESHOLD = 20; 

export default function OfflineMapCard({ latitude, longitude, nome, endereco, isDark, onMapInteractionChange }) {
  const webViewRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [geojsonRuasLocal, setGeojsonRuasLocal] = useState(null);
  const [savedRouteCoords, setSavedRouteCoords] = useState(null);
  const [isOnRoute, setIsOnRoute] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  
  const locationSubscription = useRef(null);
  const headingSubscription = useRef(null); 
  const currentHeading = useRef(0); 

  const destLat = Number(latitude);
  const destLon = Number(longitude);
  const hasValidCoords = Number.isFinite(destLat) && Number.isFinite(destLon) && Math.abs(destLat) <= 90 && Math.abs(destLon) <= 180;
  
  const ROUTE_STORAGE_KEY = `rota_salva_${nome?.replace(/\s+/g, '_')}_${destLat}_${destLon}`;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function carregarRuasLocais() {
      try {
        const filePath = `${FileSystem.documentDirectory}cached_roads.geojson`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          setGeojsonRuasLocal(JSON.parse(content));
        }
      } catch (e) {
        console.log('⚠️ Erro ao ler ruas em cache:', e);
      }
    }
    carregarRuasLocais();
  }, []);

  useEffect(() => {
    async function carregarRotaSalva() {
      try {
        const saved = await AsyncStorage.getItem(ROUTE_STORAGE_KEY);
        if (saved) {
          setSavedRouteCoords(JSON.parse(saved));
        }
      } catch (e) {
        console.log('⚠️ Erro ao ler rota salva:', e);
      }
    }
    carregarRotaSalva();
  }, [ROUTE_STORAGE_KEY]);

  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
    };
  }, []);

  const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

  const distanceToSegment = useCallback((pointLat, pointLon, segStartLat, segStartLon, segEndLat, segEndLon) => {
    const R = 6371e3;
    const φ1 = segStartLat * Math.PI / 180;
    const φ2 = segEndLat * Math.PI / 180;
    const Δφ = (segEndLat - segStartLat) * Math.PI / 180;
    const Δλ = (segEndLon - segStartLon) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const segLength = R * c;

    if (segLength === 0) {
      const distLat = (pointLat - segStartLat) * Math.PI / 180;
      const distLon = (pointLon - segStartLon) * Math.PI / 180;
      const distA = Math.sin(distLat / 2) * Math.sin(distLat / 2) +
                    Math.cos(segStartLat * Math.PI / 180) * Math.cos(pointLat * Math.PI / 180) *
                    Math.sin(distLon / 2) * Math.sin(distLon / 2);
      const distC = 2 * Math.atan2(Math.sqrt(distA), Math.sqrt(1 - distA));
      return R * distC;
    }

    const t = ((pointLat - segStartLat) * (segEndLat - segStartLat) +
               (pointLon - segStartLon) * (segEndLon - segStartLon)) / (segLength * segLength);
    
    const clampedT = Math.max(0, Math.min(1, t));
    const projLat = segStartLat + clampedT * (segEndLat - segStartLat);
    const projLon = segStartLon + clampedT * (segEndLon - segStartLon);

    const distLat = (pointLat - projLat) * Math.PI / 180;
    const distLon = (pointLon - projLon) * Math.PI / 180;
    const distA = Math.sin(distLat / 2) * Math.sin(distLat / 2) +
                  Math.cos(projLat * Math.PI / 180) * Math.cos(pointLat * Math.PI / 180) *
                  Math.sin(distLon / 2) * Math.sin(distLon / 2);
    const distC = 2 * Math.atan2(Math.sqrt(distA), Math.sqrt(1 - distA));
    
    return R * distC;
  }, []);

  const checkDeviation = useCallback((userLat, userLon, routeCoords) => {
    if (!routeCoords || routeCoords.length < 2) return true;
    let minDistance = Infinity;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const segStartLon = routeCoords[i][0];
      const segStartLat = routeCoords[i][1];
      const segEndLon = routeCoords[i + 1][0];
      const segEndLat = routeCoords[i + 1][1];

      const dist = distanceToSegment(userLat, userLon, segStartLat, segStartLon, segEndLat, segEndLon);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    return minDistance <= DEVIATION_THRESHOLD;
  }, [distanceToSegment]);

  const iniciarRastreamento = useCallback(async (rotaCoordinates) => {
    if (locationSubscription.current) locationSubscription.current.remove();
    if (headingSubscription.current) headingSubscription.current.remove();

    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (location) => {
          if (!location.coords.latitude || !location.coords.longitude) return;

          const userCoords = { 
            latitude: location.coords.latitude, 
            longitude: location.coords.longitude 
          };
          setUserLocation(userCoords);

          if (rotaCoordinates && rotaCoordinates.length > 0) {
            const estaNaRota = checkDeviation(userCoords.latitude, userCoords.longitude, rotaCoordinates);
            if (!estaNaRota && isOnRoute) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setIsOnRoute(false);
            } else if (estaNaRota && !isOnRoute) {
              setIsOnRoute(true);
            }
          }

          if (webViewRef.current && mapReady) {
            const script = `
              if (typeof window.atualizarPosicaoUsuario === 'function') {
                window.atualizarPosicaoUsuario(${userCoords.latitude}, ${userCoords.longitude}, ${currentHeading.current});
              }
              true;
            `;
            webViewRef.current.injectJavaScript(script);
          }
        }
      );

      headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
        currentHeading.current = headingData.trueHeading || 0; 
        
        if (webViewRef.current && mapReady) {
          const script = `
            if (typeof window.atualizarDirecaoUsuario === 'function') {
              window.atualizarDirecaoUsuario(${currentHeading.current});
            }
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }
      });

      setIsTracking(true);
    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      setMapError('Erro ao iniciar rastreamento GPS.');
    }
  }, [mapReady, checkDeviation, isOnRoute]);

  const obterLocalizacaoEDesenharRota = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMapError('Permissão de localização negada.');
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!location.coords.latitude || !location.coords.longitude) {
        setMapError('Coordenadas inválidas obtidas do GPS.');
        setLoadingLocation(false);
        return;
      }

      const userCoords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setUserLocation(userCoords);

      let rotaCoordinates = null;

      if (!isOffline) {
        try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${userCoords.longitude},${userCoords.latitude};${destLon},${destLat}?overview=full&geometries=geojson`);
          const data = await response.json();
          if (data.code === 'Ok' && data.routes.length > 0) {
            rotaCoordinates = data.routes[0].geometry.coordinates;
            await AsyncStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(rotaCoordinates));
            setSavedRouteCoords(rotaCoordinates);
          }
        } catch (err) {
          console.log('Falha na rota online, tentando usar salva ou fallback.');
        }
      }
      
      if (!rotaCoordinates && savedRouteCoords) {
        rotaCoordinates = savedRouteCoords;
      }

      await iniciarRastreamento(rotaCoordinates);

      if (webViewRef.current && mapReady) {
        const script = `
          if (typeof window.calcularExibirRota === 'function') {
            window.calcularExibirRota(
              ${userCoords.latitude}, 
              ${userCoords.longitude}, 
              ${destLat}, 
              ${destLon}, 
              ${isOffline},
              ${safeJson(rotaCoordinates)}
            );
          }
          true;
        `;
        webViewRef.current.injectJavaScript(script);
      }
    } catch (error) {
      setMapError('Erro ao obter GPS. Verifique se está ativado.');
    } finally {
      setLoadingLocation(false);
    }
  }, [destLat, destLon, isOffline, savedRouteCoords, ROUTE_STORAGE_KEY, mapReady, iniciarRastreamento]);

  const mapHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #e5e7eb; }
        .destination-marker { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }
        
        .user-marker-container {
          width: 80px;
          height: 80px;
          position: relative;
          overflow: visible;
          pointer-events: none;
        }
        
        /* REMOVIDO: transition para resposta instantânea */
        .beam-rotator {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transform-origin: 40px 40px;
          will-change: transform;
          pointer-events: none;
        }

        .flashlight-beam {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 35px;
          clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
          background: linear-gradient(to top, rgba(0, 122, 255, 0.5) 0%, rgba(0, 122, 255, 0.0) 100%);
        }

        .user-marker {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #007AFF;
          border: 2.5px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }

        .maplibregl-ctrl-logo, .maplibregl-ctrl-attrib { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
      <script>
        const destino = { lat: ${destLat}, lon: ${destLon} };
        const nomeDestino = ${safeJson(nome || 'Local')};
        const ruasCache = ${safeJson(geojsonRuasLocal || { type: 'FeatureCollection', features: [] })};
        let map, markerUsuario;
        let beamRotatorElement = null;
        let currentRotation = 0; // NOVO: Guarda a rotação atual para interpolação suave

        function postMessage(tipo, msg) {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ tipo, msg }));
        }

        // NOVO: Função para calcular o ângulo mais curto entre dois ângulos
        function getShortestAngle(from, to) {
          let diff = to - from;
          // Normaliza para o intervalo [-180, 180]
          while (diff > 180) diff -= 360;
          while (diff < -180) diff += 360;
          return from + diff;
        }

        try {
          map = new maplibregl.Map({
            container: 'map',
            style: '${MAP_STYLE}',
            center: [destino.lon, destino.lat],
            zoom: 14.5,
            attributionControl: false
          });

          const elDest = document.createElement('div');
          elDest.className = 'destination-marker';
          elDest.textContent = '📍';
          new maplibregl.Marker({ element: elDest, anchor: 'bottom' })
            .setLngLat([destino.lon, destino.lat])
            .setPopup(new maplibregl.Popup({ offset: 20 }).setText(nomeDestino))
            .addTo(map);

          if (ruasCache.features.length > 0) {
            map.on('load', () => {
              map.addSource('ruas-offline', { type: 'geojson', data: ruasCache });
              map.addLayer({ id: 'camada-ruas', type: 'line', source: 'ruas-offline', paint: { 'line-color': '#94a3b8', 'line-width': 1.5, 'line-opacity': 0.7 } });
            });
          }

          map.on('load', () => postMessage('pronto'));
          map.on('error', (e) => postMessage('erro', e.error?.message));

          map.getContainer().addEventListener('touchstart', () => postMessage('mapTouchStart'), { passive: true });
          map.getContainer().addEventListener('touchend', () => postMessage('mapTouchEnd'), { passive: true });
          map.getContainer().addEventListener('touchcancel', () => postMessage('mapTouchEnd'), { passive: true });

          window.atualizarPosicaoUsuario = function(userLat, userLon, userHeading) {
            if (!userLat || !userLon || isNaN(userLat) || isNaN(userLon)) return;

            if (markerUsuario) {
              markerUsuario.setLngLat([userLon, userLat]);
              if (beamRotatorElement) {
                currentRotation = userHeading;
                beamRotatorElement.style.transform = \`rotate(\${userHeading}deg)\`;
              }
            } else {
              const elContainer = document.createElement('div');
              elContainer.className = 'user-marker-container';
              
              const elBeamRotator = document.createElement('div');
              elBeamRotator.className = 'beam-rotator';
              
              const elBeam = document.createElement('div');
              elBeam.className = 'flashlight-beam';
              elBeamRotator.appendChild(elBeam);
              
              const elUser = document.createElement('div');
              elUser.className = 'user-marker';
              
              elContainer.appendChild(elBeamRotator);
              elContainer.appendChild(elUser);
              
              beamRotatorElement = elBeamRotator;

              markerUsuario = new maplibregl.Marker({ element: elContainer, anchor: 'center' })
                .setLngLat([userLon, userLat])
                .addTo(map);
                
              currentRotation = userHeading;
              beamRotatorElement.style.transform = \`rotate(\${userHeading}deg)\`;
            }
          };

          // NOVO: Função otimizada com requestAnimationFrame para suavidade
          let animationFrameId = null;
          let targetRotation = 0;

          window.atualizarDirecaoUsuario = function(userHeading) {
            targetRotation = userHeading;
            
            // Cancela animação anterior se existir
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
            }

            // Função de animação suave
            function animate() {
              if (!beamRotatorElement) return;

              // Calcula o ângulo mais curto (evita rotações de 360° desnecessárias)
              const shortestAngle = getShortestAngle(currentRotation, targetRotation);
              
              // Interpola suavemente (lerp)
              const interpolationSpeed = 0.2; // Ajuste este valor: 0.1 = mais lento, 0.5 = mais rápido
              currentRotation += (shortestAngle - currentRotation) * interpolationSpeed;
              
              // Aplica a rotação
              beamRotatorElement.style.transform = \`rotate(\${currentRotation}deg)\`;
              
              // Continua animando se ainda não chegou no alvo
              if (Math.abs(shortestAngle - currentRotation) > 0.5) {
                animationFrameId = requestAnimationFrame(animate);
              }
            }

            animationFrameId = requestAnimationFrame(animate);
          };

          window.calcularExibirRota = async function(userLat, userLon, destLat, destLon, isOfflineMode, savedRoute) {
            let finalRouteCoords = savedRoute;

            if (!finalRouteCoords) {
              finalRouteCoords = [[userLon, userLat], [destLon, destLat]];
            }

            window.atualizarPosicaoUsuario(userLat, userLon, 0);

            const linhaGeoJson = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: finalRouteCoords } };
            
            if (map.getSource('rota-source')) {
              map.getSource('rota-source').setData(linhaGeoJson);
            } else {
              map.addSource('rota-source', { type: 'geojson', data: linhaGeoJson });
              map.addLayer({
                id: 'rota-layer',
                type: 'line',
                source: 'rota-source',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 
                  'line-color': '#0066cc', 
                  'line-width': 6, 
                  'line-dasharray': isOfflineMode && !savedRoute ? [2, 2] : [1, 0]
                }
              });
            }

            const bounds = new maplibregl.LngLatBounds();
            finalRouteCoords.forEach(c => bounds.extend(c));
            map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
            
            postMessage('rota', isOfflineMode ? (savedRoute ? 'offline_salva' : 'offline_reta') : 'online');
          };
        } catch (error) {
          postMessage('erro', error.message);
        }
      </script>
    </body>
    </html>
  `;

  const receberMensagem = (event) => {
    try {
      const dados = JSON.parse(event.nativeEvent.data);
      if (dados.tipo === 'pronto') { setMapReady(true); setMapError(null); }
      if (dados.tipo === 'erro') setMapError(dados.msg);
      
      if (dados.tipo === 'mapTouchStart' && onMapInteractionChange) {
        onMapInteractionChange(true);
      }
      if (dados.tipo === 'mapTouchEnd' && onMapInteractionChange) {
        onMapInteractionChange(false);
      }
    } catch (error) { /* ignora */ }
  };

  if (!hasValidCoords) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
        <Text style={{ color: isDark ? '#fff' : '#333', textAlign: 'center' }}>Localização indisponível.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#111827' }]}>Mapa e Localização</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            {isOffline && savedRouteCoords 
              ? '📴 Modo Offline: Rota salva carregada da memória' 
              : isOffline 
                ? '⚠️ Modo Offline: Rota aproximada em linha reta' 
                : '📡 Online: Rota real calculada e salva'}
          </Text>
        </View>
      </View>

      <View style={styles.subHeaderRow}>
        <TouchableOpacity style={styles.locationButtonFull} onPress={obterLocalizacaoEDesenharRota} disabled={loadingLocation}>
          {loadingLocation ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.buttonContentRow}>
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.locationButtonText}>
                {savedRouteCoords && isOffline ? 'Retomar Rota Salva' : 'Traçar Rota até o Local'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrapper}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled={true} 
          setSupportMultipleWindows={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onMessage={receberMensagem}
          onError={() => setMapError('Erro ao carregar o mapa.')}
        />
        {!mapReady && !mapError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>Carregando mapa...</Text>
          </View>
        )}
      </View>

      <View style={styles.destinationInfo}>
        <Ionicons name="location" size={20} color="#0066cc" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.destinationName, { color: isDark ? '#fff' : '#111827' }]}>{nome || 'Local turístico'}</Text>
          {!!endereco && <Text style={[styles.destinationAddress, { color: isDark ? '#9ca3af' : '#6b7280' }]}>{endereco}</Text>}
        </View>
      </View>

      {mapError && <Text style={styles.errorText}>⚠️ {mapError}</Text>}
      
      {userLocation && !mapError && (
        <View style={styles.statusContainer}>
          {isTracking && savedRouteCoords ? (
            isOnRoute ? (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={[styles.statusText, { color: '#10b981' }]}>
                  ✓ Você está no caminho
                </Text>
              </View>
            ) : (
              <View style={styles.statusRow}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text style={[styles.statusText, { color: '#f59e0b' }]}>
                  ⚠️ Você saiu da rota. Volte para a linha azul.
                </Text>
              </View>
            )
          ) : (
            <Text style={[styles.waitingText, { color: '#10b981' }]}>
              ✓ Localização obtida. Siga a linha azul no mapa.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: 20, padding: 16, marginVertical: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subHeaderRow: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 12, marginTop: 4 },
  locationButtonFull: { backgroundColor: '#0066cc', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonContentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  mapWrapper: { width: '100%', height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: '#e5e7eb' },
  map: { width: '100%', height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: '#374151', fontSize: 13 },
  destinationInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  destinationName: { fontSize: 14, fontWeight: 'bold' },
  destinationAddress: { fontSize: 13, marginTop: 4 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 8, textAlign: 'center' },
  statusContainer: { marginTop: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  waitingText: { fontSize: 12, textAlign: 'center', fontWeight: '600' },
});