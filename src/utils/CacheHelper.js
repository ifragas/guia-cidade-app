// src/utils/CacheHelper.js
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Salva dados na memória local em cache
 */
export const salvarCache = async (key, data) => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(`@cache_${key}`, jsonValue);
  } catch (error) {
    console.error(`Erro ao salvar cache [${key}]:`, error);
  }
};

/**
 * Busca dados em cache salvos localmente
 */
export const obterCache = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(`@cache_${key}`);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Erro ao obter cache [${key}]:`, error);
    return null;
  }
};