import { PushPermission } from '../native/native-push';

/** The Notifications screen's line under "Push notifications": what this phone allows. */
export class PushWords {
  static phone(permission: PushPermission, isPushEnabled: boolean): string {
    if (permission === 'unavailable') {
      return 'Only in the app on a phone';
    }
    if (permission === 'denied') {
      return 'Turned off for Wattwisely in the phone’s settings';
    }
    if (!isPushEnabled) {
      return 'Off on all your phones';
    }
    return permission === 'granted' ? 'On this phone' : 'This phone asks you first';
  }
}
