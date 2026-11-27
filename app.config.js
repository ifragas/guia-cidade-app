require('dotenv').config({ path: `.env.${process.env.APP_ENV || 'rolante'}` });

console.log('🔍 [APP.CONFIG] APP_ENV:', process.env.APP_ENV);
console.log('🔍 [APP.CONFIG] CITY_ID:', process.env.CITY_ID);
console.log('🔍 [APP.CONFIG] APP_NAME:', process.env.APP_NAME);

export default {
  expo: {
    name: process.env.APP_NAME || 'Guia da Cidade',
    slug: 'guia-cidade-app', // Mantido fixo para bater com o projectId do EAS
    version: '1.0.0',
    orientation: 'portrait',
    icon: process.env.APP_ICON || './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: process.env.APP_SPLASH || './assets/splash.png',
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
        foregroundImage: process.env.APP_ICON || './assets/adaptive-icon.png',
        backgroundColor: process.env.APP_COLOR || '#ffffff'
      },
      package: process.env.APP_ID || 'com.ianfraga.guianativo',
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