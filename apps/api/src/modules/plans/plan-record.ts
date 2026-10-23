import { addons, plans } from '@wattwisely/db';

/** One plans row. */
export type PlanRecord = typeof plans.$inferSelect;

/** One addons row: the price of an add-on module. */
export type AddonRecord = typeof addons.$inferSelect;
