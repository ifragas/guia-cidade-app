// src/screens/DetalhesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import MapView, { Marker } from 'react-native-maps';

export default function DetalhesScreen({ route }) {
  const { id, nome, descricao, endereco, horario, imagem, imagens, tipo, latitude, longitude } = route.params;
  const [favoritado, setFavoritado] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const { t } = useTranslation();

  const abrirNoMapa = () => {
    if (!latitude || !longitude) {
      Alert.alert(t('locationUnavailable'));
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), t('couldNotOpenMaps'));
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Carrossel de imagens */}
      {Array.isArray(imagens) && imagens.length > 0 ? (
        <View style={styles.carouselContainer}>
          <FlatList
            data={imagens}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.carouselImage}
                contentFit="cover"
                placeholder={require('../../assets/placeholder.jpg')}
                cachePolicy="memory-disk"
                onError={(e) => {
                  e.target.src = '/placeholder.jpg';
                }}
              />
            )}
            decelerationRate="fast"
            bounces={false}
          />
        </View>
      ) : (
        <Image
          source={{ uri: imagem || '/placeholder.jpg' }}
          style={styles.imagem}
          contentFit="cover"
          placeholder={require('../../assets/placeholder.jpg')}
          cachePolicy="memory-disk"
          onError={(e) => {
            e.target.src = '/placeholder.jpg';
          }}
        />
      )}

      {/* Título */}
      <Text style={styles.titulo}>{nome}</Text>

      {/* Tipo */}
      <View style={styles.infoBox}>
        <Text style={styles.tipo}>📌 {tipo}</Text>
      </View>

      {/* Descrição */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>{t('description')}</Text>
        <Text style={styles.texto}>{descricao}</Text>
      </View>

      {/* Endereço */}
      {endereco && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>{t('address')}</Text>
          <Text style={styles.texto}>{endereco}</Text>
        </View>
      )}

      {/* Horário */}
      {horario && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>{t('schedule')}</Text>
          <Text style={styles.texto}>{horario}</Text>
        </View>
      )}

      {/* Mapa */}
      {latitude && longitude && showMap && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: latitude,
              longitude: longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            loadingEnabled={true}
            loadingIndicatorColor="#666"
            loadingBackgroundColor="#f0f0f0"
            onMapReady={() => console.log('✅ Mapa carregado')}
            onError={(error) => {
              console.log('❌ Erro no mapa:', error);
              Alert.alert('Mapa indisponível', 'Não foi possível carregar o mapa.');
              setShowMap(false);
            }}
          >
            <Marker
              coordinate={{ latitude, longitude }}
              title={nome}
              description={endereco}
            />
          </MapView>
        </View>
      )}

      {/* Botão para Google Maps */}
      <TouchableOpacity style={styles.botaoMapa} onPress={abrirNoMapa}>
        <Text style={styles.botaoMapaTexto}>📍 {t('openInMaps')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  carouselContainer: {
    width: '100%',
    height: 250,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f0f0f0',
  },
  carouselImage: {
    width: 300,
    height: 250,
    borderRadius: 10,
    marginRight: 10,
  },
  imagem: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  tipo: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e6f7ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#b0e0e6',
  },
  secao: {
    marginBottom: 15,
  },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  texto: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  mapContainer: {
    height: 250,
    width: '100%',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f0f0f0',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  botaoMapa: {
    marginTop: 20,
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  botaoMapaTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});