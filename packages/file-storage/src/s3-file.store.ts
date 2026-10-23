import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { FileStore } from './file-store';
import { S3Settings } from './s3-settings';

/**
 * Files in an S3 bucket. Path-style addresses (http://host:port/bucket/key), because
 * SeaweedFS and most self-hosted stores do not serve bucket sub-domains.
 */
export class S3FileStore extends FileStore {
  readonly isEnabled = true;
  private readonly client: S3Client;

  constructor(private readonly settings: S3Settings) {
    super();
    this.client = new S3Client({
      endpoint: settings.s3Endpoint,
      region: settings.s3Region,
      forcePathStyle: true,
      credentials: { accessKeyId: settings.s3AccessKey, secretAccessKey: settings.s3SecretKey },
    });
  }

  async prepare(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.settings.s3Bucket }));
    } catch (error) {
      if (!S3FileStore.isMissing(error)) {
        throw error;
      }
      await this.client.send(new CreateBucketCommand({ Bucket: this.settings.s3Bucket }));
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.settings.s3Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const answer = await this.client.send(
      new GetObjectCommand({ Bucket: this.settings.s3Bucket, Key: key }),
    );
    if (!answer.Body) {
      throw new Error(`No body for ${key}`);
    }
    return Buffer.from(await answer.Body.transformToByteArray());
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.settings.s3Bucket, Key: key }));
  }

  private static isMissing(error: unknown): boolean {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    return status === 404 || (error as Error).name === 'NotFound';
  }
}
