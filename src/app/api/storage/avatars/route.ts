import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { salvarArquivo } from "@/lib/storage/fs-storage";

const MAX_MB = 5;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Arquivo muito grande (máx. ${MAX_MB} MB).` }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const relPath = `${user.id}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await salvarArquivo("avatars", relPath, buffer);

  // ?t= força o <img> a recarregar (upsert sobrescreve sempre o mesmo path).
  return NextResponse.json({ url: `/api/storage/avatars/${relPath}?t=${Date.now()}` });
}
