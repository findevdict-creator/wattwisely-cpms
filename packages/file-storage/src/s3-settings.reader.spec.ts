import { S3SettingsReader } from './s3-settings.reader';

describe('S3SettingsReader', () => {
  it('means no object storage when no endpoint is set', () => {
    expect(S3SettingsReader.read({})).toEqual({
      s3Endpoint: '',
      s3Bucket: 'wattwisely',
      s3Region: 'us-east-1',
      s3AccessKey: '',
      s3SecretKey: '',
    });
  });

  it('reads an endpoint with its keys', () => {
    const settings = S3SettingsReader.read({
      S3_ENDPOINT: 'http://object-storage:8333',
      S3_BUCKET: 'files',
      S3_ACCESS_KEY: 'key',
      S3_SECRET_KEY: 'secret',
    });

    expect(settings).toMatchObject({ s3Endpoint: 'http://object-storage:8333', s3Bucket: 'files' });
  });

  it('refuses an endpoint without keys, or one that is not http(s)', () => {
    expect(() => S3SettingsReader.read({ S3_ENDPOINT: 'http://object-storage:8333' })).toThrow(
      'S3_ACCESS_KEY',
    );
    expect(() =>
      S3SettingsReader.read({
        S3_ENDPOINT: 'object-storage',
        S3_ACCESS_KEY: 'k',
        S3_SECRET_KEY: 's',
      }),
    ).toThrow('http');
  });
});
