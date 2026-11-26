import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image as RNImage } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useCity } from '../context/CityContext';
import { calcularDistancia } from '../utils/LocationHelper';
import { obterCache } from '../services/cacheService';
import api from '../services/api';
import useConnectivity from '../hooks/useConnectivity';
import OfflineBanner from '../components/OfflineBanner';
import LocationCard from '../components/LocationCard';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_LIB_URL = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
const MAP_CSS_URL = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
const DEFAULT_REGION = { latitude: -29.6419, longitude: -50.4503 };

const CATEGORY_STYLES = { turismo: '#0ea5e9', gastronomia: '#f59e0b', hospedagem: '#8b5cf6', servicos: '#10b981', evento: '#6366f1' };
const CATEGORY_ICONS = { turismo: 'location', gastronomia: 'restaurant', hospedagem: 'bed', servicos: 'business', evento: 'calendar' };
const SERVICOS_SUBICONS = { saude: 'medkit', seguranca: 'police', combustivel: 'car-sport', mercado: 'cart', automotivo: 'construct', publico: 'briefcase', farmacia: 'pill', banco: 'cash' };
const CATEGORIAS_FILTRO = [
  { id: 'todos', label: 'Todos', icone: 'apps' }, { id: 'turismo', label: 'Turismo', icone: 'location' },
  { id: 'gastronomia', label: 'Restaurantes', icone: 'restaurant' }, { id: 'hospedagem', label: 'Acomodações', icone: 'bed' },
  { id: 'servicos', label: 'Serviços', icone: 'business' }, { id: 'evento', label: 'Eventos', icone: 'calendar' },
];

