import type { CapacitorConfig } from '@capacitor/cli';

// The mobile app's native shell (module 30). `npx nx run mobile:sync` builds the web part into
// dist/apps/mobile and copies it into the Android and iOS projects beside this file.
// CAPACITOR_CLEARTEXT=true allows plain http, for a phone that talks to a development machine:
// for the phone (cleartext) and for the app's own page, which runs at https://localhost and may
// otherwise not call an http server (mixed content).
const isCleartext = process.env['CAPACITOR_CLEARTEXT'] === 'true';
const config: CapacitorConfig = {
  appId: 'com.wattwisely.driver',
  appName: 'Wattwisely',
  webDir: '../../dist/apps/mobile/browser',
  server: {
    androidScheme: 'https',
    cleartext: isCleartext,
  },
  android: {
    allowMixedContent: isCleartext,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
