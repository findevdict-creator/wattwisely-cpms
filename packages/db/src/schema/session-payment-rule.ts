/** How a session was started (module 19); see the session_start_source enum. */
export type SessionStartSource = 'rfid_card' | 'guest_card' | 'chat' | 'account' | 'staff';

/** Who pays for a session, and who decided it (module 19). */
export type PaymentOutcome = 'pay' | 'free';

/**
 * Which level settled the payment rule: the RFID card, the driver, one of the driver's groups,
 * the operator's standard (always pay), staff starting it from the portal, or a guest with no
 * record at the operator (always pay).
 */
export type PaymentDecider = 'card' | 'driver' | 'group' | 'operator' | 'staff' | 'guest';

/**
 * The payment rule applied to a session when it started, kept on the row so the portal and the
 * receipt can say "Free (Depot staff)" long after the group or the card changed.
 */
export interface SessionPaymentRule {
  outcome: PaymentOutcome;
  decided_by: PaymentDecider;
  /** The group's name when a group decided; null otherwise. */
  label: string | null;
}
