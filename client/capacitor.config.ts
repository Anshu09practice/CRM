import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jalanjyothi.crm',
  appName: 'JJ CRM',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f8fafc'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#4f46e5',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    StatusBar: {
      backgroundColor: '#4f46e5',
      style: 'LIGHT',
    },
    Keyboard: {
      resize: 'body' as const,
      style: 'dark' as const,
      resizeOnFullScreen: true,
    },
  },
  server: {
    androidScheme: 'https',
    cleartext: false
  }
};

export default config;
