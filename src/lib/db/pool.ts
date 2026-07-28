import { Pool, types } from "pg";

// pg por padrão parseia date/timestamp/timestamptz em objetos Date do JS.
// O código todo foi escrito contra o supabase-js (PostgREST), que sempre
// devolve string ISO — telas fazem .split(), comparação lexicográfica,
// passam direto pra <input type="date">, etc. esperando string. Sem isso,
// qualquer coluna de data quebra com "x.split is not a function" assim que
// chega numa tela que não espera um Date object.
types.setTypeParser(types.builtins.DATE, (val) => val);
types.setTypeParser(types.builtins.TIMESTAMP, (val) =>
  val ? new Date(val + "Z").toISOString() : val,
);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val) =>
  val ? new Date(val).toISOString() : val,
);

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
