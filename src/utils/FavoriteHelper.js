// src/utils/FavoriteHelper.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@favoritos';

export const saveFavorite = async (item) => {
  try {
    const favorites = await getFavorites();
    const updated = [...favorites, item];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Erro ao salvar favorito:', error);
  }
};

export const removeFavorite = async (id) => {
  try {
    const favorites = await getFavorites();
    const updated = favorites.filter(item => item.id !== id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
  }
};

export const getFavorites = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Erro ao carregar favoritos:', error);
    return [];
  }
};

export const isFavorite = async (id) => {
  const favorites = await getFavorites();
  return favorites.some(item => item.id === id);
};