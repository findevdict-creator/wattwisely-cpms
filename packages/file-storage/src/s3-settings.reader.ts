import { S3Settings } from './s3-settings';

/**
 * Reads the object storage settings from environment variables, the same names in the API
 * and the worker: S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY.
 * Refuses an endpoint without keys, so a half-done setup stops the service at boot.
 */
export class S3SettingsReader {
  static readonly DEFAULT_BUCKET = 'wattwisely';
  static readonly DEFAULT_REGION = 'us-east-1';

  static read(environment: NodeJS.ProcessEnv): S3Settings {
    const settings: S3Settings = {
      s3Endpoint: (environment['S3_ENDPOINT'] ?? '').trim(),
      s3Bucket: environment['S3_BUCKET'] || S3SettingsReader.DEFAULT_BUCKET,
      s3Region: environment['S3_REGION'] || S3SettingsReader.DEFAULT_REGION,
      s3AccessKey: environment['S3_ACCESS_KEY'] ?? '',
      s3SecretKey: environment['S3_SECRET_KEY'] ?? '',
    };
    S3SettingsReader.check(settings);
    return settings;
  }

  private static check(settings: S3Settings): void {
    if (!settings.s3Endpoint) {
      return;
    }
    if (!/^https?:\/\/[^\s/]+/.test(settings.s3Endpoint)) {
      throw new Error('S3_ENDPOINT must be an http:// or https:// address.');
    }
    if (!settings.s3AccessKey || !settings.s3SecretKey) {
      throw new Error('S3_ENDPOINT is set, so S3_ACCESS_KEY and S3_SECRET_KEY are needed too.');
    }
  }
}
