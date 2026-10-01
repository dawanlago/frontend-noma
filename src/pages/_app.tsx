import { useEffect } from "react";
import type { AppProps } from "next/app";
import AppLayout from "@/components/layout/AppLayout";
import AuthGate from "@/components/auth/AuthGate";
import DialogHost from "@/components/ui/DialogHost";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { isAuthRoute, isPublicRoute } from "@/lib/routes";
import { inter } from "@/theme/font";
import "@/styles/globals.css";

export default function App({ Component, pageProps, router }: AppProps) {
  const isPublic = isPublicRoute(router.pathname);

  useEffect(() => {
    document.documentElement.classList.add(inter.className, inter.variable);
    document.body.classList.add(inter.className, inter.variable);
    return () => {
      document.documentElement.classList.remove(inter.className, inter.variable);
      document.body.classList.remove(inter.className, inter.variable);
    };
  }, []);

  return (
    // Formulário, NPS e proposta públicos são vistos pelo cliente: sempre no tema claro.
    <AppearanceProvider forceLight={isPublic && !isAuthRoute(router.pathname)}>
      <div className={`${inter.className} ${inter.variable} h-full`}>
        <AuthProvider>
          <WorkspaceProvider>
            <AuthGate>
              {isPublic ? (
                <Component {...pageProps} />
              ) : (
                <AppLayout>
                  <Component {...pageProps} />
                </AppLayout>
              )}
            </AuthGate>
          </WorkspaceProvider>
          <DialogHost />
        </AuthProvider>
      </div>
    </AppearanceProvider>
  );
}
