import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useAuth } from "@/contexts/AuthContext";
import LogoMark from "@/components/ui/LogoMark";
import { isAdminRoute, isPublicRoute } from "@/lib/routes";

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isPublic = isPublicRoute(router.pathname);
  const needsAdmin = isAdminRoute(router.pathname);
  const isAdmin = user?.role === "admin";

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

    if (isAuthenticated && needsAdmin && !isAdmin) {
      void router.replace("/");
    }
  }, [isAdmin, isAuthenticated, isLoading, isPublic, needsAdmin, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthenticated) {
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
