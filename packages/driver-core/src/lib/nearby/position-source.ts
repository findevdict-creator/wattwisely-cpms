/** Where the driver's device is, in degrees. */
export interface DevicePosition {
  latitude: number;
  longitude: number;
}

/** Whether the app may know where the device is: allowed, refused, not asked yet, or impossible. */
export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unavailable';

/**
 * The device's position as the shared Nearby list sees it (module 37). The mobile app answers
 * with the phone's own location through Capacitor, the driver web app with the browser's.
 */
export abstract class PositionSource {
  abstract permission(): Promise<LocationPermission>;

  /** The position; the device asks the driver first when isAsking and not asked yet. */
  abstract position(isAsking: boolean): Promise<DevicePosition | null>;
}
