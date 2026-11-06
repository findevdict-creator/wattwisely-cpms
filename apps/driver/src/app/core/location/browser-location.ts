import { Injectable } from '@angular/core';
import { DevicePosition, LocationPermission, PositionSource } from '@wattwisely/driver-core';

/**
 * The browser's idea of where the driver is, for the Nearby list on Home (module 37): rough
 * is enough, so it never asks for high accuracy, and it looks once per visit to Home. The
 * browser asks the driver only after "Use my location".
 */
@Injectable({ providedIn: 'root' })
export class BrowserLocation extends PositionSource {
  static readonly TIMEOUT_MS = 10_000;
  static readonly MAX_AGE_MS = 5 * 60_000;

  override async permission(): Promise<LocationPermission> {
    if (!('geolocation' in navigator)) {
      return 'unavailable';
    }
    try {
      return (await navigator.permissions.query({ name: 'geolocation' })).state;
    } catch {
      // A browser without the Permissions API: it asks when the position is wanted.
      return 'prompt';
    }
  }

  override async position(isAsking: boolean): Promise<DevicePosition | null> {
    const permission = await this.permission();
    if (permission !== 'granted' && !(permission === 'prompt' && isAsking)) {
      return null;
    }
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        // Refused in the browser's own prompt: no position, and the store reads why.
        (error) => (error.code === error.PERMISSION_DENIED ? resolve(null) : reject(error)),
        {
          enableHighAccuracy: false,
          timeout: BrowserLocation.TIMEOUT_MS,
          maximumAge: BrowserLocation.MAX_AGE_MS,
        },
      ),
    );
  }
}
