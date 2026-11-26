import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import api from '../services/api';
import { salvarCache, obterCache } from '../services/cacheService';

const CITY_STORAGE_KEY = '@smart_turismo_cidade_selecionada';
const IS_MULTI_CITY_APP = Constants.expoConfig?.extra?.appEnv === 'smart';
const DEFAULT_CITY_ID = Constants.expoConfig?.extra?.cityId || 'rolante';

const CityContext = createContext();

export function CityProvider({ children }) {
  const [cidadeAtual, setCidadeAtual] = useState(null);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carregouDoStorage, setCarregouDoStorage] = useState(false);
  
  // 🚨 NOVO: Estado de conectividade
  const [isOffline, setIsOffline] = useState(false);

  // 🚨 NOVO: Monitorar conectividade em tempo real
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
      console.log(`📡 Conectividade: ${offline ? 'OFFLINE' : 'ONLINE'}`);
    });

    // Check inicial
    NetInfo.fetch().then((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  // 1. Carrega cidade salva no storage ao iniciar
  useEffect(() => {
    const carregarCidadeSalva = async () => {
      if (!IS_MULTI_CITY_APP) {
        const cidadePadrao = {
          slug: DEFAULT_CITY_ID,
          nome: DEFAULT_CITY_ID === 'rolante' ? 'Rolante' : 'Cidade',
          estado: 'RS',
          corPrimaria: '#0066cc',
          corSecundaria: '#10b981',
          heroImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080',
        };
        setCidadeAtual(cidadePadrao);
        setLoading(false);
        return;
      }

      try {
        const cidadeSalva = await AsyncStorage.getItem(CITY_STORAGE_KEY);
        if (cidadeSalva) {
          const cidadeParseada = JSON.parse(cidadeSalva);
          setCidadeAtual(cidadeParseada);
          
          // 🚨 NOVO: Se estiver offline, tenta carregar dados do cache
          const estadoRede = await NetInfo.fetch();
          const offline = estadoRede.isConnected === false || estadoRede.isInternetReachable === false;
          
          if (offline) {
            console.log('📴 Offline ao iniciar - tentando carregar dados do cache...');
            const dadosCache = await obterCache(`cidade_${cidadeParseada.slug}`);
            if (dadosCache) {
              console.log('✅ Dados carregados do cache:', Object.keys(dadosCache));
              // Os dados ficarão disponíveis via função helper
            } else {
              console.warn('⚠️ Nenhum cache encontrado para esta cidade');
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar cidade salva:', error);
      } finally {
        setCarregouDoStorage(true);
        setLoading(false);
      }
    };

    carregarCidadeSalva();
  }, []);

  // 2. Busca lista de cidades disponíveis do backend (apenas no Smart)
  useEffect(() => {
    if (!IS_MULTI_CITY_APP) return;

    const buscarCidades = async () => {
      try {
        let response = [];
        try {
          response = await api.get('/cidades');
        } catch (e) {
          console.log('Rota /cidades não disponível, tentando /admin/cidades...');
          response = await api.get('/admin/cidades');
        }

        if (Array.isArray(response) && response.length > 0) {
          const cidadesFormatadas = response.map((c) => ({
            slug: c.slug,
            nome: c.nome,
            estado: c.estado,
            corPrimaria: c.corPrimaria || '#4CAF50',
            corSecundaria: c.corSecundaria || '#0B2D6B',
            heroImageUrl: c.heroImageUrl || c.imagemSplash || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080',
          }));
          
          setCidadesDisponiveis(cidadesFormatadas);
          
          // 🚨 NOVO: Salvar lista de cidades no cache
          await salvarCache('cidades_disponiveis', cidadesFormatadas);
        } else {
          throw new Error('Lista de cidades vazia');
        }
      } catch (error) {
        console.error('Erro ao buscar cidades do backend:', error.message);
        
        // 🚨 NOVO: Tentar carregar do cache
        const cidadesCache = await obterCache('cidades_disponiveis');
        if (cidadesCache) {
          console.log('✅ Lista de cidades carregada do cache');
          setCidadesDisponiveis(cidadesCache);
        } else {
          setCidadesDisponiveis([
            {
              slug: 'rolante',
              nome: 'Rolante',
              estado: 'RS',
              corPrimaria: '#0066cc',
              corSecundaria: '#10b981',
              heroImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080',
            },
            {
              slug: 'riozinho',
              nome: 'Riozinho',
              estado: 'RS',
              corPrimaria: '#8b5cf6',
              corSecundaria: '#ec4899',
              heroImageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080',
            },
            {
              slug: 'taquara',
              nome: 'Taquara',
              estado: 'RS',
              corPrimaria: '#f59e0b',
              corSecundaria: '#ef4444',
              heroImageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1080',
            },
          ]);
        }
      }
    };

    buscarCidades();
  }, []);

  // 🚨 NOVA FUNÇÃO: Busca e cacheia dados completos de uma cidade
  const buscarDadosCidade = async (cidade) => {
    if (!cidade?.slug) return null;

    const cacheKey = `cidade_${cidade.slug}`;
    
    try {
      console.log(`🔄 Buscando dados online para: ${cidade.slug}`);
      
      const [turismo, restaurantes, acomodacoes, servicos, eventos] = await Promise.allSettled([
        api.get('/pontos-turisticos', cidade.slug),
        api.get('/restaurantes', cidade.slug),
        api.get('/acomodacoes', cidade.slug),
        api.get('/servicos', cidade.slug),
        api.get('/eventos', cidade.slug),
      ]);

      const dados = {
        pontosTuristicos: turismo.status === 'fulfilled' ? turismo.value : [],
        restaurantes: restaurantes.status === 'fulfilled' ? restaurantes.value : [],
        acomodacoes: acomodacoes.status === 'fulfilled' ? acomodacoes.value : [],
        servicos: servicos.status === 'fulfilled' ? servicos.value : [],
        eventos: eventos.status === 'fulfilled' ? eventos.value : [],
        ultimaAtualizacao: new Date().toISOString(),
      };

      // Salvar no cache
      await salvarCache(cacheKey, dados);
      console.log(`✅ Dados cacheados para: ${cidade.slug}`);
      
      return dados;
    } catch (error) {
      console.error(`❌ Erro ao buscar dados de ${cidade.slug}:`, error.message);
      
      // Fallback: tentar do cache
      const dadosCache = await obterCache(cacheKey);
      if (dadosCache) {
        console.log(`📴 Usando cache para: ${cidade.slug}`);
        return dadosCache;
      }
      
      return null;
    }
  };

  const selecionarCidade = async (cidade) => {
    try {
      await AsyncStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(cidade));
      setCidadeAtual(cidade);
      
      // 🚨 NOVO: Buscar e cacheiar dados automaticamente ao selecionar
      console.log(`📍 Cidade selecionada: ${cidade.nome} - buscando dados...`);
      await buscarDadosCidade(cidade);
    } catch (error) {
      console.error('Erro ao salvar cidade:', error);
    }
  };

  const trocarCidade = async () => {
    try {
      await AsyncStorage.removeItem(CITY_STORAGE_KEY);
      setCidadeAtual(null);
    } catch (error) {
      console.error('Erro ao trocar cidade:', error);
    }
  };

  // 🚨 NOVA FUNÇÃO: Obter dados do cache (para telas usarem offline)
  const obterDadosCidadeCache = async (slug) => {
    if (!slug) return null;
    return await obterCache(`cidade_${slug}`);
  };

  return (
    <CityContext.Provider
      value={{
        cidadeAtual,
        cidadesDisponiveis,
        loading,
        carregouDoStorage,
        isMultiCityApp: IS_MULTI_CITY_APP,
        isOffline, // 🚨 NOVO: Estado de offline disponível para todas as telas
        selecionarCidade,
        trocarCidade,
        buscarDadosCidade, // 🚨 NOVO: Função para buscar e cacheiar dados
        obterDadosCidadeCache, // 🚨 NOVO: Função para ler do cache
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity deve ser usado dentro de CityProvider');
  }
  return context;
}