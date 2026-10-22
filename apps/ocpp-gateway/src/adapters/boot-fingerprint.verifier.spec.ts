import { BootFingerprintVerifier } from './boot-fingerprint.verifier';

describe('BootFingerprintVerifier', () => {
  const reported = { vendor: 'Alfen', model: 'Eve', serial: 'SN-1' };

  it('never checks chargers that have a password', () => {
    expect(
      BootFingerprintVerifier.verify(
        'password',
        { vendor: 'x', model: 'y', serial: 'z' },
        reported,
      ),
    ).toEqual({
      status: 'accepted',
      fingerprint: null,
      reason: null,
    });
  });

  it('stores the first boot of a password-less charger', () => {
    expect(BootFingerprintVerifier.verify('none', null, reported)).toEqual({
      status: 'accepted',
      fingerprint: reported,
      reason: null,
    });
  });

  it('accepts a matching boot without touching the stored fingerprint, and rejects a mismatch', () => {
    expect(BootFingerprintVerifier.verify('none', reported, { ...reported })).toMatchObject({
      status: 'accepted',
      fingerprint: null,
    });
    expect(
      BootFingerprintVerifier.verify('none', reported, { ...reported, serial: 'SN-2' }),
    ).toMatchObject({
      status: 'rejected',
      reason: 'fingerprint_mismatch',
    });
    expect(
      BootFingerprintVerifier.verify('none', reported, { ...reported, vendor: 'Other' }),
    ).toMatchObject({ status: 'rejected' });
  });

  it('falls back to the model when neither boot carried a serial', () => {
    const noSerial = { vendor: 'Alfen', model: 'Eve', serial: null };
    expect(BootFingerprintVerifier.verify('none', noSerial, { ...noSerial })).toMatchObject({
      status: 'accepted',
    });
    expect(
      BootFingerprintVerifier.verify('none', noSerial, { ...noSerial, model: 'Eve Pro' }),
    ).toMatchObject({ status: 'rejected' });
    expect(
      BootFingerprintVerifier.verify('none', noSerial, { ...noSerial, serial: 'SN-1' }),
    ).toMatchObject({ status: 'rejected' });
  });
});
