import { DatabaseOnlyStore } from './database-only.store';
import { FileStoreFactory } from './file-store.factory';
import { S3FileStore } from './s3-file.store';

describe('FileStoreFactory', () => {
  const settings = {
    s3Endpoint: '',
    s3Bucket: 'wattwisely',
    s3Region: 'us-east-1',
    s3AccessKey: 'key',
    s3SecretKey: 'secret',
  };

  it('keeps files in Postgres when no endpoint is set', async () => {
    const store = FileStoreFactory.create(settings);

    expect(store).toBeInstanceOf(DatabaseOnlyStore);
    expect(store.isEnabled).toBe(false);
    await expect(store.put('exports/a.csv.gz', Buffer.from('x'), 'text/csv')).rejects.toThrow(
      'No object storage',
    );
  });

  it('uses S3 when an endpoint is set', () => {
    const store = FileStoreFactory.create({
      ...settings,
      s3Endpoint: 'http://object-storage:8333',
    });

    expect(store).toBeInstanceOf(S3FileStore);
    expect(store.isEnabled).toBe(true);
  });
});
