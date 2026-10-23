/**
 * Where the platform keeps files that are too big for a table row (module 12): today the
 * report exports, later logos and invoices. Keys are paths such as
 * `exports/<tenant id>/<export id>.csv.gz`; the tenant is always part of the key, and the
 * row that names the key is what row-level security guards.
 */
export abstract class FileStore {
  /** False when no object storage is set up: callers keep the bytes in Postgres instead. */
  abstract readonly isEnabled: boolean;

  /** Creates the bucket if it is missing. Safe to call at every start. */
  abstract prepare(): Promise<void>;

  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;

  /** The file's bytes; throws when it is not there. */
  abstract get(key: string): Promise<Buffer>;

  /** Deletes the file; a key that is already gone is fine. */
  abstract remove(key: string): Promise<void>;
}
