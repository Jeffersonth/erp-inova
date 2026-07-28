import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { salvarArquivo } from "@/lib/storage/fs-storage";

const MAX_MB = 15;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const scope = form.get("scope");
  const ownerId = form.get("ownerId");
  if (!(file instanceof File) || typeof scope !== "string" || typeof ownerId !== "string") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Arquivo muito grande (máx. ${MAX_MB} MB).` }, { status: 400 });
  }

  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const relPath = `${user.id}/${scope}/${ownerId}/${Date.now()}-${safe}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await salvarArquivo("arquivos", relPath, buffer);

  return NextResponse.json({ path: relPath });
}
