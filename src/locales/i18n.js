// src/locales/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization'; // ✅ Importe Localization

// ✅ Detecta o idioma do celular
const deviceLanguage = Localization.locale ? Localization.locale.split('-')[0] : 'pt';
const language = deviceLanguage === 'pt' ? 'pt' : 'en'; // ✅ Usa inglês como fallback

const resources = {
  pt: {
    translation: {
      touristAttractions: 'Pontos Turísticos',
      restaurantsTitle: 'Restaurantes',
      accommodationsTitle: 'Acomodações',
      description: 'Descrição',
      address: 'Endereço',
      schedule: 'Horário',
      openInMaps: 'Ver no Google Maps',
      addToFavorites: 'Adicionar aos Favoritos',
      addedToFavorites: 'Favorito salvo',
      removeFromFavorites: 'Remover dos Favoritos',
      removedFromFavorites: 'foi removido dos favoritos',
      locationUnavailable: 'Localização não disponível',
      error: 'Erro',
      couldNotOpenMaps: 'Não foi possível abrir o Google Maps.',
      loading: 'Carregando...',
      noResults: 'Nenhum resultado encontrado',
      noImage: 'Sem imagem',
      points: 'Pontos Turísticos',
      restaurants: 'Restaurantes',
      accommodations: 'Acomodações',
      failedToLoadAttractions: 'Não foi possível carregar os pontos turísticos',
      failedToLoadRestaurants: 'Não foi possível carregar os restaurantes',
      failedToLoadAccommodations: 'Não foi possível carregar as acomodações',
      searchPlaceholder:'Pesquisar...'
    }
  },
  en: {
    translation: {
      touristAttractions: 'Tourist Attractions',
      restaurantsTitle: 'Restaurants',
      accommodationsTitle: 'Accomodations',
      description: 'Description',
      address: 'Address',
      schedule: 'Schedule',
      openInMaps: 'Open in Google Maps',
      addToFavorites: 'Add to Favorites',
      addedToFavorites: 'Favorite saved',
      removeFromFavorites: 'Remove from Favorites',
      removedFromFavorites: 'was removed from favorites',
      locationUnavailable: 'Location unavailable',
      error: 'Error',
      couldNotOpenMaps: 'Could not open Google Maps.',
      loading: 'Loading...',
      noResults: 'No results found',
      noImage: 'No image',
      points: 'Points',
      restaurants: 'Restaurants',
      accommodations: 'Accomodations',
      failedToLoadAttractions: 'Failed to load tourist attractions',
      failedToLoadRestaurants: 'Failed to load restaurants',
      failedToLoadAccommodations: 'Failed to load accommodations',
      searchPlaceholder:'Search...'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: language, // ✅ Usa o idioma detectado
    fallbackLng: 'pt', // ✅ Se falhar, usa português
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;