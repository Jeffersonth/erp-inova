import { NextResponse } from "next/server";
import { lerArquivo } from "@/lib/storage/fs-storage";
import { mimeTypeFor } from "@/lib/storage/mime";

// Bucket "avatars" sempre foi público no Supabase — sem checagem de sessão
// aqui, igual ao endpoint /object/public/... de antes.
export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const relPath = params.path.join("/");
  const buffer = await lerArquivo("avatars", relPath);
  if (!buffer) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeTypeFor(relPath),
      "Cache-Control": "public, max-age=60",
    },
  });
}
