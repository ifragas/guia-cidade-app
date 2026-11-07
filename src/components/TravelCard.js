// src/components/TravelCard.js
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Função auxiliar para pegar o ícone correto do serviço
const getIconeServico = (tipoServico) => {
  const icones = {
    saude: 'hospital',
    seguranca: 'police-badge',
    combustivel: 'gas-station',
    mercado: 'shopping',
    automotivo: 'wrench',
    publico: 'city',
    farmacia: 'pharmacy',
    banco: 'bank',
  };
  return icones[tipoServico] || 'information';
};

const TravelCard = ({ item, isDark, isFavorito, userLocation, badgeType, onPress, onToggleFavorito }) => {
  const isServico = badgeType === 'servicos';
  const is24h = item.funcionamento24h === true;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={{
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? '#334155' : '#e2e8f0',
      }}
    >
      {/* Seção da Imagem */}
      <View style={{ position: 'relative' }}>
        <Image 
          source={{ uri: item.imagem || item.imagens?.[0] || 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f' }} 
          style={{ width: '100%', height: 160 }}
          resizeMode="cover"
        />
        
        {/* Botão de Favorito */}
        <TouchableOpacity 
          onPress={onToggleFavorito}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: 20,
            padding: 8,
          }}
        >
          <Ionicons 
            name={isFavorito ? 'heart' : 'heart-outline'} 
            size={20} 
            color={isFavorito ? '#ef4444' : '#ffffff'} 
          />
        </TouchableOpacity>

        {/* Badges: 24h ou Categoria */}
        <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8 }}>
          {isServico && is24h && (
            <View style={{
              backgroundColor: '#dc2626',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold', marginLeft: 4 }}>
                24 HORAS
              </Text>
            </View>
          )}
          
          {!isServico && (
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 6,
            }}>
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
                {badgeType}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Seção de Conteúdo */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text 
              numberOfLines={2}
              style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: isDark ? '#f8fafc' : '#0f172a',
                marginBottom: 4,
              }}
            >
              {item.nome || item.title}
            </Text>
            
            {/* Subtítulo com ícone específico para serviços */}
            {isServico && item.tipoServico && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons 
                  name={getIconeServico(item.tipoServico)} 
                  size={16} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
                <Text style={{ 
                  fontSize: 13, 
                  color: isDark ? '#94a3b8' : '#64748b', 
                  marginLeft: 6,
                  textTransform: 'capitalize'
                }}>
                  {item.tipoServico}
                </Text>
              </View>
            )}

            {/* Endereço */}
            {item.endereco && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                <Text 
                  numberOfLines={1}
                  style={{ 
                    fontSize: 13, 
                    color: isDark ? '#94a3b8' : '#64748b', 
                    marginLeft: 6,
                    flex: 1
                  }}
                >
                  {item.endereco}
                </Text>
              </View>
            )}
          </View>

          {/* Distância (se aplicável) */}
          {userLocation && item.distanciaNum && item.distanciaNum < 9999 && (
            <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0ea5e9' }}>
                {item.distanciaNum < 1 ? `${Math.round(item.distanciaNum * 1000)} m` : `${item.distanciaNum.toFixed(1)} km`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TravelCard;