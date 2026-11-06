// src/components/TravelCardSkeleton.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeColors } from '../utils/ThemeContext';

export default function TravelCardSkeleton() {
  const { colors, isDark } = useThemeColors();
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [animatedValue]);

  const skeletonColor = isDark ? '#2a2a2a' : '#e0e0e0';

  return (
    <View style={styles.cardContainer}>
      {/* Bloco da Imagem Superior */}
      <Animated.View
        style={[
          styles.imageSkeleton,
          { backgroundColor: skeletonColor, opacity: animatedValue },
        ]}
      />

      {/* Conteúdo Inferior (Título + Subtítulo) */}
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Animated.View
            style={[
              styles.titleSkeleton,
              { backgroundColor: skeletonColor, opacity: animatedValue },
            ]}
          />
          <Animated.View
            style={[
              styles.distanceSkeleton,
              { backgroundColor: skeletonColor, opacity: animatedValue },
            ]}
          />
        </View>

        <Animated.View
          style={[
            styles.subTitleSkeleton,
            { backgroundColor: skeletonColor, opacity: animatedValue },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    marginBottom: 18,
  },
  imageSkeleton: {
    width: '100%',
    height: 165,
    borderRadius: 20,
  },
  contentContainer: {
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleSkeleton: {
    height: 16,
    width: '60%',
    borderRadius: 4,
  },
  distanceSkeleton: {
    height: 12,
    width: '20%',
    borderRadius: 4,
  },
  subTitleSkeleton: {
    height: 13,
    width: '40%',
    borderRadius: 4,
  },
});