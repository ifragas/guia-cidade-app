import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  garantirBiblioteca, bibliotecaDisponivel, criarPacoteOffline,
  carregarPacote, removerPacote, chavePacote, montarLotes
} from '../utils/MapTileCache';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DEVIATION_THRESHOLD = 20;
const TIMEOUT_HTML = 9000;
const TIMEOUT_MAPA = 20000;

const MIN_MOVEMENT_METERS = 3;
const MAX_MOVEMENT_INTERVAL_MS = 15000;

const LOG = '[MAPA-OFFLINE][RN]';
const log = (...a) => console.log(LOG, ...a);
const logErro = (...a) => console.error(LOG, ...a);

export default function OfflineMapCard({
  latitude, longitude, nome, endereco, isDark, onMapInteractionChange
}) {
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
  const [biblioteca, setBiblioteca] = useState(null);
  const [pacotePronto, setPacotePronto] = useState(false);
  const [pacoteVerificado, setPacoteVerificado] = useState(false);
  const [mapaOfflineAtivo, setMapaOfflineAtivo] = useState(false);
  const [download, setDownload] = useState(null);
  const [geracao, setGeracao] = useState(0);

  const locationSubscription = useRef(null);
  const headingSubscription = useRef(null);
  const currentHeading = useRef(0);
  const isOnRouteRef = useRef(true);
  const pacoteRef = useRef(null);
  const rotaPendenteRef = useRef(null);
  const ultimaPosRef = useRef(null);
  const timersRef = useRef([]);
  const htmlProntoRef = useRef(false);
  const watchdogHtmlRef = useRef(null);
  const watchdogMapaRef = useRef(null);

  const posAnteriorRef = useRef(null);
  const timestampAnteriorRef = useRef(0);
  const bearingCalculadoRef = useRef(0);

  const destLat = Number(latitude);
  const destLon = Number(longitude);
  const hasValidCoords =
    Number.isFinite(destLat) && Number.isFinite(destLon) &&
    Math.abs(destLat) <= 90 && Math.abs(destLon) <= 180;

  const ROUTE_STORAGE_KEY = `rota_salva_${nome?.replace(/\s+/g, '_')}_${destLat}_${destLon}`;
  const CHAVE_MAPA = useMemo(() => chavePacote(nome, destLat, destLon), [nome, destLat, destLon]);
  const corFundo = '#e9e5dd'; 

  const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

  const limparTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const limparWatchdogs = useCallback(() => {
    if (watchdogHtmlRef.current) { clearTimeout(watchdogHtmlRef.current); watchdogHtmlRef.current = null; }
    if (watchdogMapaRef.current) { clearTimeout(watchdogMapaRef.current); watchdogMapaRef.current = null; }
  }, []);

  const pacoteCobreRota = useCallback((pkg, coords) => {
    if (!pkg || pkg.stats?.completo !== true || !pkg.bbox) return false;
    if (!Array.isArray(coords) || coords.length < 2) return false;
    const b = pkg.bbox;
    return coords.every(([lon, lat]) =>
      Number.isFinite(lon) && Number.isFinite(lat) &&
      lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat
    );
  }, []);

  useEffect(() => {
    const aplicar = (state) => {
      const offline = state.isConnected === false || (state.isInternetReachable === false);
      log('Conexão:', { connected: state.isConnected, reachable: state.isInternetReachable, tipo: state.type, offline });
      setIsOffline(offline);
    };
    const off = NetInfo.addEventListener(aplicar);
    NetInfo.fetch().then(aplicar).catch(() => {});
    return () => off();
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lib = await garantirBiblioteca();
        if (vivo) {
          setBiblioteca(lib);
          log('Biblioteca pronta:', { js: lib.js.length, pako: lib.pako?.length || 0 });
        }
      } catch (error) {
        logErro('Falha na biblioteca:', error.message);
        const tem = await bibliotecaDisponivel();
        if (!tem && vivo) setMapError('Conecte-se à internet uma vez para preparar o motor do mapa.');
      }
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = `${FileSystem.documentDirectory}cached_roads.geojson`;
        const info = await FileSystem.getInfoAsync(p);
        if (info.exists) {
          const ruas = JSON.parse(await FileSystem.readAsStringAsync(p));
          setGeojsonRuasLocal(ruas);
        }
      } catch (e) { /* opcional */ }
    })();
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const txt = await AsyncStorage.getItem(ROUTE_STORAGE_KEY);
        if (txt && vivo) {
          const coords = JSON.parse(txt);
          setSavedRouteCoords(coords);
          log('Rota salva:', coords.length, 'pontos');
        }
      } catch (e) { logErro('Erro lendo rota salva:', e.message); }
    })();
    return () => { vivo = false; };
  }, [ROUTE_STORAGE_KEY]);

  const verificarPacote = useCallback(async () => {
    setPacoteVerificado(false);
    const pkg = await carregarPacote(CHAVE_MAPA);
    pacoteRef.current = pkg;
    setPacotePronto(Boolean(pkg));
    setPacoteVerificado(true);
    log('Verificação do pacote concluída:', { ok: Boolean(pkg) });
    return pkg;
  }, [CHAVE_MAPA]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setPacoteVerificado(false);
      setPacotePronto(false);
      const pkg = await carregarPacote(CHAVE_MAPA);
      if (!vivo) return;
      pacoteRef.current = pkg;
      setPacotePronto(Boolean(pkg));
      setPacoteVerificado(true);
      log('Verificação do pacote concluída:', { ok: Boolean(pkg) });
    })();
    return () => { vivo = false; };
  }, [CHAVE_MAPA]);

  useEffect(() => () => {
    limparTimers();
    limparWatchdogs();
    if (locationSubscription.current) locationSubscription.current.remove();
    if (headingSubscription.current) headingSubscription.current.remove();
  }, [limparTimers, limparWatchdogs]);

  const iniciarMapaNoWebView = useCallback(() => {
    if (!webViewRef.current) { logErro('WebView indisponível.'); return; }
    if (isOffline && !pacoteVerificado) { log('Aguardando verificação do pacote.'); return; }

    limparTimers();

    const pkg = pacoteRef.current;
    const usarOffline = Boolean(isOffline && pkg && pkg.stats?.completo === true);
    const lotes = usarOffline ? montarLotes(pkg) : [];
    const styleArg = usarOffline ? JSON.stringify(pkg.style) : 'null';

    log('Boot do mapa:', { isOffline, usarOffline, lotes: lotes.length });

    lotes.forEach((script, i) => {
      timersRef.current.push(setTimeout(() => {
        webViewRef.current?.injectJavaScript(script);
      }, i * 50));
    });

    timersRef.current.push(setTimeout(() => {
      log('Chamando __iniciarMapa.');
      webViewRef.current?.injectJavaScript(
        'window.__iniciarMapa(' + styleArg + ',' + (usarOffline ? 'true' : 'false') + ');true;'
      );
    }, lotes.length * 50 + 90));

    if (watchdogMapaRef.current) clearTimeout(watchdogMapaRef.current);
    watchdogMapaRef.current = setTimeout(() => {
      logErro('Watchdog: mapa não ficou pronto a tempo.');
      setMapReady((pronto) => {
        if (!pronto) {
          setMapError(usarOffline
            ? 'O mapa salvo não pôde ser montado. Use "Rebaixar mapa offline" com internet.'
            : 'Não foi possível carregar o mapa. Verifique a conexão.');
        }
        return pronto;
      });
    }, TIMEOUT_MAPA + lotes.length * 50);
  }, [isOffline, pacoteVerificado, limparTimers]);

  useEffect(() => {
    if (pacoteVerificado && htmlProntoRef.current && !mapReady) iniciarMapaNoWebView();
  }, [pacoteVerificado, mapReady, iniciarMapaNoWebView]);

  const reaplicarRotaPendente = useCallback(() => {
    const p = rotaPendenteRef.current;
    if (!p || !webViewRef.current) return;
    log('Reaplicando rota:', { offline: p.offline, pontos: p.coords?.length || 0 });

    webViewRef.current.injectJavaScript(
      'if(typeof window.calcularExibirRota==="function"){' +
      'window.calcularExibirRota(' + p.userLat + ',' + p.userLon + ',' +
      destLat + ',' + destLon + ',' + p.offline + ',' + safeJson(p.coords) + ');}' +
      'true;'
    );

    const u = ultimaPosRef.current;
    if (u) {
      webViewRef.current.injectJavaScript(
        'if(typeof window.atualizarPosicaoUsuario==="function"){' +
        'window.atualizarPosicaoUsuario(' + u.latitude + ',' + u.longitude + ',' + currentHeading.current + ', 15);}' +
        'true;'
      );
    }
  }, [destLat, destLon]);

  const distanceToSegment = useCallback((pLat, pLon, aLat, aLon, bLat, bLon) => {
    const latMedia = (aLat + bLat + pLat) / 3;
    const cosLat = Math.cos((latMedia * Math.PI) / 180);
    
    const px = pLon * cosLat * 111320;
    const py = pLat * 111320;
    const ax = aLon * cosLat * 111320;
    const ay = aLat * 111320;
    const bx = bLon * cosLat * 111320;
    const by = bLat * 111320;

    const dx = bx - ax;
    const dy = by - ay;
    const segLenSq = dx * dx + dy * dy;

    if (segLenSq < 0.001) {
      const ddx = px - ax;
      const ddy = py - ay;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }

    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / segLenSq));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    const ddx = px - projX;
    const ddy = py - projY;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }, []);

  const checkDeviation = useCallback((uLat, uLon, coords) => {
    if (!coords || coords.length < 2) return true;
    let min = Infinity;
    for (let i = 0; i < coords.length - 1; i++) {
      const d = distanceToSegment(uLat, uLon, coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
      if (d < min) min = d;
    }
    return min <= DEVIATION_THRESHOLD;
  }, [distanceToSegment]);

  const calcularBearing = useCallback((lat1, lon1, lat2, lon2) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const dLambda = toRad(lon2 - lon1);
    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
    const theta = Math.atan2(y, x);
    return (toDeg(theta) + 360) % 360;
  }, []);

  const distanciaEntrePontos = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const f1 = (lat1 * Math.PI) / 180;
    const f2 = (lat2 * Math.PI) / 180;
    const df = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const iniciarRastreamento = useCallback(async (rotaCoordinates) => {
    if (locationSubscription.current) locationSubscription.current.remove();
    if (headingSubscription.current) headingSubscription.current.remove();

    posAnteriorRef.current = null;
    timestampAnteriorRef.current = 0;

    try {
      // ✅ CORREÇÃO FLUIDEZ: timeInterval baixo e distanceInterval 0 para updates constantes baseados em tempo
      locationSubscription.current = await Location.watchPositionAsync(
        { 
          accuracy: Location.Accuracy.High,
          timeInterval: 200,    
          distanceInterval: 0   
        },
        (location) => {
          const lat = location.coords.latitude;
          const lon = location.coords.longitude;
          
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          if (location.coords.accuracy > 40) {
            log('GPS impreciso, ignorando leitura:', location.coords.accuracy, 'm');
            return;
          }

          const agora = Date.now();
          let headingParaUsar = currentHeading.current;

          const anterior = posAnteriorRef.current;
          if (anterior) {
            const dist = distanciaEntrePontos(anterior.lat, anterior.lon, lat, lon);
            const tempoDecorr = agora - timestampAnteriorRef.current;

            if (dist >= MIN_MOVEMENT_METERS && tempoDecorr <= MAX_MOVEMENT_INTERVAL_MS && tempoDecorr > 0) {
              const bearingNovo = calcularBearing(anterior.lat, anterior.lon, lat, lon);
              const anteriorBearing = bearingCalculadoRef.current;
              let diff = bearingNovo - anteriorBearing;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              const suavizado = (anteriorBearing + diff * 0.5 + 360) % 360;
              bearingCalculadoRef.current = suavizado;
              headingParaUsar = suavizado;
            }
          }

          posAnteriorRef.current = { lat, lon };
          timestampAnteriorRef.current = agora;

          const usuario = { latitude: lat, longitude: lon };
          ultimaPosRef.current = usuario;
          setUserLocation(usuario);

          if (rotaCoordinates && rotaCoordinates.length > 0) {
            const thresholdDinamico = Math.max(DEVIATION_THRESHOLD, location.coords.accuracy * 1.5);
            let minDist = Infinity;
            for (let i = 0; i < rotaCoordinates.length - 1; i++) {
              const d = distanceToSegment(lat, lon, rotaCoordinates[i][1], rotaCoordinates[i][0], rotaCoordinates[i + 1][1], rotaCoordinates[i + 1][0]);
              if (d < minDist) minDist = d;
            }
            const dentroDinamico = minDist <= thresholdDinamico;

            if (!dentroDinamico && isOnRouteRef.current) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              isOnRouteRef.current = false;
              setIsOnRoute(false);
            } else if (dentroDinamico && !isOnRouteRef.current) {
              isOnRouteRef.current = true;
              setIsOnRoute(true);
            }
          }

          webViewRef.current?.injectJavaScript(
            'if(typeof window.atualizarPosicaoUsuario==="function"){' +
            'window.atualizarPosicaoUsuario(' + lat + ',' + lon + ',' + headingParaUsar + ',' + location.coords.accuracy + ');}' +
            'true;'
          );
        }
      );

      headingSubscription.current = await Location.watchHeadingAsync((h) => {
        currentHeading.current = h.trueHeading || 0;
        const agora = Date.now();
        const anterior = posAnteriorRef.current;
        let parado = true;
        if (anterior && timestampAnteriorRef.current > 0) {
          const tempoDecorr = agora - timestampAnteriorRef.current;
          if (tempoDecorr < MAX_MOVEMENT_INTERVAL_MS) {
            parado = false;
          }
        }
        // ✅ Envia heading da bússola quando parado para girar a lanterna
        if (parado) {
          webViewRef.current?.injectJavaScript(
            'if(typeof window.atualizarDirecaoUsuario==="function"){' +
            'window.atualizarDirecaoUsuario(' + currentHeading.current + ');}' +
            'true;'
          );
        }
      });

      setIsTracking(true);
    } catch (error) {
      logErro('Erro no rastreamento:', error.message);
      setMapError('Erro ao iniciar rastreamento GPS.');
    }
  }, [checkDeviation, distanceToSegment, calcularBearing, distanciaEntrePontos]);

  const baixarMapaOffline = useCallback(async (rotaCoords, { forcar = false } = {}) => {
    if (isOffline) {
      Alert.alert('Sem internet', 'Conecte-se ao Wi-Fi para baixar o mapa desta região.');
      return false;
    }

    const coords = (Array.isArray(rotaCoords) && rotaCoords.length > 1) ? rotaCoords : [[destLon, destLat]];
    if (forcar) await removerPacote(CHAVE_MAPA);

    setDownload({ fase: 'tiles', pct: 0, detalhe: 'Preparando...' });
    try {
      const pkg = await criarPacoteOffline({
        rotaCoords: coords, destLat, destLon, chave: CHAVE_MAPA, corFundo,
        onProgress: (p) => setDownload(p)
      });
      setDownload(null);

      if (pkg?.stats?.completo !== true) {
        pacoteRef.current = null;
        setPacotePronto(false);
        setPacoteVerificado(true);
        Alert.alert('Mapa offline incompleto', `Tiles: ${pkg?.stats?.tiles || 0}/${pkg?.stats?.totalTiles || 0}\nMotivo: ${pkg?.stats?.motivoIncompleto || 'desconhecido'}`);
        return false;
      }

      await verificarPacote();
      htmlProntoRef.current = false;
      limparWatchdogs();
      setMapReady(false);
      setMapaOfflineAtivo(false);
      setMapError(null);
      setGeracao((g) => g + 1);

      Alert.alert('Mapa offline pronto', 'A região foi salva e já pode ser usada sem internet.');
      return true;
    } catch (error) {
      setDownload(null);
      logErro('Erro no download:', error.message);
      Alert.alert('Erro ao baixar mapa', error.message || 'Tente novamente com Wi-Fi.');
      return false;
    }
  }, [isOffline, destLat, destLon, CHAVE_MAPA, corFundo, limparWatchdogs, verificarPacote]);

  const confirmarRebaixar = useCallback(() => {
    Alert.alert('Rebaixar mapa offline', 'O pacote atual será substituído por um novo download desta região. Use Wi-Fi.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rebaixar', onPress: () => baixarMapaOffline(savedRouteCoords, { forcar: true }) }
    ]);
  }, [baixarMapaOffline, savedRouteCoords]);

  const obterLocalizacaoEDesenharRota = useCallback(async () => {
    setLoadingLocation(true);
    setMapError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setMapError('Permissão de localização negada.'); return; }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Coordenadas inválidas do GPS.');

      const usuario = { latitude: lat, longitude: lon };
      ultimaPosRef.current = usuario;
      setUserLocation(usuario);

      let rotaCoordinates = null;
      let recemBaixada = false;

      if (!isOffline) {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${lon},${lat};${destLon},${destLat}?overview=full&geometries=geojson`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`OSRM HTTP ${r.status}`);
          const data = await r.json();
          if (data.code === 'Ok' && data.routes?.length > 0) {
            rotaCoordinates = data.routes[0].geometry.coordinates;
            await AsyncStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(rotaCoordinates));
            setSavedRouteCoords(rotaCoordinates);
            recemBaixada = true;
          }
        } catch (error) { logErro('Falha OSRM:', error.message); }
      }

      if (!rotaCoordinates && savedRouteCoords) rotaCoordinates = savedRouteCoords;

      rotaPendenteRef.current = { userLat: lat, userLon: lon, offline: isOffline, coords: rotaCoordinates };

      await iniciarRastreamento(rotaCoordinates);
      reaplicarRotaPendente();

      if (recemBaixada && rotaCoordinates) {
        if (!pacoteCobreRota(pacoteRef.current, rotaCoordinates)) {
          await baixarMapaOffline(rotaCoordinates);
        }
      }

      if (isOffline && !rotaCoordinates) {
        Alert.alert('Rota indisponível', 'Conecte-se à internet para traçar e salvar a rota antes de usar offline.');
      }
    } catch (error) {
      logErro('Erro ao traçar rota:', error.message);
      setMapError(error.message || 'Erro ao obter GPS.');
    } finally {
      setLoadingLocation(false);
    }
  }, [destLat, destLon, isOffline, savedRouteCoords, ROUTE_STORAGE_KEY, iniciarRastreamento, reaplicarRotaPendente, pacoteCobreRota, baixarMapaOffline]);

  const mapHtml = useMemo(() => {
    if (!biblioteca) return null;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>${biblioteca.css}</style>
<style>
*{box-sizing:border-box}
html,body,#map{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:${corFundo}}
.destination-marker{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))}
.user-marker-container{width:80px;height:80px;position:relative;overflow:visible;pointer-events:none}
.beam-rotator{position:absolute;top:0;left:0;width:100%;height:100%;transform-origin:40px 40px;will-change:transform;pointer-events:none}
.flashlight-beam{position:absolute;top:0;left:50%;transform:translateX(-50%);width:28px;height:35px;clip-path:polygon(50% 100%,0% 0%,100% 0%);background:linear-gradient(to top,rgba(0,122,255,.5) 0%,rgba(0,122,255,0) 100%)}
.user-marker{width:18px;height:18px;border-radius:50%;background:#007AFF;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2}
.maplibregl-ctrl-logo{display:none!important}
.osm-attrib{position:absolute;bottom:8px;right:8px;z-index:1000;background:rgba(255,255,255,0.85);padding:4px 8px;border-radius:4px;font:11px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#333;box-shadow:0 1px 3px rgba(0,0,0,0.2);max-width:280px;text-align:right;pointer-events:auto;}
.osm-attrib a{color:#0066cc;text-decoration:none;}
.osm-attrib a:hover{text-decoration:underline;}
</style>
</head>
<body>
<div id="map"></div>
<div class="osm-attrib">© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors<br/>Tiles © <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a></div>
<script>${biblioteca.pako || ''}</script>
<script>${biblioteca.js}</script>
<script>
var destino={lat:${destLat},lon:${destLon}};
var nomeDestino=${safeJson(nome || 'Local')};
var ruasCache=${safeJson(geojsonRuasLocal || { type: 'FeatureCollection', features: [] })};
var offlineAgora=${isOffline ? 'true' : 'false'};
var corFundo='${corFundo}';
var styleOnline='${MAP_STYLE}';

window.__TILES={};
window.__GLYPHS={};
window.__TILES_RAW={};
window.__protocolosOfflineRegistrados=false;

var map=null,markerUsuario=null,beamRotatorElement=null;
var currentRotation=0,targetRotation=0,animationFrameId=null;
var rotaAtual=null,mapaPronto=false,modoAtual='online';
var contadorTiles=0,tilesAusentes=[],errosMapa=[],inspecoes=[];
var tilesRenderizados=0;
var ultimaAcuracia=15;
var ultimoPosUsuario=null;

var animState = {
  currentLat: 0, currentLon: 0,
  targetLat: 0, targetLon: 0,
  currentRot: 0, targetRot: 0,
  isAnimating: false,
  accuracy: 15
};

function postMessage(tipo,msg){
  try{if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({tipo:tipo,msg:msg}));}}catch(e){}
}
function logDiag(m,d){postMessage('diag',{mensagem:m,dados:d||null});}
function logErro(m,d){postMessage('diagErro',{mensagem:m,dados:d||null});}

window.addEventListener('error',function(ev){
  logErro('ERRO JS GLOBAL.',{mensagem:ev.message||null,linha:ev.lineno||null});
});
window.addEventListener('unhandledrejection',function(ev){
  logErro('PROMISE REJEITADA.',{motivo:String((ev.reason&&ev.reason.message)||ev.reason)});
});

function base64ParaBytes(b64){
  var bin=atob(b64);
  var bytes=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++){bytes[i]=bin.charCodeAt(i);}
  return bytes;
}

function hexPrimeiros(bytes,n){
  var out=[];
  for(var i=0;i<Math.min(n,bytes.length);i++){
    var h=bytes[i].toString(16);
    out.push(h.length<2?'0'+h:h);
  }
  return out.join(' ');
}

function inspecionarMVT(bytes){
  var p=0,camadas=[];
  function varint(){var r=0,s=0,c;do{c=bytes[p++];r|=(c&0x7f)<<s;s+=7;}while((c&0x80)&&p<bytes.length);return r>>>0;}
  try{
    while(p<bytes.length&&camadas.length<40){
      var tag=varint(),field=tag>>>3,wt=tag&7;
      if(wt===0){varint();continue;}
      if(wt===5){p+=4;continue;}
      if(wt===1){p+=8;continue;}
      if(wt!==2){break;}
      var len=varint();
      if(field===3){
        var end=p+len,nome=null,feats=0,extent=null;
        while(p<end){
          var t2=varint(),f2=t2>>>3,w2=t2&7;
          if(w2===2){
            var l2=varint();
            if(f2===1){var s='';for(var i=0;i<l2;i++){s+=String.fromCharCode(bytes[p+i]);}nome=s;}
            else if(f2===2){feats++;}
            p+=l2;
          } else if(w2===0){var v=varint();if(f2===5){extent=v;}}
          else if(w2===5){p+=4;}
          else if(w2===1){p+=8;}
          else {p=end;}
        }
        p=end;
        camadas.push({nome:nome,features:feats,extent:extent});
      } else {p+=len;}
    }
  }catch(e){return {erro:e.message,camadas:camadas};}
  return {camadas:camadas};
}

function prepararTile(chave,b64){
  if(window.__TILES_RAW[chave]){return window.__TILES_RAW[chave];}
  var bytes=base64ParaBytes(b64);
  var gz=bytes.length>2&&bytes[0]===0x1f&&bytes[1]===0x8b;
  var saida=bytes;
  if(gz&&typeof pako!=='undefined'&&pako.inflate){
    try{saida=pako.inflate(bytes);}catch(e){logErro('Falha ao inflar tile.',{chave:chave,erro:e.message});}
  }
  if(inspecoes.length<3){
    var insp=inspecionarMVT(saida);
    inspecoes.push(1);
    logDiag('INSPEÇÃO DE TILE.',{chave:chave,bytes:saida.length,gzipado:gz,hex:hexPrimeiros(saida,16),camadas:insp.camadas,erroParse:insp.erro||null});
  }
  var buffer=saida.buffer.slice(saida.byteOffset,saida.byteOffset+saida.byteLength);
  window.__TILES_RAW[chave]=buffer;
  return buffer;
}

window.__addTiles=function(o){for(var k in o){window.__TILES[k]=o[k];}return true;};
window.__addGlyphs=function(o){for(var k in o){window.__GLYPHS[k]=o[k];}return true;};
window.__setSprite=function(){return true;};

function chaveSemQuery(url,prefixo){
  var s=url.substring(prefixo.length);
  var q=s.indexOf('?');
  if(q>-1){s=s.substring(0,q);}
  if(s.length>4&&s.substring(s.length-4)==='.pbf'){s=s.substring(0,s.length-4);}
  return s;
}

function registrarProtocolosOffline() {
  if (window.__protocolosOfflineRegistrados) return;
  if (typeof maplibregl.addProtocol !== 'function') throw new Error('maplibregl.addProtocol indisponível.');
  const isV4Plus = maplibregl.version && parseInt(maplibregl.version.split('.')[0]) >= 4;

  maplibregl.addProtocol('offline', function(params, callback) {
    var chave = chaveSemQuery(params.url, 'offline://');
    contadorTiles++;
    var b64 = window.__TILES[chave];
    if (!b64) {
      if (tilesAusentes.length < 40) tilesAusentes.push(chave);
      var emptyData = new ArrayBuffer(0);
      return isV4Plus ? Promise.resolve({ data: emptyData }) : (callback(null, emptyData, null, null), undefined);
    }
    try {
      var data = prepararTile(chave, b64);
      var clonedData = data.slice(0);
      if (contadorTiles <= 4) logDiag('Tile offline servido.', { chave: chave, bytes: clonedData.byteLength });
      return isV4Plus ? Promise.resolve({ data: clonedData }) : (callback(null, clonedData, null, null), undefined);
    } catch (e) {
      logErro('Erro ao preparar tile.', { chave: chave, erro: e.message });
      var errData = new ArrayBuffer(0);
      return isV4Plus ? Promise.resolve({ data: errData }) : (callback(null, errData, null, null), undefined);
    }
  });

  maplibregl.addProtocol('offline-glyphs', function(params, callback) {
    var chave;
    try { chave = decodeURIComponent(chaveSemQuery(params.url, 'offline-glyphs://')); }
    catch(e) { chave = chaveSemQuery(params.url, 'offline-glyphs://'); }
    var b64 = window.__GLYPHS[chave];
    if (!b64) {
      var emptyGlyph = new ArrayBuffer(0);
      return isV4Plus ? Promise.resolve({ data: emptyGlyph }) : (callback(null, emptyGlyph, null, null), undefined);
    }
    try {
      var bytes = base64ParaBytes(b64);
      var glyphData;
      if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b && typeof pako !== 'undefined') {
        var inf = pako.inflate(bytes);
        glyphData = inf.buffer.slice(inf.byteOffset, inf.byteOffset + inf.byteLength);
      } else {
        glyphData = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      }
      var clonedGlyph = glyphData.slice(0);
      return isV4Plus ? Promise.resolve({ data: clonedGlyph }) : (callback(null, clonedGlyph, null, null), undefined);
    } catch (e) {
      var errGlyph = new ArrayBuffer(0);
      return isV4Plus ? Promise.resolve({ data: errGlyph }) : (callback(null, errGlyph, null, null), undefined);
    }
  });

  window.__protocolosOfflineRegistrados = true;
  logDiag('Protocolos offline registrados.', { versao: maplibregl.version || 'desconhecida', modo: isV4Plus ? 'v4+' : 'v3', pako: (typeof pako !== 'undefined') });
}

function blindarStyle(estilo){
  if(!estilo||typeof estilo!=='object') return estilo;
  var s=JSON.parse(JSON.stringify(estilo));
  if(s.sprite) delete s.sprite;
  var fontesOk={};
  for(var nome in (s.sources||{})){
    var src=s.sources[nome];
    if(src&&src.type==='vector'){
      src.tiles=['offline://{z}/{x}/{y}'];
      delete src.url;
      fontesOk[nome]=true;
    }
  }
  s.layers=(s.layers||[]).filter(function(l){
    if(!l||!l.type) return false;
    if(l.type==='background') return true;
    if(!fontesOk[l.source]) return false;
    if(l.type==='symbol'){
      if(!s.glyphs||!l.layout) return false;
      for(var k in l.layout){if(k.indexOf('icon-')===0) delete l.layout[k];}
      if(!l.layout['text-field']) return false;
      if(l.paint){for(var p in l.paint){if(p.indexOf('icon-')===0) delete l.paint[p];}}
    }
    return true;
  });
  return s;
}

function getShortestAngle(from,to){
  var d=to-from;while(d>180){d-=360;}while(d<-180){d+=360;}return from+d;
}

function aplicarRuas(){
  try{
    if(!ruasCache.features||!ruasCache.features.length) return;
    if(map.getSource('ruas-offline')) return;
    map.addSource('ruas-offline',{type:'geojson',data:ruasCache});
    map.addLayer({id:'camada-ruas',type:'line',source:'ruas-offline',paint:{'line-color':'#94a3b8','line-width':1.5,'line-opacity':0.7}});
  }catch(e){logErro('Erro ao adicionar ruas.',e.message);}
}

function reaplicarRota(){
  try{
    if(!rotaAtual) return;
    var gj={type:'Feature',properties:{},geometry:{type:'LineString',coordinates:rotaAtual.coords}};
    if(map.getSource('rota-source')){map.getSource('rota-source').setData(gj);return;}
    map.addSource('rota-source',{type:'geojson',data:gj});
    map.addLayer({id:'rota-layer',type:'line',source:'rota-source',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#0066cc','line-width':6,'line-dasharray':rotaAtual.tracejada?[2,2]:[1,0]}});
    logDiag('Rota desenhada.',{pontos:rotaAtual.coords.length});
  }catch(e){logErro('Erro ao desenhar rota.',e.message);}
}

function garantirCamadaPrecisao(){
  try{
    if(!map.getSource('precisao-source')){
      map.addSource('precisao-source',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    }
    if(!map.getLayer('precisao-fill')){
      map.addLayer({
        id:'precisao-fill',type:'circle',source:'precisao-source',
        paint:{
          'circle-radius':['interpolate',['linear'],['zoom'],10,3,14,12,16,40,18,120],
          'circle-color':'#007AFF','circle-opacity':0.12,'circle-stroke-color':'#007AFF','circle-stroke-opacity':0.35,'circle-stroke-width':1
        }
      });
    }
  }catch(e){logErro('Erro camada precisão.',e.message);}
}

function atualizarCirculoPrecisao(lat,lon,acuracia){
  try{
    garantirCamadaPrecisao();
    var src=map.getSource('precisao-source');
    if(!src) return;
    src.setData({type:'FeatureCollection',features:[{type:'Feature',properties:{acuracia:acuracia||15},geometry:{type:'Point',coordinates:[lon,lat]}}]});
  }catch(e){logErro('Erro atualizar círculo.',e.message);}
}

function marcarPronto(origem){
  if(mapaPronto) return;
  mapaPronto=true;
  logDiag('Mapa liberado.',{origem:origem,modo:modoAtual,tilesRenderizados:tilesRenderizados});
  aplicarRuas();
  reaplicarRota();
  garantirCamadaPrecisao();
  try{map.resize();map.triggerRepaint();}catch(e){}
  postMessage('pronto',modoAtual==='offline'?'offline':'online');
}

function nudgesDeRender(){
  var n=0;
  var iv=setInterval(function(){
    n++;
    if(!map){clearInterval(iv);return;}
    try{map.resize();map.triggerRepaint();}catch(e){}
    if(n>=12){clearInterval(iv);}
  },700);
}

function diagnosticoPeriodico(attempt){
  setTimeout(function(){
    if(!map) return;
    var info={tentativa:attempt,mapaPronto:mapaPronto,styleLoaded:false,tilesLoaded:false,tilesServidos:contadorTiles,tilesAusentes:tilesAusentes.length,zoom:null,featuresRenderizadas:null,camadasNoStyle:null,erros:errosMapa.length,tilesRenderizados:tilesRenderizados};
    try{info.styleLoaded=map.isStyleLoaded();}catch(e){}
    try{info.tilesLoaded=map.areTilesLoaded();}catch(e){}
    try{info.zoom=Number(map.getZoom().toFixed(2));}catch(e){}
    try{info.camadasNoStyle=map.getStyle().layers.length;}catch(e){}
    try{info.featuresRenderizadas=map.queryRenderedFeatures().length;}catch(e){}
    logDiag('Diagnóstico periódico.',info);
    if(attempt<3) diagnosticoPeriodico(attempt+1);
  },attempt*2200);
}

window.__iniciarMapa=function(styleOffline,usarOffline){
  try{
    logDiag('Inicializando MapLibre.',{offlineAgora:offlineAgora,usarOffline:usarOffline,tiles:Object.keys(window.__TILES).length,pako:(typeof pako!=='undefined')});
    if(map){
      try{map.remove();}catch(e){}
      map=null;markerUsuario=null;beamRotatorElement=null;mapaPronto=false;
      tilesRenderizados=0;ultimoPosUsuario=null;
    }
    registrarProtocolosOffline();
    var estilo;
    if(usarOffline&&styleOffline){estilo=blindarStyle(styleOffline);modoAtual='offline';}
    else if(offlineAgora){estilo={version:8,sources:{},layers:[{id:'base',type:'background',paint:{'background-color':corFundo}}]};modoAtual='online';}
    else{estilo=styleOnline;modoAtual='online';}
    logDiag('Estilo escolhido.',{modo:modoAtual,camadas:(estilo.layers||[]).length,fontes:Object.keys(estilo.sources||{})});
    map=new maplibregl.Map({container:'map',style:estilo,center:[destino.lon,destino.lat],zoom:14.5,maxZoom:17,attributionControl:false,fadeDuration:0});
    var elDest=document.createElement('div');
    elDest.className='destination-marker';
    elDest.textContent='📍';
    new maplibregl.Marker({element:elDest,anchor:'bottom'}).setLngLat([destino.lon,destino.lat]).setPopup(new maplibregl.Popup({offset:20}).setText(nomeDestino)).addTo(map);
    map.on('data', function(ev) {
      if (ev.sourceId && ev.isSourceLoaded && ev.sourceDataType === 'content') {
        tilesRenderizados++;
        logDiag('Tile renderizado.', { sourceId: ev.sourceId, total: tilesRenderizados });
      }
    });
    map.on('style.load',function(){logDiag('Evento STYLE.LOAD.');if (!usarOffline || tilesRenderizados > 0) { marcarPronto('style.load'); } else { logDiag('Aguardando tiles offline...'); }});
    map.on('load',function(){logDiag('Evento LOAD.',{tiles:contadorTiles});if (!usarOffline || tilesRenderizados > 0) { marcarPronto('load'); }});
    map.on('idle',function(){if (!usarOffline || tilesRenderizados > 0) { marcarPronto('idle'); } else { logDiag('Idle sem tiles, aguardando...'); }});
    map.on('sourcedata',function(ev){if(ev.sourceId&&ev.isSourceLoaded&&ev.sourceDataType==='content'){logDiag('Source carregada.',{sourceId:ev.sourceId});}});
    map.on('error',function(ev){var m=(ev&&ev.error&&ev.error.message)?ev.error.message:'Erro desconhecido';if(errosMapa.length<30){errosMapa.push(m);}if(errosMapa.length<=6){logErro('Erro MapLibre.',{mensagem:m,sourceId:ev.sourceId||null});}});
    setTimeout(function(){if(mapaPronto)return;var ok=false;try{ok=Boolean(map.getStyle());}catch(e){}if(ok){logDiag('Fallback ativado após timeout.', { tilesRenderizados });marcarPronto('fallback');}},2500);
    nudgesDeRender();
    diagnosticoPeriodico(1);
    var c=map.getContainer();
    c.addEventListener('touchstart',function(){postMessage('mapTouchStart');},{passive:true});
    c.addEventListener('touchend',function(){postMessage('mapTouchEnd');},{passive:true});
    c.addEventListener('touchcancel',function(){postMessage('mapTouchEnd');},{passive:true});
  }catch(error){
    logErro('Falha ao iniciar mapa.',{mensagem:error.message});
    postMessage('erro','Falha ao iniciar o mapa: '+error.message);
  }
  return true;
};

window.atualizarPosicaoUsuario = function(newLat, newLon, newHeading, accuracy) {
  if (!map || !mapaPronto) return;
  if (!Number.isFinite(newLat) || !Number.isFinite(newLon)) return;

  animState.targetLat = newLat;
  animState.targetLon = newLon;
  animState.targetRot = newHeading;
  animState.accuracy = (typeof accuracy === 'number' && accuracy > 0) ? accuracy : 15;
  ultimoPosUsuario = { lat: newLat, lon: newLon };

  if (animState.currentLat === 0 && animState.currentLon === 0) {
    animState.currentLat = newLat;
    animState.currentLon = newLon;
    animState.currentRot = newHeading;
  }

  if (!markerUsuario) {
    var box = document.createElement('div');
    box.className = 'user-marker-container';
    var rot = document.createElement('div');
    rot.className = 'beam-rotator';
    var beam = document.createElement('div');
    beam.className = 'flashlight-beam';
    rot.appendChild(beam);
    var dot = document.createElement('div');
    dot.className = 'user-marker';
    box.appendChild(rot);
    box.appendChild(dot);
    beamRotatorElement = rot;
    markerUsuario = new maplibregl.Marker({ element: box, anchor: 'center' })
      .setLngLat([animState.currentLon, animState.currentLat])
      .addTo(map);
    currentRotation = newHeading;
    rot.style.transform = 'rotate(' + newHeading + 'deg)';
    atualizarCirculoPrecisao(animState.currentLat, animState.currentLon, animState.accuracy);
  }

  if (!animState.isAnimating) {
    animState.isAnimating = true;
    requestAnimationFrame(smoothAnimate);
  }
};

// ✅ NOVO: Atualiza a rotação quando parado (via bússola)
window.atualizarDirecaoUsuario = function(newHeading) {
  if (!map || !mapaPronto) return;
  animState.targetRot = newHeading;
  if (!animState.isAnimating) {
    animState.isAnimating = true;
    requestAnimationFrame(smoothAnimate);
  }
};

function smoothAnimate() {
  if (!map || !mapaPronto || !markerUsuario) {
    animState.isAnimating = false;
    return;
  }

  // ✅ FATORES AJUSTADOS: 0.5 dá resposta rápida sem ser "teleporte", 0.2 suaviza a rotação
  var posFactor = 0.5;  
  var rotFactor = 0.2; 

  var dLat = animState.targetLat - animState.currentLat;
  var dLon = animState.targetLon - animState.currentLon;

  if (Math.abs(dLat) < 0.000005 && Math.abs(dLon) < 0.000005) {
    animState.currentLat = animState.targetLat;
    animState.currentLon = animState.targetLon;
  } else {
    animState.currentLat += dLat * posFactor;
    animState.currentLon += dLon * posFactor;
  }

  var diff = animState.targetRot - animState.currentRot;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  animState.currentRot += diff * rotFactor;

  markerUsuario.setLngLat([animState.currentLon, animState.currentLat]);
  
  if (beamRotatorElement) {
    beamRotatorElement.style.transform = 'rotate(' + animState.currentRot + 'deg)';
  }
  
  atualizarCirculoPrecisao(animState.currentLat, animState.currentLon, animState.accuracy);

  if (Math.abs(dLat) > 0.000005 || Math.abs(dLon) > 0.000005 || Math.abs(diff) > 0.5) {
    requestAnimationFrame(smoothAnimate);
  } else {
    animState.isAnimating = false;
  }
}

window.calcularExibirRota = function(userLat, userLon, dLat, dLon, offlineMode, savedRoute) {
  if (!map || !mapaPronto) { logErro('Rota antes do mapa pronto.'); return false; }
  var coords = (Array.isArray(savedRoute) && savedRoute.length > 1) ? savedRoute : [[userLon, userLat], [dLon, dLat]];
  rotaAtual = { coords: coords, tracejada: Boolean(offlineMode && (!savedRoute || savedRoute.length < 2)) };
  
  animState.currentLat = userLat;
  animState.currentLon = userLon;
  animState.targetLat = userLat;
  animState.targetLon = userLon;
  animState.targetRot = 0;
  animState.currentRot = 0;
  
  window.atualizarPosicaoUsuario(userLat, userLon, 0, 15);
  reaplicarRota();
  try {
    var b = new maplibregl.LngLatBounds();
    coords.forEach(function(p) { b.extend(p); });
    map.fitBounds(b, { padding: 60, maxZoom: 15, duration: 800 });
  } catch(e) { logErro('Erro no fitBounds.', e.message); }
  postMessage('rota', offlineMode ? ((savedRoute && savedRoute.length > 1) ? 'offline_salva' : 'offline_reta') : 'online');
  return true;
};

logDiag('HTML do mapa carregado.');
postMessage('htmlPronto');
</script>
</body>
</html>`;
  }, [biblioteca, isOffline, corFundo, destLat, destLon, nome, geojsonRuasLocal]);

  const webviewSource = useMemo(() => {
    if (!mapHtml) return null;
    if (isOffline && !pacoteVerificado) return null;
    return { html: mapHtml };
  }, [mapHtml, isOffline, pacoteVerificado]);

  useEffect(() => {
    if (!webviewSource) return;
    htmlProntoRef.current = false;
    if (watchdogHtmlRef.current) clearTimeout(watchdogHtmlRef.current);
    watchdogHtmlRef.current = setTimeout(() => {
      if (!htmlProntoRef.current) {
        logErro('Watchdog: HTML não sinalizou prontidão.');
        setMapError('O motor do mapa não iniciou. Toque em tentar novamente.');
      }
    }, TIMEOUT_HTML);
    return () => { if (watchdogHtmlRef.current) clearTimeout(watchdogHtmlRef.current); };
  }, [webviewSource, geracao]);

  const receberMensagem = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.tipo === 'diag') { log('[WV]', data.msg?.mensagem, data.msg?.dados || ''); return; }
      if (data.tipo === 'diagErro') { logErro('[WV]', data.msg?.mensagem, data.msg?.dados || ''); return; }
      if (data.tipo === 'htmlPronto') {
        htmlProntoRef.current = true;
        if (watchdogHtmlRef.current) { clearTimeout(watchdogHtmlRef.current); watchdogHtmlRef.current = null; }
        iniciarMapaNoWebView();
        return;
      }
      if (data.tipo === 'pronto') {
        log('Mapa pronto:', data.msg);
        if (watchdogMapaRef.current) { clearTimeout(watchdogMapaRef.current); watchdogMapaRef.current = null; }
        setMapReady(true);
        setMapError(null);
        setMapaOfflineAtivo(data.msg === 'offline');
        setTimeout(reaplicarRotaPendente, 160);
        return;
      }
      if (data.tipo === 'erro') { logErro('Erro do WebView:', data.msg); setMapError(data.msg); return; }
      if (data.tipo === 'rota') { log('Rota:', data.msg); return; }
      if (data.tipo === 'mapTouchStart' && onMapInteractionChange) { onMapInteractionChange(true); return; }
      if (data.tipo === 'mapTouchEnd' && onMapInteractionChange) { onMapInteractionChange(false); }
    } catch (error) {
      logErro('Mensagem inválida:', error.message);
    }
  }, [iniciarMapaNoWebView, reaplicarRotaPendente, onMapInteractionChange]);

  const recriarWebView = useCallback(() => {
    log('Recriando WebView.');
    htmlProntoRef.current = false;
    limparWatchdogs();
    setMapReady(false);
    setMapaOfflineAtivo(false);
    setMapError(null);
    setGeracao((g) => g + 1);
  }, [limparWatchdogs]);

  const rotaOfflineDisponivel = pacotePronto && pacoteCobreRota(pacoteRef.current, savedRouteCoords);
  const baixando = Boolean(download);

  if (!hasValidCoords) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
        <Text style={{ color: isDark ? '#fff' : '#333', textAlign: 'center' }}>Localização indisponível.</Text>
      </View>
    );
  }

  const subtitulo = download
    ? `⬇️ Baixando mapa offline — ${download.pct}%`
    : mapaOfflineAtivo
      ? '🗺️ Mapa offline carregado'
      : isOffline && rotaOfflineDisponivel
        ? '📴 Rota e mapa salvos para uso offline'
        : isOffline && pacotePronto
          ? '⚠️ Pacote salvo não cobre a rota atual'
          : isOffline && savedRouteCoords
            ? '📴 Rota salva — mapa offline não baixado'
            : isOffline
              ? '⚠️ Offline: sem mapa e rota disponíveis'
              : rotaOfflineDisponivel
                ? '📡 Rota e mapa salvos para uso offline'
                : pacotePronto
                  ? '📡 Pacote de mapa encontrado'
                  : '📡 Baixe o mapa para usar sem internet';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#111827' }]}>Mapa e Localização</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>{subtitulo}</Text>
        </View>
        {rotaOfflineDisponivel && (
          <View style={styles.seloPronto}>
            <Ionicons name="cloud-done" size={16} color="#047857" />
          </View>
        )}
      </View>

      {!!download && (
        <View style={styles.progressoBox}>
          <View style={styles.progressoTrilha}>
            <View style={[styles.progressoBarra, { width: `${download.pct}%` }]} />
          </View>
          <Text style={styles.progressoTexto}>{download.detalhe}</Text>
        </View>
      )}

      <View style={styles.subHeaderRow}>
        <TouchableOpacity
          style={[styles.locationButtonFull, (loadingLocation || !mapReady) && { opacity: 0.75 }]}
          onPress={obterLocalizacaoEDesenharRota}
          disabled={loadingLocation || !mapReady}
        >
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

      {!isOffline && !baixando && (
        <TouchableOpacity
          style={[styles.botaoBaixar, pacotePronto && styles.botaoBaixarNeutro]}
          onPress={pacotePronto ? confirmarRebaixar : () => baixarMapaOffline(savedRouteCoords)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={pacotePronto ? 'refresh-circle-outline' : 'cloud-download-outline'}
            size={16}
            color={pacotePronto ? '#475569' : '#0f766e'}
          />
          <Text style={[styles.botaoBaixarTexto, pacotePronto && { color: '#475569' }]}>
            {pacotePronto ? 'Rebaixar mapa offline' : 'Baixar mapa desta região para uso offline'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.mapWrapper}>
        {webviewSource ? (
          <WebView
            key={`mapa-${geracao}`}
            ref={webViewRef}
            source={webviewSource}
            style={styles.map}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            nestedScrollEnabled
            setSupportMultipleWindows={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onMessage={receberMensagem}
            onLoadEnd={() => log('Documento carregado.')}
            onError={(e) => {
              const d = e.nativeEvent?.description || 'Erro ao carregar o mapa.';
              logErro('Erro nativo WebView:', d);
              setMapError(d);
            }}
            onRenderProcessGone={recriarWebView}
            onContentProcessDidTerminate={recriarWebView}
          />
        ) : null}

        {!mapReady && !mapError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>
              {!biblioteca
                ? 'Preparando motor do mapa...'
                : isOffline && !pacoteVerificado
                  ? 'Verificando mapa salvo...'
                  : pacotePronto
                    ? 'Montando mapa offline...'
                    : 'Carregando mapa...'}
            </Text>
          </View>
        )}

        {!!mapError && (
          <View style={styles.erroOverlay}>
            <Ionicons name="alert-circle-outline" size={30} color="#e11d48" />
            <Text style={styles.erroOverlayTexto}>{mapError}</Text>
            <TouchableOpacity style={styles.botaoRetry} onPress={recriarWebView} activeOpacity={0.85}>
              <Ionicons name="refresh" size={15} color="#fff" />
              <Text style={styles.botaoRetryTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.destinationInfo}>
        <Ionicons name="location" size={20} color="#0066cc" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.destinationName, { color: isDark ? '#fff' : '#111827' }]}>
            {nome || 'Local turístico'}
          </Text>
          {!!endereco && (
            <Text style={[styles.destinationAddress, { color: isDark ? '#9ca3af' : '#6b7280' }]}>{endereco}</Text>
          )}
        </View>
      </View>

      {userLocation && !mapError && (
        <View style={styles.statusContainer}>
          {isTracking && savedRouteCoords ? (
            isOnRoute ? (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={[styles.statusText, { color: '#10b981' }]}>✓ Você está no caminho</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 },
  subHeaderRow: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 12, marginTop: 4 },
  seloPronto: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  progressoBox: { marginBottom: 12 },
  progressoTrilha: { height: 6, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressoBarra: { height: '100%', backgroundColor: '#0f766e' },
  progressoTexto: { fontSize: 11, color: '#64748b', marginTop: 5 },
  locationButtonFull: { backgroundColor: '#0066cc', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonContentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  botaoBaixar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#f0fdfa', borderWidth: 1, borderColor: '#99f6e4', borderRadius: 12, paddingVertical: 10, marginBottom: 12 },
  botaoBaixarNeutro: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  botaoBaixarTexto: { color: '#0f766e', fontSize: 12.5, fontWeight: '700' },
  mapWrapper: { width: '100%', height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: '#e5e7eb' },
  map: { width: '100%', height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: '#374151', fontSize: 13 },
  erroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff1f2', justifyContent: 'center', alignItems: 'center', gap: 9, paddingHorizontal: 22 },
  erroOverlayTexto: { color: '#9f1239', fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  botaoRetry: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e11d48', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 11, marginTop: 4 },
  botaoRetryTexto: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  destinationInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  destinationName: { fontSize: 14, fontWeight: 'bold' },
  destinationAddress: { fontSize: 13, marginTop: 4 },
  statusContainer: { marginTop: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  waitingText: { fontSize: 12, textAlign: 'center', fontWeight: '600' }
});