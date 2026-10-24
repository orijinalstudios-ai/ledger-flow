import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ledgerflow.app',
  appName: 'LedgerFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
