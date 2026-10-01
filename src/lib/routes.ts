/** Telas de acesso (login e senha): públicas, mas seguem o tema escolhido. */
export function isAuthRoute(pathname: string): boolean {
  return pathname === "/login" || pathname === "/esqueci-senha" || pathname === "/redefinir-senha";
}

export function isPublicRoute(pathname: string): boolean {
  return isAuthRoute(pathname) || pathname === "/f/[publicId]" || pathname === "/nps/responder/[token]" || pathname === "/p/[token]";
}

export function isAdminRoute(pathname: string): boolean {
  return pathname === "/usuarios" || pathname.startsWith("/usuarios/");
}
