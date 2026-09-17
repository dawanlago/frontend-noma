import { useEffect } from "react";
import type { AppProps } from "next/app";
import { CssBaseline, ThemeProvider } from "@mui/material";
import AppLayout from "@/components/layout/AppLayout";
import AuthGate from "@/components/auth/AuthGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { isPublicRoute } from "@/lib/routes";
import { nomaTheme } from "@/theme";
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
    <ThemeProvider theme={nomaTheme}>
      <CssBaseline />
      <div className={`${inter.className} ${inter.variable} h-full`}>
        <AuthProvider>
          <AuthGate>
            {isPublic ? (
              <Component {...pageProps} />
            ) : (
              <AppLayout>
                <Component {...pageProps} />
              </AppLayout>
            )}
          </AuthGate>
        </AuthProvider>
      </div>
    </ThemeProvider>
  );
}
