import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import api from '../services/api';

const CITY_STORAGE_KEY = '@smart_turismo_cidade_selecionada';
const IS_MULTI_CITY_APP = Constants.expoConfig?.extra?.appEnv === 'smart';
const DEFAULT_CITY_ID = Constants.expoConfig?.extra?.cityId || 'rolante';

const CityContext = createContext();

export function CityProvider({ children }) {
  const [cidadeAtual, setCidadeAtual] = useState(null);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carregouDoStorage, setCarregouDoStorage] = useState(false);

  // 1. Carrega cidade salva no storage ao iniciar
  useEffect(() => {
    const carregarCidadeSalva = async () => {
      if (!IS_MULTI_CITY_APP) {
        // App de cidade única (Rolante): usa a cidade padrão do .env
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
        // Tenta buscar da rota pública primeiro. 
        // Se falhar (ex: 401 não autorizado ou 404), cai no catch e usa o fallback.
        let response = [];
        try {
          response = await api.get('/cidades');
        } catch (e) {
          console.log('Rota /cidades não disponível, tentando /admin/cidades...');
          response = await api.get('/admin/cidades');
        }

        if (Array.isArray(response) && response.length > 0) {
          // Mapeia para garantir o formato exato que o app espera
          const cidadesFormatadas = response.map((c) => ({
            slug: c.slug,
            nome: c.nome,
            estado: c.estado,
            corPrimaria: c.corPrimaria || '#4CAF50',
            corSecundaria: c.corSecundaria || '#0B2D6B',
            // Usa heroImageUrl (do seu controller) ou imagemSplash como fallback
            heroImageUrl: c.heroImageUrl || c.imagemSplash || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080',
          }));
          
          setCidadesDisponiveis(cidadesFormatadas);
        } else {
          throw new Error('Lista de cidades vazia');
        }
      } catch (error) {
        console.error('Erro ao buscar cidades do backend:', error.message);
        
        // 🛡️ FALLBACK SEGURO: Mantém o app funcionando com dados de teste 
        // enquanto você finaliza o cadastro no painel
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
    };

    buscarCidades();
  }, []);

  const selecionarCidade = async (cidade) => {
    try {
      await AsyncStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(cidade));
      setCidadeAtual(cidade);
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

  return (
    <CityContext.Provider
      value={{
        cidadeAtual,
        cidadesDisponiveis,
        loading,
        carregouDoStorage,
        isMultiCityApp: IS_MULTI_CITY_APP,
        selecionarCidade,
        trocarCidade,
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