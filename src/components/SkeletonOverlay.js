import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image as RNImage } from 'react-native';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FUNDO_URI = require('../../assets/fundo-selecao.jpg');

export default function SkeletonOverlay({ visible, type = 'list' }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const loop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [visible]);

  if (!visible) return null;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const renderBackground = () => (
    <>
      <RNImage source={FUNDO_URI} style={styles.background} resizeMode="cover" />
      <View style={styles.overlay} />
      <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]} />
    </>
  );

  // 🚨 LAYOUT PARA SELEÇÃO DE CIDADES
  if (type === 'cities') {
    return (
      <View style={styles.container} pointerEvents="none">
        {renderBackground()}
        <View style={styles.logoPlaceholder}><View style={[styles.shimmerBox, { width: 350, height: 105, borderRadius: 12 }]} /></View>
        <View style={styles.greetingPlaceholder}><View style={[styles.shimmerLine, { width: '50%', height: 24 }]} /></View>
        <View style={styles.searchPlaceholder}><View style={[styles.shimmerBox, { height: 48, borderRadius: 22 }]} /></View>
        <View style={styles.sectionPlaceholder}>
          <View style={[styles.shimmerLine, { width: '40%', height: 18 }]} />
          <View style={[styles.shimmerLine, { width: '30%', height: 14, marginTop: 8 }]} />
        </View>
        <View style={styles.cardsPlaceholder}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.cityCardPlaceholder}>
              <View style={styles.cardImagePlaceholder} />
              <View style={styles.cardContentPlaceholder}>
                <View style={[styles.shimmerLine, { width: '70%', height: 16 }]} />
                <View style={[styles.shimmerLine, { width: '50%', height: 14, marginTop: 8 }]} />
              </View>
              <View style={styles.badgePlaceholder} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // 🚨 LAYOUT PADRÃO PARA LISTA DE EXPLORAÇÃO
  if (type === 'list') {
    return (
      <View style={styles.container} pointerEvents="none">
        {renderBackground()}
        <View style={styles.logoPlaceholder}><View style={[styles.shimmerBox, { width: 298, height: 89, borderRadius: 12 }]} /></View>
        <View style={styles.titlePlaceholder}><View style={[styles.shimmerLine, { width: '70%', height: 24 }]} /></View>
        <View style={styles.searchPlaceholder}><View style={[styles.shimmerBox, { height: 48, borderRadius: 22 }]} /></View>
        <View style={styles.chipsPlaceholder}>
          <View style={[styles.shimmerChip, { width: 80 }]} />
          <View style={[styles.shimmerChip, { width: 100 }]} />
          <View style={[styles.shimmerChip, { width: 120 }]} />
          <View style={[styles.shimmerChip, { width: 90 }]} />
        </View>
        <View style={styles.sectionPlaceholder}>
          <View style={[styles.shimmerLine, { width: '40%', height: 18 }]} />
          <View style={[styles.shimmerLine, { width: '30%', height: 14, marginTop: 8 }]} />
        </View>
        <View style={styles.cardsPlaceholder}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.cardPlaceholder}>
              <View style={styles.cardImagePlaceholder} />
              <View style={styles.cardContentPlaceholder}>
                <View style={[styles.shimmerLine, { width: '80%', height: 16 }]} />
                <View style={[styles.shimmerLine, { width: '50%', height: 14, marginTop: 8 }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // 🚨 LAYOUT PARA TELA DE DETALHES (altura explícita da tela inteira)
  if (type === 'details') {
    return (
      <View style={styles.detailsWrapper} pointerEvents="none">
        {/* Carrossel placeholder */}
        <View style={styles.detailsCarousel}>
          <View style={[styles.shimmerBox, { width: '100%', height: '100%' }]} />
          <View style={styles.detailsBackButton} />
          <View style={styles.detailsActionsRow}>
            <View style={styles.detailsCircleButton} />
            <View style={styles.detailsCircleButton} />
          </View>
        </View>

        {/* Sheet content placeholder */}
        <View style={styles.detailsSheet}>
          <View style={styles.detailsBadgesRow}>
            <View style={[styles.shimmerBox, { width: 80, height: 24, borderRadius: 12 }]} />
            <View style={[styles.shimmerBox, { width: 110, height: 24, borderRadius: 12 }]} />
          </View>

          <View style={[styles.shimmerBox, { width: '75%', height: 28, borderRadius: 8, marginTop: 16 }]} />

          <View style={{ marginTop: 28 }}>
            <View style={[styles.shimmerBox, { width: '45%', height: 16, borderRadius: 8 }]} />
            <View style={[styles.shimmerBox, { width: '100%', height: 48, borderRadius: 12, marginTop: 10 }]} />
          </View>

          <View style={{ marginTop: 24 }}>
            <View style={[styles.shimmerBox, { width: '30%', height: 16, borderRadius: 8 }]} />
            <View style={[styles.shimmerBox, { width: '100%', height: 14, borderRadius: 8, marginTop: 10 }]} />
            <View style={[styles.shimmerBox, { width: '90%', height: 14, borderRadius: 8, marginTop: 8 }]} />
            <View style={[styles.shimmerBox, { width: '95%', height: 14, borderRadius: 8, marginTop: 8 }]} />
          </View>

          <View style={{ marginTop: 24 }}>
            <View style={[styles.shimmerBox, { width: '25%', height: 16, borderRadius: 8 }]} />
            <View style={[styles.shimmerBox, { width: '100%', height: 14, borderRadius: 8, marginTop: 10 }]} />
          </View>

          <View style={[styles.shimmerBox, { width: '100%', height: 120, borderRadius: 16, marginTop: 24 }]} />
          <View style={[styles.shimmerBox, { width: '100%', height: 48, borderRadius: 24, marginTop: 16 }]} />
        </View>

        {/* Shimmer animado por cima de tudo */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            { transform: [{ translateX: shimmerTranslate }] },
          ]}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: '#071B42',
  },
  background: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7, 27, 66, 0.7)' },
  shimmerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.08)' },

  logoPlaceholder: { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center' },
  greetingPlaceholder: { position: 'absolute', top: 200, left: 20 },
  titlePlaceholder: { position: 'absolute', top: 180, left: 20 },
  searchPlaceholder: { position: 'absolute', top: 260, left: 20, right: 20 },
  chipsPlaceholder: { position: 'absolute', top: 330, left: 20, flexDirection: 'row', gap: 10 },
  sectionPlaceholder: { position: 'absolute', top: 390, left: 20 },
  cardsPlaceholder: { position: 'absolute', top: 450, left: 20, right: 20 },

  shimmerBox: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  shimmerLine: { borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  shimmerChip: { height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  cityCardPlaceholder: {
    flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 18,
    padding: 10, paddingRight: 42, minHeight: 84, marginBottom: 14, position: 'relative',
  },
  cardImagePlaceholder: { width: 84, height: 62, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  cardContentPlaceholder: { flex: 1, marginLeft: 14, marginRight: 8, justifyContent: 'center' },
  badgePlaceholder: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 30, borderTopLeftRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  cardPlaceholder: {
    flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16,
    padding: 12, marginBottom: 12, height: 90,
  },

  // 🚨 CORREÇÃO: Wrapper do details com altura explícita da tela inteira
  detailsWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: SCREEN_HEIGHT,
    zIndex: 100,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  detailsCarousel: {
    width: '100%',
    height: 310,
    position: 'relative',
    backgroundColor: 'rgba(200, 200, 200, 0.4)',
  },
  detailsBackButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(150, 150, 150, 0.5)',
  },
  detailsActionsRow: {
    position: 'absolute',
    top: 48,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  detailsCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(150, 150, 150, 0.5)',
  },
  detailsSheet: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: '#ffffff',
  },
  detailsBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});