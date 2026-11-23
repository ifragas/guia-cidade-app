// app.config.js
require('dotenv').config({ path: `.env.${process.env.APP_ENV || 'rolante'}` });

export default {
  expo: {
    name: process.env.APP_NAME || 'Guia da Cidade',
    slug: process.env.APP_SLUG || 'guia-cidade',
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
      appEnv: process.env.APP_ENV || 'rolante',  // 🚨 NOVO: expõe o APP_ENV
      cityId: process.env.CITY_ID || 'rolante',
      eas: {
        projectId: "4bdd71a6-f2ca-4d92-abd9-fdb2698f80a2"
      }
    }
  }
};