import { WatchedSession } from '../driver-mail/watched-session';

/** A session of a driver with the app, and the account whose phones hear about it (module 34). */
export interface WatchedAccountSession extends WatchedSession {
  driverAccountId: string;
}
