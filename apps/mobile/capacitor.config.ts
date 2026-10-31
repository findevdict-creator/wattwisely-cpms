import type { CapacitorConfig } from '@capacitor/cli';

// The mobile app's native shell (module 30). `npx nx run mobile:sync` builds the web part into
// dist/apps/mobile and copies it into the Android and iOS projects beside this file.
// CAPACITOR_CLEARTEXT=true allows plain http, for a phone that talks to a development machine.
const config: CapacitorConfig = {
  appId: 'com.wattwisely.driver',
  appName: 'Wattwisely',
  webDir: '../../dist/apps/mobile/browser',
  server: {
    androidScheme: 'https',
    cleartext: process.env['CAPACITOR_CLEARTEXT'] === 'true',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    // A push that arrives while the app is open shows as on the lock screen (module 34).
    PushNotifications: {
      presentationOptions: ['banner', 'list', 'sound'],
    },
  },
};

export default config;
