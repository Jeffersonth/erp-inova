import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lerArquivo, removerArquivo } from "@/lib/storage/fs-storage";
import { mimeTypeFor } from "@/lib/storage/mime";

// Bucket "arquivos" era privado (signed URL de 60s). Troca equivalente:
// exige sessão válida em vez de assinatura — sistema é de dono único, então
// "logado" já é "dono" (não há outro usuário pra vazar dado de terceiro).
export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const relPath = params.path.join("/");
  const buffer = await lerArquivo("arquivos", relPath);
  if (!buffer) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const nome = relPath.split("/").pop() ?? "arquivo";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeTypeFor(nome),
      "Content-Disposition": `inline; filename="${nome.replace(/"/g, "")}"`,
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: { path: string[] } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await removerArquivo("arquivos", params.path.join("/"));
  return NextResponse.json({ ok: true });
}
