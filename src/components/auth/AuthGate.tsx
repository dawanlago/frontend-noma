import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useAuth } from "@/contexts/AuthContext";
import LogoMark from "@/components/ui/LogoMark";
import { moduleForPath } from "@/lib/modules";
import { isAdminRoute, isPublicRoute } from "@/lib/routes";

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isAdmin, can } = useAuth();
  const isPublic = isPublicRoute(router.pathname);
  const needsAdmin = isAdminRoute(router.pathname);
  const requiredModule = moduleForPath(router.pathname);
  const blocked = isAuthenticated && ((needsAdmin && !isAdmin) || (requiredModule !== null && !can(requiredModule)));

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublic) {
      void router.replace("/login");
      return;
    }

    if (isAuthenticated && router.pathname === "/login") {
      void router.replace("/");
      return;
    }

    if (blocked) {
      void router.replace("/");
    }
  }, [blocked, isAuthenticated, isLoading, isPublic, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthenticated || blocked) {
    return (
      <Stack spacing={2.5} sx={{ minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <LogoMark size="md" withWordmark />
        <CircularProgress size={28} />
        <Typography color="text.secondary">
          {isLoading ? "Abrindo o painel..." : "Redirecionando..."}
        </Typography>
      </Stack>
    );
  }

  return <>{children}</>;
}
