import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCity } from '../context/CityContext';
import { hexToRgba } from '../utils/CityTheme';

export default function CitySplashScreen({ onFinished }) {
  const { cidadeAtual } = useCity();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!cidadeAtual) return;

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.timing(textFadeAnim, {
      toValue: 1, duration: 600, delay: 300, useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => onFinished(), 2500);
    return () => clearTimeout(timer);
  }, [cidadeAtual]);

  if (!cidadeAtual) return null;

  const primary = cidadeAtual.corPrimaria || '#4CAF50';
  const secondary = cidadeAtual.corSecundaria || '#0B2D6B';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image
          source={{ uri: cidadeAtual.heroImageUrl || cidadeAtual.imagemSplash }}
          style={styles.image}
          contentFit="cover"
          transition={500}
        />
        
        {/* 🚨 GRADIENTE CROMÁTICO SOBRE A IMAGEM */}
        <LinearGradient
          colors={[
            'transparent', 
            hexToRgba(primary, 0.4), 
            hexToRgba(secondary, 0.95)
          ]}
          style={styles.gradientOverlay}
        />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
          <Text style={styles.welcomeText}>Bem-vindo a</Text>
          <Text style={styles.cityName}>{cidadeAtual.nome}</Text>
          <Text style={styles.cityState}>{cidadeAtual.estado}</Text>
        </Animated.View>

        <View style={[styles.colorBar, { backgroundColor: primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imageContainer: { ...StyleSheet.absoluteFillObject },
  image: { width: '100%', height: '100%' },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1, justifyContent: 'flex-end', paddingBottom: 80, paddingHorizontal: 32 },
  textContainer: { marginBottom: 24 },
  welcomeText: { fontSize: 18, color: 'rgba(255, 255, 255, 0.9)', marginBottom: 8, fontWeight: '300', letterSpacing: 1 },
  cityName: { fontSize: 48, fontWeight: 'bold', color: '#fff', marginBottom: 4, letterSpacing: -1 },
  cityState: { fontSize: 20, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '300' },
  colorBar: { height: 4, width: 80, borderRadius: 2 },
});