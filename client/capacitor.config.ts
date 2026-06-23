import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jalanjyothi.crm',
  appName: 'JJ CRM',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#f8fafc'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e40af',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    StatusBar: {
      backgroundColor: '#1e40af'
    }
  },
  server: {
    // No server needed - everything runs locally
    androidScheme: 'https'
  }
};

export default config;
