/**
 * Settings that differ per deployment. They are read from /config.json when the app
 * starts, so one built image runs on any server; nothing environment-specific is compiled in.
 */
export class RuntimeConfig {
  constructor(readonly apiUrl: string) {}
}
