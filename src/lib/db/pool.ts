import { Pool } from "pg";

// Uma única pool por processo — reaproveitada entre hot-reloads do `next dev`
// via global, senão cada reload abriria uma pool nova sem fechar a anterior.
declare global {
  // eslint-disable-next-line no-var
  var __erpInovaPgPool: Pool | undefined;
}

export const pool =
  global.__erpInovaPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__erpInovaPgPool = pool;
}
