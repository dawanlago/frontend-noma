export function isPublicRoute(pathname: string): boolean {
  return pathname === "/login";
}

export function isAdminRoute(pathname: string): boolean {
  return pathname === "/usuarios" || pathname.startsWith("/usuarios/");
}
