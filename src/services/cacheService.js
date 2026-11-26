// src/services/cacheService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@smart_cache_';
const CACHE_EXPIRY_KEY = '_expiry';

/**
 * Salva dados no cache com timestamp de expiração
 * @param {string} key - Chave única (ex: 'cidade_rolante')
 * @param {any} data - Dados a serem salvos
 * @param {number} expiryHours - Horas até expirar (padrão: 168h = 7 dias)
 */
export const salvarCache = async (key, data, expiryHours = 168) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${cacheKey}${CACHE_EXPIRY_KEY}`;
    const expiryDate = Date.now() + expiryHours * 60 * 60 * 1000;

    await AsyncStorage.multiSet([
      [cacheKey, JSON.stringify(data)],
      [expiryKey, String(expiryDate)],
    ]);
    console.log(`✅ Cache salvo: ${key}`);
  } catch (error) {
    console.error(`❌ Erro ao salvar cache [${key}]:`, error);
  }
};

/**
 * Busca dados do cache (retorna null se expirado ou não existir)
 * @param {string} key - Chave única
 * @returns {any|null} Dados em cache ou null
 */
export const obterCache = async (key) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${cacheKey}${CACHE_EXPIRY_KEY}`;

    const [data, expiry] = await AsyncStorage.multiGet([cacheKey, expiryKey]);
    
    if (!data[1]) return null;

    // Verifica se expirou
    if (expiry[1] && Date.now() > parseInt(expiry[1])) {
      console.log(`⏰ Cache expirado: ${key}`);
      await limparCache(key);
      return null;
    }

    return JSON.parse(data[1]);
  } catch (error) {
    console.error(`❌ Erro ao obter cache [${key}]:`, error);
    return null;
  }
};

/**
 * Limpa cache específico
 * @param {string} key - Chave única
 */
export const limparCache = async (key) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${cacheKey}${CACHE_EXPIRY_KEY}`;
    await AsyncStorage.multiRemove([cacheKey, expiryKey]);
    console.log(`🗑️ Cache limpo: ${key}`);
  } catch (error) {
    console.error(`❌ Erro ao limpar cache [${key}]:`, error);
  }
};

/**
 * Limpa todos os caches do Smart Turismo
 */
export const limparTodosCaches = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    console.log(`🗑️ Todos os caches limpos (${cacheKeys.length} itens)`);
  } catch (error) {
    console.error('❌ Erro ao limpar todos os caches:', error);
  }
};