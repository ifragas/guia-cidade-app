import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useCity } from '../context/CityContext';

export default function CitySplashScreen({ onFinished }) {
  const { cidadeAtual } = useCity();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!cidadeAtual) return;

    // Animação de entrada da imagem de fundo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação do texto (com pequeno delay)
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // 🚨 Aguarda 2.5 segundos e chama a Home
    const timer = setTimeout(() => {
      onFinished();
    }, 2500);

    return () => clearTimeout(timer);
  }, [cidadeAtual]);

  if (!cidadeAtual) return null;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Imagem de fundo da cidade */}
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image
          source={{ uri: cidadeAtual.heroImageUrl || cidadeAtual.imagemSplash }}
          style={styles.image}
          contentFit="cover"
          transition={500}
        />
        <View style={styles.overlay} />
      </Animated.View>

      {/* Conteúdo sobre a imagem */}
      <View style={styles.content}>
        <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
          <Text style={styles.welcomeText}>Bem-vindo a</Text>
          <Text style={styles.cityName}>{cidadeAtual.nome}</Text>
          <Text style={styles.cityState}>{cidadeAtual.estado}</Text>
        </Animated.View>

        {/* Barra indicadora com a cor primária da cidade */}
        <View
          style={[
            styles.colorBar,
            { backgroundColor: cidadeAtual.corPrimaria || '#4CAF50' },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)', // Escurece levemente para o texto brilhar
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 80,
    paddingHorizontal: 32,
  },
  textContainer: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    fontWeight: '300',
    letterSpacing: 1,
  },
  cityName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -1,
  },
  cityState: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '300',
  },
  colorBar: {
    height: 4,
    width: 80,
    borderRadius: 2,
  },
});