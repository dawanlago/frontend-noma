import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/router";
import { useEffect, type ReactNode } from "react";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      void router.replace("/");
    }
  }, [isAdmin, isLoading, router, user]);

  if (isLoading || !isAdmin) {
    return <p className="text-sm text-charcoal/50">Verificando permissão...</p>;
  }

  return <>{children}</>;
}
