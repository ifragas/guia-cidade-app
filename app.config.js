require('dotenv').config({ path: `.env.${process.env.APP_ENV || 'rolante'}` });

console.log('🔍 [APP.CONFIG] APP_ENV:', process.env.APP_ENV);
console.log('🔍 [APP.CONFIG] CITY_ID:', process.env.CITY_ID);
console.log('🔍 [APP.CONFIG] APP_NAME:', process.env.APP_NAME);
console.log('🔍 [APP.CONFIG] APP_ID:', process.env.APP_ID);

export default {
  expo: {
    name: process.env.APP_NAME || 'Guia da Cidade',
    // 🚨 OBRIGATÓRIO: Slug fixo para bater com o projectId do EAS
    slug: 'guia-cidade-app', 
    version: '1.0.0',
    orientation: 'portrait',
    icon: process.env.APP_ICON || './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: process.env.APP_SPLASH || './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: process.env.APP_COLOR || '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.APP_ID || 'com.ianfraga.guianativo',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: process.env.APP_ICON || './assets/icon.png',
        backgroundColor: process.env.APP_COLOR || '#ffffff'
      },
      package: process.env.APP_ID || 'com.ianfraga.guianativo',
      softwareKeyboardLayoutMode: "resize" 
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      appEnv: process.env.APP_ENV || 'rolante',
      cityId: process.env.CITY_ID || 'rolante',
      eas: {
        projectId: "4bdd71a6-f2ca-4d92-abd9-fdb2698f80a2"
      }
    }
  }
};