import { pool } from "./pool";

// Shim mínimo sobre `pg` que replica o subconjunto do estilo PostgREST
// (supabase-js) usado neste projeto: from().select().eq/neq/gt/gte/lt/
// lte/ilike/not().order().limit().single()/.maybeSingle(), e
// .insert()/.update()/.delete()/.upsert() com .select() de volta (RETURNING,
// inclusive embeds tipo "projetos(titulo)"). Objetivo: os arquivos que
// chamam `createClient().from(...)` não precisam mudar a lógica de query —
// só o import (@/lib/supabase/server ou uma Server Action nova).
//
// RLS: cada execução abre conexão própria, faz `SET LOCAL app.user_id` (lido
// por auth.uid() no banco, ver supabase/migrations/0000) e roda dentro de
// uma transação — igual ao que o PostgREST fazia por trás com o JWT.

// União discriminada (não dois campos soltos): reflete o runtime real —
// nunca os dois presentes ou ausentes ao mesmo tempo — e deixa
// `if (error) return; data.algumMetodo()` estreitar `data` pra não-nulo
// depois do check, igual ao PostgrestResponse do supabase-js.
type Resultado<T> = { data: T; error: null } | { data: null; error: { message: string } };

type Filtro = { col: string; op: string; val: unknown };
type OrderSpec = { col: string; ascending: boolean; nullsFirst?: boolean };
type Embed = { table: string; fkColumn: string; cols: string[] };
type Mode = "select" | "update" | "insert" | "delete" | "upsert";

// Singularização ingênua (strip de "s" final) — cobre os únicos casos de
// embed hoje no código (clientes→cliente_id, projetos→projeto_id) e bate
// com o nome real das FKs no schema (supabase/migrations/0001_init.sql).
function fkColumnFor(tabelaEmbed: string) {
  return tabelaEmbed.replace(/s$/, "") + "_id";
}

function parseSelect(selectStr: string) {
  const embeds: Embed[] = [];
  const embedRe = /(\w+)\(([^)]*)\)/g;
  let semEmbeds = selectStr;
  let m: RegExpExecArray | null;
  while ((m = embedRe.exec(selectStr))) {
    const table = m[1];
    const cols = m[2]
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    embeds.push({ table, fkColumn: fkColumnFor(table), cols });
    semEmbeds = semEmbeds.replace(m[0], "");
  }
  const plain = semEmbeds
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return { plain, embeds };
}

