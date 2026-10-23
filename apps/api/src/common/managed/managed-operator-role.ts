/**
 * The Managed operator system role (module 10, story MGT-02): the role Wattwisely staff hold
 * inside a managed tenant. Created by migration 0016 with a fixed id, like the other system
 * roles. Only the admin console assigns and removes it; the portal shows it and refuses to
 * give, change or take it.
 */
export class ManagedOperatorRole {
  static readonly ID = '00000000-0000-7000-8000-000000000006';
  static readonly KEY = 'managed-operator';
  static readonly NAME = 'Managed operator';
  /** How the portal and the audit log name the people behind the role. */
  static readonly LABEL = 'Wattwisely';
}
