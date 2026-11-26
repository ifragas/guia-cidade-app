import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, ActivityIndicator, Image as RNImage, StatusBar,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCity } from '../context/CityContext';
import { perguntarIA } from '../services/aiService';
import useConnectivity from '../hooks/useConnectivity';
import OfflineBanner from '../components/OfflineBanner';

const LOGO_URI = require('../../assets/smart-turismo.png');
const FUNDO_URI = require('../../assets/fundo-selecao.jpg');

const SUGESTOES_INICIAIS = [
  { id: 1, texto: '💡 Sugira um roteiro de 1 dia', pergunta: 'Me sugira um roteiro de 1 dia para conhecer a cidade' },
  { id: 2, texto: '🍽️ Onde comer bem?', pergunta: 'Quais são os melhores restaurantes da cidade?' },
  { id: 3, texto: '⚕️ Farmácia 24h', pergunta: 'Onde encontro farmácia ou serviço de saúde 24 horas?' },
  { id: 4, texto: '📸 Pontos turísticos', pergunta: 'Quais são os principais pontos turísticos?' },
];

export default function AIScreen({ navigation }) {
  const { cidadeAtual } = useCity();
  const { isConnected } = useConnectivity();
  const [mensagens, setMensagens] = useState([
    {
      id: 'welcome',
      tipo: 'ia',
      texto: `Olá! 👋 Sou o Guia Smart. Posso te ajudar a descobrir os melhores lugares de ${cidadeAtual?.nome || 'sua cidade'}. O que você quer saber?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [mensagens]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      navigation.setOptions({ tabBarStyle: undefined });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  const enviarMensagem = async (texto) => {
    const pergunta = texto || input.trim();
    if (!pergunta || loading || !isConnected) return;

    console.log('🔍 Enviando para API:', { pergunta, cidadeId: cidadeAtual?.slug });

    const msgUsuario = { id: Date.now().toString(), tipo: 'usuario', texto: pergunta };
    setMensagens(prev => [...prev, msgUsuario]);
    setInput('');
    setLoading(true);

    try {
      const data = await perguntarIA(pergunta, cidadeAtual?.slug);
      const msgIA = {
        id: (Date.now() + 1).toString(),
        tipo: 'ia',
        texto: data.resposta,
        locais: data.locaisMencionados || [],
      };
      setMensagens(prev => [...prev, msgIA]);
    } catch (error) {
      console.error('❌ Erro detalhado da IA:', error?.message || error);
      const msgServidor = error?.data?.error;
      const detalheDev = __DEV__ ? `\n\n[Debug: ${msgServidor || error?.message || 'Erro desconhecido'}]` : '';

      const msgErro = {
        id: (Date.now() + 1).toString(),
        tipo: 'ia',
        texto: `${msgServidor || 'Desculpe, tive um problema para me conectar. Verifique sua internet ou tente novamente.'} 🙏${detalheDev}`,
        erro: true,
      };
      setMensagens(prev => [...prev, msgErro]);
    } finally {
      setLoading(false);
    }
  };

  const limparConversa = () => {
    setMensagens([{
      id: 'welcome',
      tipo: 'ia',
      texto: `Conversa limpa! 🧹 Como posso te ajudar a explorar ${cidadeAtual?.nome || 'a cidade'}?`,
    }]);
  };

  const handleLocalPress = (local) => {
    if (!local?.id) return;
    navigation.navigate('Detalhes', {
      id: local.id,
      tipo: local.tipo,
      nome: local.nome,
    });
  };

  const renderMensagemTexto = (texto, locais, isIA) => {
    if (!locais || locais.length === 0) {
      return <Text style={[styles.messageText, isIA ? styles.messageTextIA : styles.messageTextUser]}>{texto}</Text>;
    }

    const locaisOrdenados = [...locais].sort((a, b) => b.nome.length - a.nome.length);
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${locaisOrdenados.map(l => escapeRegExp(l.nome)).join('|')})`, 'gi');
    const partes = texto.split(pattern);

    return (
      <Text style={[styles.messageText, isIA ? styles.messageTextIA : styles.messageTextUser]}>
        {partes.map((parte, index) => {
          const localEncontrado = locais.find(l => l.nome.toLowerCase() === parte.toLowerCase());
          if (localEncontrado && localEncontrado.id) {
            return (
              <Text
                key={index}
                style={[styles.messageText, styles.messageTextIA, styles.localLink]}
                onPress={() => handleLocalPress(localEncontrado)}
              >
                {parte}
              </Text>
            );
          }
          return <Text key={index}>{parte}</Text>;
        })}
      </Text>
    );
  };

  const renderItem = ({ item }) => {
    const isIA = item.tipo === 'ia';
    return (
      <View style={[styles.messageRow, isIA ? styles.messageRowIA : styles.messageRowUser]}>
        {isIA && (
          <View style={styles.avatarIA}>
            <RNImage source={LOGO_URI} style={styles.avatarLogo} resizeMode="contain" />
          </View>
        )}
        <View style={[styles.bubble, isIA ? styles.bubbleIA : styles.bubbleUser]}>
          {renderMensagemTexto(item.texto, item.locais, isIA)}
          {item.locais && item.locais.length > 0 && (
            <View style={styles.locaisContainer}>
              {item.locais.map((local, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.localChip}
                  onPress={() => handleLocalPress(local)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={12} color="#F59E0B" />
                  <Text style={styles.localChipText}>{local.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <RNImage source={FUNDO_URI} style={styles.backgroundImage} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(7, 27, 66, 0.40)', 'rgba(7, 27, 66, 0.70)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.overlayGradient}
        pointerEvents="none"
      />

      {/* 🚨 BANNER OFFLINE (já tem SafeArea embutido) */}
      <OfflineBanner visible={!isConnected} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.innerContainer}>

            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="sparkles" size={22} color="#F59E0B" />
                <Text style={styles.headerTitle}>Assistente Smart</Text>
              </View>
              <TouchableOpacity onPress={limparConversa} style={styles.clearButton}>
                <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            {/* LISTA DE MENSAGENS */}
            <FlatList
              ref={flatListRef}
              data={mensagens}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                mensagens.length === 1 ? (
                  <View style={styles.sugestoesContainer}>
                    <Text style={styles.sugestoesTitulo}>Experimente perguntar:</Text>
                    {SUGESTOES_INICIAIS.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.sugestaoChip,
                          !isConnected && styles.sugestaoChipDisabled,
                        ]}
                        onPress={() => enviarMensagem(s.pergunta)}
                        disabled={loading || !isConnected}
                        activeOpacity={isConnected ? 0.8 : 1}
                      >
                        <Text style={[
                          styles.sugestaoText,
                          !isConnected && styles.sugestaoTextDisabled,
                        ]}>
                          {s.texto}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null
              }
              ListFooterComponent={
                loading ? (
                  <View style={styles.messageRowIA}>
                    <View style={styles.avatarIA}>
                      <RNImage source={LOGO_URI} style={styles.avatarLogo} resizeMode="contain" />
                    </View>
                    <View style={[styles.bubble, styles.bubbleIA]}>
                      <ActivityIndicator size="small" color="#F59E0B" />
                      <Text style={styles.typingText}>Guia Smart está pensando...</Text>
                    </View>
                  </View>
                ) : null
              }
            />

            {/* 🚨 AVISO OFFLINE DENTRO DO CHAT */}
            {!isConnected && (
              <View style={styles.offlineChatNotice}>
                <Ionicons name="cloud-offline-outline" size={18} color="#F59E0B" />
                <Text style={styles.offlineChatText}>
                  Assistente indisponível sem internet. Conecte-se para continuar conversando.
                </Text>
              </View>
            )}

            {/* INPUT */}
            <View style={[
              styles.inputContainer,
              !isConnected && styles.inputContainerDisabled,
            ]}>
              <TextInput
                style={[
                  styles.input,
                  !isConnected && styles.inputDisabled,
                ]}
                placeholder={isConnected ? "Pergunte algo sobre a cidade..." : "Assistente indisponível (sem internet)"}
                placeholderTextColor={isConnected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)"}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => enviarMensagem()}
                returnKeyType="send"
                multiline
                maxLength={500}
                editable={isConnected && !loading}
                pointerEvents={isConnected ? 'auto' : 'none'}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!input.trim() || loading || !isConnected) && styles.sendButtonDisabled,
                ]}
                onPress={() => enviarMensagem()}
                disabled={!input.trim() || loading || !isConnected}
                activeOpacity={isConnected ? 0.7 : 1}
              >
                <Ionicons name="send" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#071B42' },
  backgroundImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  overlayGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  keyboardAvoid: { flex: 1, zIndex: 10 },
  safeArea: { flex: 1 },
  innerContainer: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: 'rgba(11, 45, 107, 0.85)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  clearButton: { padding: 8 },

  listContent: { padding: 16 },

  sugestoesContainer: { marginBottom: 16 },
  sugestoesTitulo: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  sugestaoChip: {
    backgroundColor: 'rgba(11, 45, 107, 0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, marginBottom: 8,
  },
  sugestaoChipDisabled: {
    opacity: 0.4,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sugestaoText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sugestaoTextDisabled: { color: 'rgba(255,255,255,0.4)' },

  messageRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  messageRowIA: { justifyContent: 'flex-start' },
  messageRowUser: { justifyContent: 'flex-end' },

  avatarIA: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarLogo: { width: 24, height: 24 },

  bubble: { maxWidth: '78%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18 },
  bubbleIA: { backgroundColor: 'rgba(255,255,255,0.1)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bubbleUser: { backgroundColor: '#F59E0B', borderBottomRightRadius: 4 },

  messageText: { fontSize: 14, lineHeight: 20 },
  messageTextIA: { color: '#fff' },
  messageTextUser: { color: '#0f172a', fontWeight: '600' },
  typingText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6, fontStyle: 'italic' },

  localLink: {
    color: '#F59E0B',
    fontWeight: '800',
    textDecorationLine: 'underline',
    paddingVertical: 2,
  },

  locaisContainer: { marginTop: 10, gap: 6 },
  localChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  localChipText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },

  // 🚨 AVISO OFFLINE DENTRO DO CHAT
  offlineChatNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  offlineChatText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 10,
    backgroundColor: 'rgba(11, 45, 107, 0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  inputContainerDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: '#fff', fontSize: 14, maxHeight: 100,
  },
  inputDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#F59E0B', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  sendButtonDisabled: { opacity: 0.4 },
});