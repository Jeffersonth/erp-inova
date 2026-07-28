import { cookies } from "next/headers";
import { fromTable } from "@/lib/db/query-builder";
import { SESSION_COOKIE, verificarSessao, type SessionUser } from "@/lib/auth/session";

// Substitui o client Supabase (Postgres/Auth gerenciados) por um shim próprio
// sobre `pg` + JWT em cookie — ver Docs/ ou o histórico da migração VPS.
// Mantém a MESMA assinatura (`createClient().auth.getUser()`,
// `createClient().from(tabela).select()...`) usada pelos ~16 arquivos
// server-side deste projeto, então nenhum deles precisou mudar.
export function createClient() {
  let cache: Promise<SessionUser | null> | null = null;
  function getUser() {
    if (!cache) {
      const token = cookies().get(SESSION_COOKIE)?.value;
      cache = verificarSessao(token);
    }
    return cache;
  }

  return {
    auth: {
      async getUser() {
        const user = await getUser();
        return { data: { user }, error: null as { message: string } | null };
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from<T = any>(table: string) {
      return fromTable<T>(table, async () => (await getUser())?.id ?? null);
    },
  };
}
