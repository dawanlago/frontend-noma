import { useState } from "react";
import { useRouter } from "next/router";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import LogoMark from "@/components/ui/LogoMark";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyName } from "@/contexts/WorkspaceContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/utils/format";
interface TopBarProps {
  onMenuClick: () => void;
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { user, logout, can } = useAuth();
  const companyName = useCompanyName();
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);

  function handleLogout() {
    logout();
    void router.replace("/login");
  }

  return (
    <AppBar position="sticky" color="inherit">
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 64, sm: 64 } }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { lg: "none" } }}
          aria-label="Abrir menu"
        >
          <MenuRounded />
        </IconButton>
        <Box sx={{ display: { xs: "block", sm: "none" } }}>
          <LogoMark size="sm" />
        </Box>
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize", display: "block" }}>
            {todayLabel()}
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {companyName}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {can("crm") ? (
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => router.push("/crm?novo=1")}
          >
            Nova venda
          </Button>
        ) : null}

        {can("configuracoes") ? (
          <IconButton aria-label="Configurações" onClick={() => router.push("/configuracoes")}>
            <SettingsOutlined />
          </IconButton>
        ) : null}

        <IconButton onClick={(event) => setUserAnchor(event.currentTarget)}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 12 }}>
            {getInitials(user?.name)}
          </Avatar>
        </IconButton>
      </Toolbar>

      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={() => setUserAnchor(null)}
        slotProps={{ paper: { sx: { width: 260 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 700 }}>{user?.name}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
          <Typography variant="caption" color="primary" sx={{ mt: 0.75, display: "block" }}>
            {user?.role ? USER_ROLE_LABELS[user.role] : "Administrador"}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" color="error" />
          </ListItemIcon>
          Sair
        </MenuItem>
      </Menu>

    </AppBar>
  );
}
