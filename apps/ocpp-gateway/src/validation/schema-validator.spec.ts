import { OcppCallError } from '../transport/ocpp-call-error';
import { SchemaValidator } from './schema-validator';
import { V16Schemas } from './v16-schemas';

describe('SchemaValidator', () => {
  const validator = new SchemaValidator(V16Schemas.SHARED, V16Schemas.MESSAGES);

  it('knows the OCPP 1.6 messages the gateway handles and their replies', () => {
    for (const message of [
      'BootNotification',
      'Heartbeat',
      'StatusNotification',
      'Authorize',
      'StartTransaction',
      'StopTransaction',
      'MeterValues',
      'RemoteStartTransactionResponse',
    ]) {
      expect(validator.knows(message)).toBe(true);
    }
    expect(validator.knows('DataTransfer')).toBe(false);
  });

  it('accepts valid payloads, including the shared IdTagInfo and MeterValue shapes', () => {
    expect(() =>
      validator.validate('BootNotification', { chargePointVendor: 'v', chargePointModel: 'm' }),
    ).not.toThrow();
    expect(() =>
      validator.validate('MeterValues', {
        connectorId: 1,
        meterValue: [{ timestamp: '2026-01-01T00:00:00Z', sampledValue: [{ value: '1' }] }],
      }),
    ).not.toThrow();
    expect(() =>
      validator.validate('StartTransactionResponse', {
        transactionId: 1,
        idTagInfo: { status: 'Accepted' },
      }),
    ).not.toThrow();
  });

  it('names the field in TypeConstraintViolation and PropertyConstraintViolation', () => {
    const typeError = (() => {
      try {
        validator.validate('StartTransaction', {
          connectorId: '1',
          idTag: 'x',
          meterStart: 0,
          timestamp: '2026-01-01T00:00:00Z',
        });
      } catch (error) {
        return error as OcppCallError;
      }
      return null;
    })();
    expect(typeError).toMatchObject({
      code: 'TypeConstraintViolation',
      details: { field: 'connectorId' },
    });

    expect(() => validator.validate('BootNotification', { chargePointVendor: 'v' })).toThrow(
      /PropertyConstraintViolation/,
    );
    expect(() =>
      validator.validate('StatusNotification', {
        connectorId: 1,
        errorCode: 'Nope',
        status: 'Available',
      }),
    ).toThrow(/errorCode/);
    expect(() => validator.validate('Heartbeat', { extra: 1 })).toThrow(
      /PropertyConstraintViolation/,
    );
    expect(() => validator.validate('Unknown', {})).toThrow(/NotImplemented/);
  });

  it('checks that timestamps are RFC 3339', () => {
    expect(() =>
      validator.validate('StartTransaction', {
        connectorId: 1,
        idTag: 'x',
        meterStart: 0,
        timestamp: 'yesterday',
      }),
    ).toThrow(/timestamp/);
    expect(SchemaValidator.DATE_TIME.test('2026-03-04T05:06:07.123+02:00')).toBe(true);
  });
});
