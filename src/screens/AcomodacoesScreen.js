// src/screens/AcomodacoesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ImageBackground,
} from 'react-native';

// 🔹 Importe o hook de tradução
import { useTranslation } from 'react-i18next';

// Imagem com cache
import { Image } from 'expo-image';

// Ícones
import { Ionicons } from '@expo/vector-icons';

// URL da API
const API_URL = 'https://turismo-api-vv62.onrender.com/api/acomodacoes';

export default function AcomodacoesScreen({ navigation }) {
  const [acomodacoes, setAcomodacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 🔹 Inicialize a tradução
  const { t } = useTranslation();

  const buscarAcomodacoes = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Erro na API');
      const data = await response.json();
      setAcomodacoes(data);
    } catch (error) {
      Alert.alert('Erro', t('failedToLoadAccommodations'));
      console.error('Erro ao buscar:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    buscarAcomodacoes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    buscarAcomodacoes();
  };

  // ✅ Filtra as acomodações pela busca
  const filteredAcomodacoes = acomodacoes.filter(acomodacao =>
    acomodacao.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('Detalhes', {
          id: item.id,
          nome: item.nome,
          descricao: item.descricao,
          endereco: item.endereco,
          horario: item.horario,
          imagem: item.imagem,
          imagens: item.imagens || [],
          tipo: 'Acomodação',
          latitude: item.latitude,
          longitude: item.longitude,
        })
      }
    >
      <ImageBackground
        source={{ uri: item.imagem || item.imagens?.[0] || '/placeholder.jpg' }}
        style={styles.cardImage}
        contentFit="cover"
        placeholder={require('../../assets/placeholder.jpg')}
        cachePolicy="memory-disk"
        onError={(e) => {
          e.target.src = '/placeholder.jpg';
        }}
      >
        <View style={styles.cardOverlay}>
          <Text style={styles.cardNome}>{item.nome}</Text>
          <Text style={styles.cardDescricao} numberOfLines={2}>
            {item.descricao.substring(0, 100)}...
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ Barra de pesquisa */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
      </View>

   
      {/* Lista de cards */}
      <FlatList
        data={filteredAcomodacoes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noResults')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  // ✅ Barra de pesquisa (mesmo estilo do HomeScreen)
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
  },
  searchIcon: {
    marginLeft: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  card: {
    width: '100%',
    height: 180,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#b0e0e6',
    backgroundColor: '#f0f8ff',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 15,
    justifyContent: 'flex-end',
  },
  cardNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  cardDescricao: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});