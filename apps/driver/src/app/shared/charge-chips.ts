import { ChargeWords } from './charge-words';

/** The tone of a status chip: the ww-chip class that colours it. */
export type ChipTone = 'live' | 'info' | 'warn' | 'danger' | 'neutral';

/** A state as a short chip: its tone and its word. */
export interface ChargeChip {
  tone: ChipTone;
  label: string;
}

/** The chips the driver sees for a charge's state and a plug's availability. */
export class ChargeChips {
  static readonly SESSION: Record<string, ChargeChip> = {
    authorising: { tone: 'neutral', label: 'Waiting for your card' },
    starting: { tone: 'info', label: 'Starting' },
    charging: { tone: 'live', label: 'Charging' },
    suspended: { tone: 'warn', label: 'Paused' },
    idle: { tone: 'warn', label: 'Finished, still plugged in' },
    stopping: { tone: 'info', label: 'Stopping' },
    completed: { tone: 'neutral', label: 'Done' },
    not_started: { tone: 'danger', label: 'Did not start' },
    failed: { tone: 'danger', label: 'Failed' },
  };

  static readonly AVAILABILITY: Record<string, ChipTone> = {
    available: 'live',
    busy: 'warn',
    offline: 'neutral',
    out_of_service: 'danger',
    faulted: 'danger',
  };

  /** States in which the car may still be charging: the charge shows a lightning bolt. */
  static readonly UNDER_WAY = [
    'authorising',
    'starting',
    'charging',
    'suspended',
    'idle',
    'stopping',
  ];

  static session(status: string): ChargeChip {
    return ChargeChips.SESSION[status] ?? { tone: 'neutral', label: ChargeWords.session(status) };
  }

  /** "Available" fits beside the plug's name; the other states keep their longer words. */
  static availability(availability: string): ChargeChip {
    return {
      tone: ChargeChips.AVAILABILITY[availability] ?? 'neutral',
      label: availability === 'available' ? 'Available' : ChargeWords.availability(availability),
    };
  }

  static isUnderWay(status: string): boolean {
    return ChargeChips.UNDER_WAY.includes(status);
  }
}
