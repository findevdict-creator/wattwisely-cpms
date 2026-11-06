import { Injectable } from '@angular/core';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { DevicePosition, LocationPermission, PositionSource } from '@wattwisely/driver-core';

/** Where the phone is, in degrees. */
export type PhonePosition = DevicePosition;

/**
 * The phone's position for the Nearby list (module 35), through `@capacitor/geolocation`:
 * approximate is enough, so Android asks only for coarse location, and nothing is tracked in
 * the background. In a browser it is the browser's own location. It is the app's
 * PositionSource for the shared Nearby list (module 37).
 */
@Injectable({ providedIn: 'root' })
export class NativeLocation extends PositionSource {
  static readonly TIMEOUT_MS = 10_000;
  static readonly MAX_AGE_MS = 5 * 60_000;

  override async permission(): Promise<LocationPermission> {
    try {
      return NativeLocation.stateOf(await Geolocation.checkPermissions());
    } catch {
      // Location services are off for the whole phone.
      return 'unavailable';
    }
  }

  /** The phone's position; the phone asks the driver first when isAsking and not asked yet. */
  override async position(isAsking: boolean): Promise<PhonePosition | null> {
    let permission = await this.permission();
    if (permission === 'prompt' && isAsking) {
      permission = await Geolocation.requestPermissions({ permissions: ['coarseLocation'] })
        .then(NativeLocation.stateOf)
        .catch((): LocationPermission => 'unavailable');
    }
    if (permission !== 'granted') {
      return null;
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: NativeLocation.TIMEOUT_MS,
      maximumAge: NativeLocation.MAX_AGE_MS,
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  }

  private static stateOf(status: PermissionStatus): LocationPermission {
    const state = status.coarseLocation;
    if (state === 'granted' || state === 'denied') {
      return state;
    }
    return 'prompt';
  }
}
