import { BrowserLocation } from './browser-location';

describe('BrowserLocation', () => {
  const denied = 1;
  const original = { geolocation: navigator.geolocation, permissions: navigator.permissions };

  function browser(
    state: PermissionState | null,
    answer: (ok: PositionCallback, fail: PositionErrorCallback) => void,
  ) {
    const getCurrentPosition = jest.fn(answer);
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: state
        ? { query: jest.fn(async () => ({ state })) }
        : { query: jest.fn(async () => Promise.reject(new TypeError('unsupported'))) },
    });
    return getCurrentPosition;
  }

  const at = (ok: PositionCallback) =>
    ok({ coords: { latitude: 53.35, longitude: -6.26 } } as GeolocationPosition);

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: original.geolocation,
    });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: original.permissions,
    });
  });

  it('does not ask the browser until the driver taps "Use my location"', async () => {
    const getCurrentPosition = browser('prompt', at);
    const location = new BrowserLocation();
    expect(await location.position(false)).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(await location.position(true)).toEqual({ latitude: 53.35, longitude: -6.26 });
  });

  it('looks straight away once allowed, and never once refused', async () => {
    browser('granted', at);
    expect(await new BrowserLocation().position(false)).toEqual({
      latitude: 53.35,
      longitude: -6.26,
    });
    const getCurrentPosition = browser('denied', at);
    expect(await new BrowserLocation().position(true)).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('reads a refusal in the browser prompt as no position', async () => {
    browser(null, (_ok, fail) =>
      fail({ code: denied, PERMISSION_DENIED: denied } as GeolocationPositionError),
    );
    const location = new BrowserLocation();
    expect(await location.permission()).toBe('prompt');
    expect(await location.position(true)).toBeNull();
  });
});
