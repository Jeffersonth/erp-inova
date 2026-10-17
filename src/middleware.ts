import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEG,
  assinarSessao,
  verificarSessao,
} from "@/lib/auth/session";

// O Edge renova a validade do cookie preservando a versão da sessão.
// Cada acesso aos dados passa também por verificarSessaoAtiva no servidor:
// a versão precisa corresponder ao banco, inclusive depois de renovar o JWT.
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
