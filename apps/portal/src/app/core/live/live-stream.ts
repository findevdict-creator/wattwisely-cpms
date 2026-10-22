import { ChargerEvent } from '../api/models/charger-event';

/** An open live stream: call `close` when the page goes away. */
export interface LiveStream {
  close(): void;
}

export type LiveListener = (event: ChargerEvent) => void;
