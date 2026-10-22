import { timestamp } from 'drizzle-orm/pg-core';

/** created_at and updated_at, which every table carries (Database Design, Conventions). */
export class Timestamps {
  static columns() {
    return {
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    };
  }
}