function obterSVGIcone(nome) {
  const d = {
    location: '<path d="M24 5C15.7 5 9 11.7 9 20c0 10.5 15 27 15 27s15-16.5 15-27C39 11.7 32.3 5 24 5Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><circle cx="24" cy="20" r="5" fill="#fff"/>',
    restaurant: '<path d="M14 7v13M8 7v8c0 4 3 6 6 6s6-2 6-6V7M14 21v22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M34 7v36M34 7c-7 5-8 15-8 21h8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    bed: '<path d="M7 39V12M7 31h34v8M41 23v16M7 23h34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M12 23v-6c0-3 2-5 5-5h5c3 0 5 2 5 5v6" fill="none" stroke="#fff" stroke-width="4"/>',
    business: '<path d="M9 43V9h30v34M5 43h38M17 17h4M27 17h4M17 26h4M27 26h4M20 43V34h8v9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    calendar: '<rect x="7" y="10" width="34" height="31" rx="4" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M16 6v7M32 6v7M7 19h34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="17" cy="27" r="2.2" fill="#fff"/><circle cx="24" cy="27" r="2.2" fill="#fff"/><circle cx="31" cy="27" r="2.2" fill="#fff"/><circle cx="17" cy="34" r="2.2" fill="#fff"/><circle cx="24" cy="34" r="2.2" fill="#fff"/>',
    medkit: '<rect x="6" y="15" width="36" height="28" rx="4" fill="none" stroke="#fff" stroke-width="4"/><path d="M17 15V9h14v6M24 21v16M16 29h16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
    police: '<path d="M11 15l13-6 13 6-3 6H14l-3-6Z" fill="none" stroke="#fff" stroke-width="3.8" stroke-linejoin="round"/><circle cx="24" cy="14" r="1.8" fill="#fff"/><path d="M16 21v3a8 8 0 0 0 16 0v-3" fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/><path d="M10 42c1.5-6 6.5-9 14-9s12.5 3 14 9" fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/>',
    'car-sport': '<path d="m8 28 4-11c1-3 3-5 6-5h12c3 0 5 2 6 5l4 11v11H8Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M12 28h24M15 36h1M33 36h1M14 22h20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
    cart: '<path d="M6 9h5l5 25h22l5-18H13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19" cy="41" r="3" fill="#fff"/><circle cx="35" cy="41" r="3" fill="#fff"/>',
    construct: '<path d="m13 8 9 9-5 5-9-9 5-5ZM29 26l5-5 10 10-5 5-10-10ZM20 22 8 34l7 7 12-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    briefcase: '<rect x="6" y="16" width="36" height="26" rx="4" fill="none" stroke="#fff" stroke-width="4"/><path d="M17 16v-6h14v6M6 27h36M21 27v5h6v-5" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>',
    pill: '<path d="M13 39a10 10 0 0 1 0-14l12-12a10 10 0 0 1 14 14L27 39a10 10 0 0 1-14 0Z" fill="none" stroke="#fff" stroke-width="4"/><path d="m18 20 14 14" fill="none" stroke="#fff" stroke-width="4"/>',
    cash: '<rect x="5" y="12" width="38" height="28" rx="4" fill="none" stroke="#fff" stroke-width="4"/><circle cx="24" cy="26" r="7" fill="none" stroke="#fff" stroke-width="4"/><path d="M10 18h2M36 34h2" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
    'information-circle': '<circle cx="24" cy="24" r="18" fill="none" stroke="#fff" stroke-width="4"/><path d="M24 22v12M24 15v1" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${d[nome] || d['information-circle']}</svg>`;
}

function criarHTMLMapa(pontos, centro) {
  const pontosJSON = JSON.stringify(pontos.map((ponto, index) => {
    let iconName = CATEGORY_ICONS[ponto.categoriaKey] || 'information-circle';
    const pinColor = CATEGORY_STYLES[ponto.categoriaKey] || '#10b981';
    if (ponto.categoriaKey === 'servicos') {
      const subTipo = String(ponto.tipoServico || '').toLowerCase().trim();
      const chave = Object.keys(SERVICOS_SUBICONS).find(k => subTipo.includes(k));
      iconName = SERVICOS_SUBICONS[subTipo] || (chave ? SERVICOS_SUBICONS[chave] : 'business');
    }
    return { index, id: ponto.id, nome: ponto.nome || ponto.titulo || 'Local', lat: Number(ponto.lat), lng: Number(ponto.lng), cor: pinColor, icone: iconName };
  })).replace(/</g, '\\u003c');

  const nomesIcones = ['location', 'restaurant', 'bed', 'business', 'calendar', 'medkit', 'police', 'car-sport', 'cart', 'construct', 'briefcase', 'pill', 'cash', 'information-circle'];
  const iconesSVGJSON = JSON.stringify(Object.fromEntries(nomesIcones.map(nome => [nome, obterSVGIcone(nome)]))).replace(/</g, '\\u003c');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/><link href="${MAP_CSS_URL}" rel="stylesheet"/><style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%;overflow:hidden;background:#e8edf2}.user-pin{width:22px;height:22px;border-radius:50%;background:#2563eb;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)}.maplibregl-ctrl-group{border-radius:12px!important;overflow:hidden}.maplibregl-ctrl-attrib{font-size:9px!important}</style></head><body><div id="map"></div><script src="${MAP_LIB_URL}"><\/script><script>
const PONTOS=${pontosJSON},CENTRO=[${centro.longitude},${centro.latitude}],ICONES_SVG=${iconesSVGJSON};
let map=null,userMarker=null;
function enviarMensagem(d){if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage)window.ReactNativeWebView.postMessage(JSON.stringify(d));}
function carregarImagemSVG(nome,svg){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{try{if(!map.hasImage(nome))map.addImage(nome,img,{pixelRatio:2});resolve();}catch(e){reject(e);}};img.onerror=()=>reject(new Error('Falha: '+nome));img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});}
async function registrarIcones(){await Promise.all(Object.keys(ICONES_SVG).map(nome=>carregarImagemSVG(nome,ICONES_SVG[nome]||ICONES_SVG['information-circle'])));}
function criarGeoJSON(){const features=[];PONTOS.forEach(p=>{const lat=Number(p.lat),lng=Number(p.lng);if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180)features.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{index:p.index,id:String(p.id||''),nome:p.nome,cor:p.cor,icone:p.icone}});});return{type:'FeatureCollection',features};}
function criarCamadasPontos(){const geoJSON=criarGeoJSON();map.addSource('pontos-turismo',{type:'geojson',data:geoJSON});
map.addLayer({id:'pins-circulos',type:'circle',source:'pontos-turismo',paint:{'circle-radius':['interpolate',['linear'],['zoom'],3,24,6,22,9,20,12,18,15,16,18,15],'circle-color':['get','cor'],'circle-stroke-color':'#ffffff','circle-stroke-width':['interpolate',['linear'],['zoom'],3,3,12,2.5,18,2],'circle-opacity':1}});
map.addLayer({id:'pins-icones',type:'symbol',source:'pontos-turismo',layout:{'icon-image':['get','icone'],'icon-size':['interpolate',['linear'],['zoom'],3,1.15,6,1.05,9,0.95,12,0.85,15,0.75,18,0.70],'icon-anchor':'center','icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':0},paint:{'icon-opacity':1}});
map.on('click','pins-circulos',e=>{const f=e.features&&e.features.length?e.features[0]:null;if(f&&Number.isInteger(Number(f.properties.index)))enviarMensagem({type:'pointPress',index:Number(f.properties.index)});});
map.on('mouseenter','pins-circulos',()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave','pins-circulos',()=>{map.getCanvas().style.cursor='';});enviarMensagem({type:'pontosCarregados',totalPontos:geoJSON.features.length});}
window.atualizarLocalUsuario=function(lat,lng,centralizar){if(!map||!Number.isFinite(lat)||!Number.isFinite(lng))return;if(!userMarker){const el=document.createElement('div');el.className='user-pin';userMarker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([lng,lat]).addTo(map);}else{userMarker.setLngLat([lng,lat]);}if(centralizar)map.flyTo({center:[lng,lat],zoom:15,duration:1000});};
window.centralizarUsuario=function(lat,lng){window.atualizarLocalUsuario(lat,lng,true);};
async function iniciarMapa(){try{if(!window.maplibregl)throw new Error('MapLibre não carregada.');map=new maplibregl.Map({container:'map',style:'${MAP_STYLE_URL}',center:CENTRO,zoom:PONTOS.length>0?13:10,attributionControl:true,renderWorldCopies:false});map.addControl(new maplibregl.NavigationControl(),'top-right');map.on('load',async()=>{try{await registrarIcones();criarCamadasPontos();enviarMensagem({type:'mapReady',totalPontos:PONTOS.length});}catch(e){console.error('[MAPA] Erro:',e);enviarMensagem({type:'mapError',message:e.message});}});map.on('error',e=>console.error('[MAPLIBRE]',e.error||e));}catch(e){console.error('[MAPLIBRE]',e.message);enviarMensagem({type:'mapError',message:e.message});}}
iniciarMapa();<\/script></body></html>`;
}

export default function SmartHomeScreen({ navigation }) {
  const { cidadeAtual, trocarCidade, isOffline } = useCity();
  const webViewRef = useRef(null);
  const [pontos, setPontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const { isConnected } = useConnectivity();
  const insets = useSafeAreaInsets();
  const OFFLINE_OFFSET = 52;

  useEffect(() => {
    const carregarTudo = async () => {
      if (!cidadeAtual?.slug) return;
      setLoading(true);
      setMapReady(false);
      setSelectedPoint(null);

      try {
        const cacheKey = `cidade_${cidadeAtual.slug}`;
        const dadosCache = await obterCache(cacheKey);

        let turismoData = [], restaurantesData = [], acomodacoesData = [], servicosData = [], eventosData = [];

        if (dadosCache) {
          console.log(`📴 [Mapa] Usando cache para: ${cidadeAtual.slug}`);
          turismoData = dadosCache.pontosTuristicos || [];
          restaurantesData = dadosCache.restaurantes || [];
          acomodacoesData = dadosCache.acomodacoes || [];
          servicosData = dadosCache.servicos || [];
          eventosData = dadosCache.eventos || [];
        } else {
          console.log(`🌐 [Mapa] Cache vazio, buscando online: ${cidadeAtual.slug}`);
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
        const adicionar = (items, categoriaKey, label) => {
          if (Array.isArray(items)) {
            let adicionados = 0, ignorados = 0;
            items.forEach(item => {
              const lat = parseFloat(item.latitude), lng = parseFloat(item.longitude);
              if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                lista.push({ ...item, categoriaKey, categoriaLabel: label, categoriaColor: CATEGORY_STYLES[categoriaKey], lat, lng });
                adicionados++;
              } else { ignorados++; }
            });
            console.log(`✅ [${label}] Carregados: ${adicionados}, Ignorados: ${ignorados}`);
          }
        };
        adicionar(turismoData, 'turismo', 'Turismo');
        adicionar(restaurantesData, 'gastronomia', 'Restaurantes');
        adicionar(acomodacoesData, 'hospedagem', 'Acomodações');
        adicionar(servicosData, 'servicos', 'Serviços');
        adicionar(eventosData, 'evento', 'Eventos');
        setPontos(lista);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (!isConnected) {
          Alert.alert('Offline', 'Não há conexão e nenhum dado em cache para esta cidade.');
        }
      } finally {
        setLoading(false);
      }
    };
    carregarTudo();
  }, [cidadeAtual?.slug]);

  useEffect(() => {
    let ativo = true;
    const obterLocalizacao = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          if (ativo) setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (error) { console.log('GPS indisponível:', error); }
    };
    obterLocalizacao();
    return () => { ativo = false; };
  }, []);

  const pontosFiltrados = useMemo(() => filtroAtivo === 'todos' ? pontos : pontos.filter(p => p.categoriaKey === filtroAtivo), [pontos, filtroAtivo]);
  const centroInicial = useMemo(() => pontosFiltrados.length > 0 ? { latitude: pontosFiltrados[0].lat, longitude: pontosFiltrados[0].lng } : DEFAULT_REGION, [pontosFiltrados]);
  const htmlMapa = useMemo(() => criarHTMLMapa(pontosFiltrados, centroInicial), [pontosFiltrados, centroInicial]);

  const handleWebViewMessage = (event) => {
    try {
      const mensagem = JSON.parse(event.nativeEvent.data);
      if (mensagem.type === 'mapReady') {
        setMapReady(true);
        if (userLocation) webViewRef.current?.injectJavaScript(`window.atualizarLocalUsuario(${userLocation.latitude}, ${userLocation.longitude}, false); true;`);
      } else if (mensagem.type === 'pointPress' && typeof mensagem.index === 'number') {
        const ponto = pontosFiltrados[mensagem.index];
        if (ponto) setSelectedPoint(ponto);
      } else if (mensagem.type === 'mapError') { console.error('[MAPA] Erro recebido da WebView:', mensagem.message); }
    } catch (error) { console.error('Erro ao interpretar mensagem do mapa:', error); }
  };

  useEffect(() => {
    if (mapReady && userLocation) webViewRef.current?.injectJavaScript(`window.atualizarLocalUsuario(${userLocation.latitude}, ${userLocation.longitude}, false); true;`);
  }, [userLocation, mapReady]);

  const selectedPointData = useMemo(() => {
    if (!selectedPoint) return null;
    let distancia = null;
    if (userLocation) {
      const d = calcularDistancia(userLocation.latitude, userLocation.longitude, selectedPoint.lat, selectedPoint.lng);
      if (d) { const num = parseFloat(d); distancia = num < 1 ? `${Math.round(num * 1000)} m` : `${num.toFixed(1)} km`; }
    }
    return { ...selectedPoint, distancia };
  }, [selectedPoint, userLocation]);

  const handleTrocarCidade = () => { setSelectedPoint(null); setMapReady(false); trocarCidade(); };
  const voltarParaMim = () => {
    if (!userLocation) return Alert.alert('Localização', 'Não foi possível obter sua localização atual.');
    if (mapReady) webViewRef.current?.injectJavaScript(`window.centralizarUsuario(${userLocation.latitude}, ${userLocation.longitude}); true;`);
  };

  if (loading) return (
    <View style={[styles.loadingContainer, { backgroundColor: cidadeAtual?.corPrimaria || '#0B2D6B' }]}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.loadingText}>Preparando mapa de {cidadeAtual?.nome}...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <WebView ref={webViewRef} style={styles.map} source={{ html: htmlMapa }} originWhitelist={['*']} javaScriptEnabled={true} domStorageEnabled={true} scrollEnabled={false} onMessage={handleWebViewMessage} androidLayerType="hardware" mixedContentMode="never" />

      <OfflineBanner visible={!isConnected} />

      <View style={[styles.header, { top: isConnected ? insets.top + 8 : insets.top + 8 + OFFLINE_OFFSET }]}>
        <LinearGradient colors={['#0B2D6B', '#071B42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerCard}>
          <View style={[styles.headerDot, { backgroundColor: cidadeAtual?.corPrimaria || '#22c55e' }]} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerCity} numberOfLines={1}>{cidadeAtual?.nome}</Text>
            <Text style={styles.headerCount} numberOfLines={1}>
              {pontosFiltrados.length > 0 ? `${pontosFiltrados.length} lugares` : 'Em breve'}
              {!isConnected && ' (offline)'}
            </Text>
          </View>

          {isConnected && (
            <TouchableOpacity style={styles.swapButton} onPress={handleTrocarCidade} activeOpacity={0.7}>
              <Ionicons name="swap-horizontal" size={16} color="#fff" />
              <Text style={styles.swapButtonText}>Trocar</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      <View style={[styles.filterContainer, { top: isConnected ? 118 : 118 + OFFLINE_OFFSET }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIAS_FILTRO.map((cat) => {
            const isActive = filtroAtivo === cat.id;
            return (
              <TouchableOpacity key={cat.id} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setFiltroAtivo(cat.id)} activeOpacity={0.8}>
                <Ionicons name={cat.icone} size={16} color={isActive ? '#0f172a' : '#fff'} style={{ marginRight: 6 }} />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.fabButton} onPress={voltarParaMim} activeOpacity={0.8}>
        <Ionicons name="locate" size={22} color="#fff" />
      </TouchableOpacity>

      <LocationCard item={selectedPointData} isVisible={!!selectedPoint} onClose={() => setSelectedPoint(null)} onSeeDetails={() => {
        if (!selectedPoint) return;
        navigation.navigate('Detalhes', { id: selectedPoint.id, nome: selectedPoint.nome || selectedPoint.titulo, titulo: selectedPoint.titulo, descricao: selectedPoint.descricao, endereco: selectedPoint.endereco, imagem: selectedPoint.imagem || selectedPoint.imagens?.[0], imagens: selectedPoint.imagens, tipo: selectedPoint.categoriaLabel, latitude: selectedPoint.lat, longitude: selectedPoint.lng, whatsapp: selectedPoint.whatsapp, telefone: selectedPoint.telefone, horarios: selectedPoint.horarios, sempreAberto: selectedPoint.sempreAberto, linkExterno: selectedPoint.linkExterno, dataInicio: selectedPoint.dataInicio, dataFim: selectedPoint.dataFim, proximaOcorrencia: selectedPoint.proximaOcorrencia, gratuito: selectedPoint.gratuito, preco: selectedPoint.preco, recorrenciaDescricao: selectedPoint.recorrenciaDescricao, funcionamento24h: selectedPoint.funcionamento24h, tipoServico: selectedPoint.tipoServico, redesSociais: selectedPoint.redesSociais });
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8edf2' },
  map: { ...StyleSheet.absoluteFillObject },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, color: '#fff', fontSize: 14, fontWeight: '600' },

  header: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  headerCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  headerDot: { width: 10, height: 10, borderRadius: 5 },
  headerTextContainer: { flex: 1, marginLeft: 10, marginRight: 10 },
  headerCity: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerCount: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  swapButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  swapButtonText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  filterContainer: { position: 'absolute', left: 0, right: 0, zIndex: 90, paddingHorizontal: 16 },
  filterScroll: { gap: 10, paddingVertical: 4 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(11,45,107,0.55)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', flexShrink: 0 },
  filterChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  filterText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  filterTextActive: { color: '#0f172a' },

  fabButton: { position: 'absolute', right: 16, bottom: 110, width: 50, height: 50, borderRadius: 25, backgroundColor: '#0B2D6B', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 80 }
});