/** How to reach an S3-compatible store (SeaweedFS in deploy/, or any S3 service). */
export interface S3Settings {
  /** e.g. http://object-storage:8333; empty means no object storage. */
  s3Endpoint: string;
  s3Bucket: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
}
