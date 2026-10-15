// src/utils/FavoritosHelper.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITOS_KEY = '@turismo_riozinho_favoritos';

export async function getFavoritos() {
  try {
    const data = await AsyncStorage.getItem(FAVORITOS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar favoritos:', error);
    return [];
  }
}

export async function toggleFavorito(id) {
  try {
    const favoritos = await getFavoritos();
    let novosFavoritos;
    if (favoritos.includes(id)) {
      novosFavoritos = favoritos.filter((favId) => favId !== id);
    } else {
      novosFavoritos = [...favoritos, id];
    }
    await AsyncStorage.setItem(FAVORITOS_KEY, JSON.stringify(novosFavoritos));
    return novosFavoritos;
  } catch (error) {
    console.error('Erro ao alternar favorito:', error);
    return [];
  }
}