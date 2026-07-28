import { pool } from "./pool";

// Shim mínimo sobre `pg` que replica só o subconjunto do estilo PostgREST
// (supabase-js) realmente usado no código server-side deste projeto:
// from().select().eq/neq/gt/gte/lt/lte/ilike/not().order().limit()
// .single()/.maybeSingle(), e um .update().eq(). Objetivo: os ~16 arquivos
// que hoje chamam `createClient().from(...)` não precisam mudar uma linha —
// só o import de @/lib/supabase/server continua valendo.
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

// Singularização ingênua (strip de "s" final) — cobre os dois únicos casos
// de embed hoje no código (clientes→cliente_id, projetos→projeto_id) e bate
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
// Database explícito): as ~50 telas existentes atribuem `data` direto a
// variáveis já tipadas (ClienteLike[], Perfil, etc.) sem cast — trocar pra
// Record<string, unknown> quebrava todas elas pedindo cast em cada call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class QueryBuilder<T = any>
  implements PromiseLike<Resultado<T[]>>
{
  private selectStr = "*";
  private filtros: Filtro[] = [];
  private orders: OrderSpec[] = [];
  private limitN: number | null = null;
  private mode: "select" | "update" = "select";
  private updateValues: Record<string, unknown> | null = null;
  private wantSingle: "single" | "maybeSingle" | null = null;

  constructor(
    private table: string,
    private getUserId: () => Promise<string | null>,
  ) {}

  select(str: string) {
    this.selectStr = str;
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

  update(values: Record<string, unknown>) {
    this.mode = "update";
    this.updateValues = values;
    return this;
  }

  private whereSql(params: unknown[]) {
    const partes = this.filtros.map((f) => {
      if (f.op === "not-is-null") return `"${f.col}" is not null`;
      params.push(f.val);
      const operador = f.op === "ilike" ? "ilike" : f.op;
      return `"${f.col}" ${operador} $${params.length}`;
    });
    return partes.length ? ` where ${partes.join(" and ")}` : "";
  }

  private buildSelectSql() {
    const { plain, embeds } = parseSelect(this.selectStr);
    const cols: string[] = [];
    if (plain.length === 0 || plain.includes("*")) {
      cols.push("t.*");
    } else {
      cols.push(...plain.map((c) => `t."${c}"`));
    }
    for (const e of embeds) {
      const alias = `e_${e.table}`;
      const jsonPairs = e.cols
        .map((c) => `'${c}', ${alias}."${c}"`)
        .join(", ");
      cols.push(
        `(select json_build_object(${jsonPairs}) from "${e.table}" ${alias} where ${alias}.id = t."${e.fkColumn}") as "${e.table}"`,
      );
    }

    const params: unknown[] = [];
    let sql = `select ${cols.join(", ")} from "${this.table}" t`;
    // whereSql usa t."col" implicitamente via alias fixo — reaproveita o mesmo
    // helper trocando o prefixo (t. já está nas colunas, aqui só a condição).
    const whereParts = this.filtros.map((f) => {
      if (f.op === "not-is-null") return `t."${f.col}" is not null`;
      params.push(f.val);
      const operador = f.op === "ilike" ? "ilike" : f.op;
      return `t."${f.col}" ${operador} $${params.length}`;
    });
    if (whereParts.length) sql += ` where ${whereParts.join(" and ")}`;

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
    const sets = Object.entries(this.updateValues!).map(([col, val]) => {
      params.push(val);
      return `"${col}" = $${params.length}`;
    });
    let sql = `update "${this.table}" set ${sets.join(", ")}`;
    sql += this.whereSql(params);
    return { sql, params };
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

      const { sql, params } =
        this.mode === "update" ? this.buildUpdateSql() : this.buildSelectSql();
      const result = await client.query(sql, params);

      await client.query("commit");

      if (this.mode === "update") {
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
