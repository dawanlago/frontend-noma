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
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 3, sm: 4 },
          }}
        >
          <Box key={router.asPath} sx={{ mx: "auto", width: "100%", maxWidth: 1280 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
