import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCity } from '../context/CityContext';

const { width } = Dimensions.get('window');

export default function CitySelectionScreen() {
  const { cidadesDisponiveis, selecionarCidade, loading } = useCity();
  const [selecionando, setSelecionando] = useState(null);

  const handleSelecionar = async (cidade) => {
    setSelecionando(cidade.slug);
    await selecionarCidade(cidade);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando destinos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="compass" size={32} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>Smart Turismo</Text>
        <Text style={styles.headerSubtitle}>
          Escolha o destino da sua próxima aventura
        </Text>
      </View>

      {/* Lista de Cidades */}
      <FlatList
        data={cidadesDisponiveis}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelecionando = selecionando === item.slug;

          return (
            <TouchableOpacity
              style={styles.cityCard}
              onPress={() => handleSelecionar(item)}
              disabled={selecionando !== null}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: item.heroImageUrl || item.imagemSplash }}
                style={styles.cityImage}
                contentFit="cover"
                transition={300}
              />
              
              {/* Gradiente para legibilidade do texto */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.gradientOverlay}
              />

              <View style={styles.cityInfo}>
                <View style={styles.cityTextContainer}>
                  <Text style={styles.cityName}>{item.nome}</Text>
                  <View style={styles.stateBadge}>
                    <Ionicons name="location" size={12} color="#fff" />
                    <Text style={styles.stateText}>{item.estado}</Text>
                  </View>
                </View>

                {isSelecionando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.arrowContainer}>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </View>

              {/* Indicador de cor da cidade */}
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: item.corPrimaria || '#4CAF50' },
                ]}
              />
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Novas cidades são adicionadas regularmente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 14,
  },
  header: {
    paddingTop: 70,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cityCard: {
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  cityInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cityTextContainer: {
    flex: 1,
  },
  cityName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stateText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontSize: 12,
    color: '#475569',
  },
});