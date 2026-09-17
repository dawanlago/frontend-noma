export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/nps/responder") ||
    pathname.startsWith("/formularios/")
  );
}

export function isAdminRoute(pathname: string): boolean {
  return (
    pathname === "/financeiro" ||
    pathname.startsWith("/financeiro/") ||
    pathname === "/configuracoes/financeiro"
  );
}