// `any` de propósito (igual ao que supabase-js retorna sem generics de
// Database explícito): as telas existentes atribuem `data` direto a
// variáveis já tipadas (ClienteLike[], Perfil, etc.) sem cast — trocar pra
// Record<string, unknown> quebrava todas elas pedindo cast em cada call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class QueryBuilder<T = any>
  implements PromiseLike<Resultado<T[]>>
{
  private selectStr = "*";
  private returningStr: string | null = null;
  private filtros: Filtro[] = [];
  private orders: OrderSpec[] = [];
  private limitN: number | null = null;
  private mode: Mode = "select";
  private mutationValues: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private upsertOnConflict: string | null = null;
  private wantSingle: "single" | "maybeSingle" | null = null;

  constructor(
    private table: string,
    private getUserId: () => Promise<string | null>,
  ) {}

  // Antes de qualquer insert/update/delete/upsert, .select() define as
  // colunas de leitura (comportamento original). Depois de um deles, vira
  // o RETURNING — mesma dualidade do supabase-js. Todo call site deste
  // projeto encadeia nessa ordem (insert(...).select(...), nunca o inverso).
  select(str?: string) {
    if (this.mode === "select") {
      this.selectStr = str ?? "*";
    } else {
      this.returningStr = str ?? "*";
    }
    return this;
  }

  eq(col: string, val: unknown) {
    this.filtros.push({ col, op: "=", val });
    return this;
  }
  neq(col: string, val: unknown) {
    this.filtros.push({ col, op: "<>", val });
    return this;
  }
  gt(col: string, val: unknown) {
    this.filtros.push({ col, op: ">", val });
    return this;
  }
  gte(col: string, val: unknown) {
    this.filtros.push({ col, op: ">=", val });
    return this;
  }
  lt(col: string, val: unknown) {
    this.filtros.push({ col, op: "<", val });
    return this;
  }
  lte(col: string, val: unknown) {
    this.filtros.push({ col, op: "<=", val });
    return this;
  }
  ilike(col: string, val: unknown) {
    this.filtros.push({ col, op: "ilike", val });
    return this;
  }
  // Único uso real hoje é .not(col, "is", null) → "IS NOT NULL".
  not(col: string, _op: "is", val: null) {
    this.filtros.push({ col, op: "not-is-null", val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({
      col,
      ascending: opts?.ascending ?? true,
      nullsFirst: opts?.nullsFirst,
    });
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  // Tipagem "mentirosa" de propósito: em runtime é o mesmo objeto (mesma
  // classe, `wantSingle` guia o shape real da resposta em executar()), mas
  // pro TypeScript o retorno passa a ser T em vez de T[] — replica a mesma
  // troca de tipo que o supabase-js faz ao encadear .single()/.maybeSingle().
  single(): PromiseLike<Resultado<T>> {
    this.wantSingle = "single";
    return this as unknown as PromiseLike<Resultado<T>>;
  }

  maybeSingle(): PromiseLike<Resultado<T>> {
    this.wantSingle = "maybeSingle";
    return this as unknown as PromiseLike<Resultado<T>>;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.mode = "insert";
    this.mutationValues = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.mode = "update";
    this.mutationValues = values;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  upsert(values: Record<string, unknown>, opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.mutationValues = values;
    this.upsertOnConflict = opts?.onConflict ?? null;
    return this;
  }

  private buildColumnsSql(selectStr: string, alias: string) {
    const { plain, embeds } = parseSelect(selectStr);
    const cols: string[] = [];
    if (plain.length === 0 || plain.includes("*")) {
      cols.push(`${alias}.*`);
    } else {
      cols.push(...plain.map((c) => `${alias}."${c}"`));
    }
    for (const e of embeds) {
      const eAlias = `e_${e.table}`;
      const jsonPairs = e.cols.map((c) => `'${c}', ${eAlias}."${c}"`).join(", ");
      cols.push(
        `(select json_build_object(${jsonPairs}) from "${e.table}" ${eAlias} where ${eAlias}.id = ${alias}."${e.fkColumn}") as "${e.table}"`,
      );
    }
    return cols.join(", ");
  }

  private buildWhereSql(params: unknown[], alias: string) {
    const partes = this.filtros.map((f) => {
      if (f.op === "not-is-null") return `${alias}."${f.col}" is not null`;
      params.push(f.val);
      const operador = f.op === "ilike" ? "ilike" : f.op;
      return `${alias}."${f.col}" ${operador} $${params.length}`;
    });
    return partes.length ? ` where ${partes.join(" and ")}` : "";
  }

  private buildSelectSql() {
    const params: unknown[] = [];
    let sql = `select ${this.buildColumnsSql(this.selectStr, "t")} from "${this.table}" t`;
    sql += this.buildWhereSql(params, "t");

    if (this.orders.length) {
      const orderSql = this.orders
        .map((o) => {
          let s = `t."${o.col}" ${o.ascending ? "asc" : "desc"}`;
          if (o.nullsFirst !== undefined) {
            s += o.nullsFirst ? " nulls first" : " nulls last";
          }
          return s;
        })
        .join(", ");
      sql += ` order by ${orderSql}`;
    }

    if (this.limitN !== null) {
      params.push(this.limitN);
      sql += ` limit $${params.length}`;
    }

    return { sql, params };
  }

  private buildUpdateSql() {
    const params: unknown[] = [];
    // undefined = "não mexe nesse campo" (igual ao JSON.stringify que o
    // supabase-js faz por trás — chave com valor undefined some do payload),
    // não confundir com null (que sim, seta a coluna pra NULL).
    const sets = Object.entries(this.mutationValues as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .map(([col, val]) => {
        params.push(val);
        return `"${col}" = $${params.length}`;
      });
    let sql = `update "${this.table}" as t set ${sets.join(", ")}`;
    sql += this.buildWhereSql(params, "t");
    if (this.returningStr !== null) sql += ` returning ${this.buildColumnsSql(this.returningStr, "t")}`;
    return { sql, params };
  }

  private buildDeleteSql() {
    const params: unknown[] = [];
    let sql = `delete from "${this.table}" as t`;
    sql += this.buildWhereSql(params, "t");
    if (this.returningStr !== null) sql += ` returning ${this.buildColumnsSql(this.returningStr, "t")}`;
    return { sql, params };
  }

  private buildInsertSql() {
    const rows = Array.isArray(this.mutationValues)
      ? this.mutationValues
      : [this.mutationValues as Record<string, unknown>];
    const cols = Object.keys(rows[0]);
    const params: unknown[] = [];
    const valueGroups = rows.map((row) => {
      const placeholders = cols.map((c) => {
        params.push(row[c]);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    let sql = `insert into "${this.table}" as t (${cols.map((c) => `"${c}"`).join(", ")}) values ${valueGroups.join(", ")}`;
    if (this.returningStr !== null) sql += ` returning ${this.buildColumnsSql(this.returningStr, "t")}`;
    return { sql, params };
  }

  private buildUpsertSql() {
    const row = this.mutationValues as Record<string, unknown>;
    const cols = Object.keys(row);
    const params: unknown[] = [];
    const placeholders = cols.map((c) => {
      params.push(row[c]);
      return `$${params.length}`;
    });
    const conflictCols = (this.upsertOnConflict ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    let sql = `insert into "${this.table}" as t (${cols.map((c) => `"${c}"`).join(", ")}) values (${placeholders.join(", ")})`;
    if (conflictCols.length) {
      const updateSet = cols
        .filter((c) => !conflictCols.includes(c))
        .map((c) => `"${c}" = excluded."${c}"`);
      sql += ` on conflict (${conflictCols.map((c) => `"${c}"`).join(", ")}) do update set ${updateSet.join(", ")}`;
    }
    if (this.returningStr !== null) sql += ` returning ${this.buildColumnsSql(this.returningStr, "t")}`;
    return { sql, params };
  }

  private buildSql() {
    switch (this.mode) {
      case "update":
        return this.buildUpdateSql();
      case "delete":
        return this.buildDeleteSql();
      case "insert":
        return this.buildInsertSql();
      case "upsert":
        return this.buildUpsertSql();
      default:
        return this.buildSelectSql();
    }
  }

  // Retorno solto de propósito: o shape real (T[] vs T vs null) já foi
  // decidido em runtime por wantSingle/mode; quem tipa certinho pra fora são
  // single()/maybeSingle() (ver comentário acima) e o then() default abaixo.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async executar(): Promise<Resultado<any>> {
    const userId = await this.getUserId();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.user_id', $1, true)", [
        userId,
      ]);

      const { sql, params } = this.buildSql();
      const result = await client.query(sql, params);

      await client.query("commit");

      const mutouSemReturning = this.mode !== "select" && this.returningStr === null;
      if (mutouSemReturning) {
        return { data: null, error: null };
      }

      if (this.wantSingle === "single") {
        if (result.rows.length !== 1) {
          return {
            data: null,
            error: { message: `esperava 1 linha, vieram ${result.rows.length}` },
          };
        }
        return { data: result.rows[0], error: null };
      }
      if (this.wantSingle === "maybeSingle") {
        if (result.rows.length > 1) {
          return {
            data: null,
            error: { message: `esperava 0 ou 1 linha, vieram ${result.rows.length}` },
          };
        }
        return { data: (result.rows[0] as T) ?? null, error: null };
      }
      return { data: result.rows as T[], error: null };
    } catch (err) {
      try {
        await client.query("rollback");
      } catch {
        // conexão já pode ter caído — o release() abaixo cuida do resto
      }
      return {
        data: null,
        error: { message: err instanceof Error ? err.message : String(err) },
      };
    } finally {
      client.release();
    }
  }

  then<R1 = Resultado<T[]>, R2 = never>(
    onfulfilled?:
      | ((value: Resultado<T[]>) => R1 | PromiseLike<R1>)
      | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.executar().then(onfulfilled, onrejected);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromTable<T = any>(
  table: string,
  getUserId: () => Promise<string | null>,
) {
  return new QueryBuilder<T>(table, getUserId);
}
