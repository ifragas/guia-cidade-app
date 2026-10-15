// src/utils/MapHelper.js
import { Linking, Platform, ActionSheetIOS, Alert } from 'react-native';

/**
 * Abre o app de navegação escolhido com as coordenadas passadas
 */
export const abrirNavegacao = (latitude, longitude, nomeLocal = '') => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    Alert.alert('Erro', 'Coordenadas geográficas inválidas para este local.');
    return;
  }

  const label = encodeURIComponent(nomeLocal);

  const opcoes = [
    {
      label: 'Google Maps',
      url: Platform.OS === 'ios' 
        ? `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      fallbackUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    },
    {
      label: 'Waze',
      url: `waze://?ll=${lat},${lng}&navigate=yes`,
      fallbackUrl: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    },
  ];

  if (Platform.OS === 'ios') {
    opcoes.unshift({
      label: 'Apple Maps',
      url: `maps://?q=${label}&ll=${lat},${lng}`,
      fallbackUrl: `maps://?q=${label}&ll=${lat},${lng}`,
    });
  }

  const abrirUrl = async (url, fallbackUrl) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } catch (err) {
      await Linking.openURL(fallbackUrl);
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...opcoes.map(o => o.label), 'Cancelar'],
        cancelButtonIndex: opcoes.length,
        title: 'Como deseja navegar?',
        message: `Escolha o aplicativo para traçar a rota até ${nomeLocal}`,
      },
      (buttonIndex) => {
        if (buttonIndex < opcoes.length) {
          const escolha = opcoes[buttonIndex];
          abrirUrl(escolha.url, escolha.fallbackUrl);
        }
      }
    );
  } else {
    // No Android, exibe um alerta de escolha simples
    Alert.alert(
      'Como deseja navegar?',
      `Escolha o aplicativo de rotas para ${nomeLocal}`,
      [
        ...opcoes.map(opcao => ({
          text: opcao.label,
          onPress: () => abrirUrl(opcao.url, opcao.fallbackUrl),
        })),
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }
};