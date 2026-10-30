import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import Box from "@mui/material/Box";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [router.pathname]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", overflowX: "clip" }}>
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowX: "clip" }}>
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            px: { xs: 1.5, sm: 3, lg: 4 },
            py: { xs: 2.5, sm: 4 },
            overflowX: "clip",
          }}
        >
          {/* Remonta ao trocar de página, mas não quando só a query muda (ex.: /crm?novo=1 abre o modal e limpa a URL). */}
          <Box key={router.pathname} className="noma-page-enter" sx={{ mx: "auto", width: "100%", maxWidth: 1280, minWidth: 0 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
