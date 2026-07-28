import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEG,
  assinarSessao,
  verificarSessao,
} from "@/lib/auth/session";

// Substitui o "refresh de token" do Supabase: aqui não há refresh token
// separado (o JWT já dura 30 dias), então só renovamos o cookie a cada
// requisição autenticada — sessão desliza enquanto o usuário voltar pelo
// menos 1x/mês, sem round-trip a banco (verificação é só assinatura HS256).
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await verificarSessao(token);

  if (user) {
    const novoToken = await assinarSessao(user);
    response.cookies.set(SESSION_COOKIE, novoToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEG,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
