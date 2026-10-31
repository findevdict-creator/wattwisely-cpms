import { generateKeyPairSync, verify } from 'node:crypto';
import { ApnsPushSender } from './apns-push.sender';
import { FcmPushSender } from './fcm-push.sender';
import { JwtSigner } from './jwt-signer';
import { PlatformPushSender } from './platform-push.sender';

describe('push', () => {
  const message = {
    title: 'Nearly full',
    body: 'Your car is at 80% at Riverside Car Park.',
    data: { url: '/charges/s-1' },
  };

  it('signs the tokens Firebase and Apple ask for', () => {
    for (const [type, alg] of [
      ['rsa', 'RS256'],
      ['ec', 'ES256'],
    ] as const) {
      const keys =
        type === 'rsa'
          ? generateKeyPairSync('rsa', { modulusLength: 2048 })
          : generateKeyPairSync('ec', { namedCurve: 'P-256' });
      const pem = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
      const jwt = JwtSigner.sign({ alg, kid: 'K1' }, { iss: 'team', iat: 1 }, pem);
      const [header, claims, signature] = jwt.split('.');
      expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({
        iss: 'team',
        iat: 1,
      });
      const isValid = verify(
        'sha256',
        Buffer.from(`${header}.${claims}`),
        { key: keys.publicKey, ...(alg === 'ES256' ? { dsaEncoding: 'ieee-p1363' as const } : {}) },
        Buffer.from(signature, 'base64url'),
      );
      expect(isValid).toBe(true);
    }
  });

  it('writes the FCM message and tells a gone token from another failure', () => {
    expect(FcmPushSender.body('tok', message)).toEqual({
      message: {
        token: 'tok',
        notification: { title: 'Nearly full', body: 'Your car is at 80% at Riverside Car Park.' },
        data: { url: '/charges/s-1' },
        android: { priority: 'high', notification: { channel_id: 'charging' } },
      },
    });
    const gone = { error: { message: 'Not found', details: [{ errorCode: 'UNREGISTERED' }] } };
    expect(FcmPushSender.failure(404, gone)).toMatchObject({ isTokenInvalid: true });
    expect(
      FcmPushSender.failure(503, { error: { message: 'Busy', status: 'UNAVAILABLE' } }),
    ).toEqual({ isSent: false, isTokenInvalid: false, error: 'Busy' });
  });

  it('puts the page to open beside Apple’s alert', () => {
    expect(ApnsPushSender.payload(message)).toEqual({
      aps: {
        alert: { title: 'Nearly full', body: 'Your car is at 80% at Riverside Car Park.' },
        sound: 'default',
      },
      url: '/charges/s-1',
    });
  });

  it('sends nothing to a platform with no credentials', async () => {
    const sender = new PlatformPushSender(null, null);
    expect(sender.isEnabled('android')).toBe(false);
    expect(await sender.send({ platform: 'ios', token: 't' }, message)).toEqual({
      isSent: false,
      isTokenInvalid: false,
      error: 'Push to ios is not configured.',
    });
  });
});
