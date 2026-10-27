import { DeleteBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';
import { S3Settings } from './s3-settings';
import { S3FileStore } from './s3-file.store';

/**
 * Against a real S3 server: set TEST_S3_ENDPOINT (CI starts SeaweedFS with the access key
 * "test" and the secret "test-secret"). In CI a missing endpoint is an error, never a skip.
 */
class TestS3 {
  static isConfigured(): boolean {
    if (!process.env['TEST_S3_ENDPOINT'] && process.env['CI']) {
      throw new Error('TEST_S3_ENDPOINT must be set in CI');
    }
    return Boolean(process.env['TEST_S3_ENDPOINT']);
  }
}

(TestS3.isConfigured() ? describe : describe.skip)('S3FileStore', () => {
  const settings: S3Settings = {
    s3Endpoint: process.env['TEST_S3_ENDPOINT'] ?? '',
    s3Bucket: `ww-test-${randomBytes(4).toString('hex')}`,
    s3Region: 'us-east-1',
    s3AccessKey: process.env['TEST_S3_ACCESS_KEY'] ?? 'test',
    s3SecretKey: process.env['TEST_S3_SECRET_KEY'] ?? 'test-secret',
  };
  const store = new S3FileStore(settings);

  // Each bucket takes storage of its own in SeaweedFS: leave none behind.
  afterAll(async () => {
    const client = new S3Client({
      endpoint: settings.s3Endpoint,
      region: settings.s3Region,
      forcePathStyle: true,
      credentials: { accessKeyId: settings.s3AccessKey, secretAccessKey: settings.s3SecretKey },
    });
    await client
      .send(new DeleteBucketCommand({ Bucket: settings.s3Bucket }))
      .catch(() => undefined);
    client.destroy();
  });

  it('creates its bucket once, then finds it', async () => {
    await store.prepare();
    await expect(store.prepare()).resolves.toBeUndefined();
  });

  it('writes, reads and removes a file', async () => {
    const body = Buffer.from('id,energy\n1,12.5\n', 'utf8');
    await store.put('exports/tenant/one.csv.gz', body, 'application/gzip');

    expect((await store.get('exports/tenant/one.csv.gz')).equals(body)).toBe(true);

    await store.remove('exports/tenant/one.csv.gz');
    await expect(store.get('exports/tenant/one.csv.gz')).rejects.toThrow();
    await expect(store.remove('exports/tenant/one.csv.gz')).resolves.toBeUndefined();
  });
});
