import { customType } from 'drizzle-orm/pg-core';

/** A column of raw bytes (Postgres bytea), read and written as a Buffer. */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});
