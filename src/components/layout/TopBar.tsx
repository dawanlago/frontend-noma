import { useState } from "react";
import { useRouter } from "next/router";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import NewDealModal from "@/components/deals/NewDealModal";
import LogoMark from "@/components/ui/LogoMark";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { resources } from "@/lib/resources";
import { useAsyncData } from "@/hooks/useAsyncData";
import { formatDateTime, getInitials } from "@/utils/format";
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
  const { user, logout } = useAuth();
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const { data: notifications, reload } = useAsyncData(() => resources.notifications.list());
  const unreadCount = (user?.role === "admin"
    ? notifications?.unreadCount
    : (notifications?.data || []).filter((item) => !item.readAt && item.type !== "finance_reverted").length) || 0;
  const visibleNotifications = (notifications?.data || []).filter(
    (item) => user?.role === "admin" || item.type !== "finance_reverted",
  );

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
            Painel comercial
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={() => setDealModalOpen(true)}
        >
          Nova venda
        </Button>

        <IconButton
          aria-label="Notificações"
          onClick={(event) => {
            setNotifAnchor(event.currentTarget);
            void reload();
          }}
        >
          <Badge color="primary" variant="dot" invisible={unreadCount === 0}>
            <NotificationsNoneRounded />
          </Badge>
        </IconButton>

        <IconButton aria-label="Configurações" onClick={() => router.push("/configuracoes")}>
          <SettingsOutlined />
        </IconButton>

        <IconButton onClick={(event) => setUserAnchor(event.currentTarget)}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 12 }}>
            {getInitials(user?.name)}
          </Avatar>
        </IconButton>
      </Toolbar>

      <Menu
        anchorEl={notifAnchor}
        open={Boolean(notifAnchor)}
        onClose={() => setNotifAnchor(null)}
        slotProps={{ paper: { sx: { width: 360, maxWidth: "90vw" } } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Notificações</Typography>
            <Typography variant="caption" color="text.secondary">
              {unreadCount ? `${unreadCount} sem ler` : "Tudo em dia"}
            </Typography>
          </Box>
          {unreadCount > 0 ? (
            <Button size="small" onClick={() => void resources.notifications.markAllRead().then(reload)}>
              Marcar todas
            </Button>
          ) : null}
        </Box>
        <Divider />
        {visibleNotifications.length === 0 ? (
          <Box sx={{ px: 2, py: 4 }}>
            <Typography color="text.secondary" sx={{ textAlign: "center" }}>
              Nenhuma notificação ainda.
            </Typography>
          </Box>
        ) : (
          visibleNotifications.map((item) => (
            <MenuItem
              key={item._id}
              sx={{ alignItems: "flex-start", whiteSpace: "normal", bgcolor: item.readAt ? "transparent" : "action.hover" }}
              onClick={() => {
                if (!item.readAt) void resources.notifications.markRead(item._id).then(reload);
                if (item.dealId) {
                  setNotifAnchor(null);
                  void router.push("/configuracoes/negociacoes-especificas");
                }
              }}
            >
              <Stack spacing={0.5}>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item.body}</Typography>
                <Typography variant="caption" color="text.secondary">{formatDateTime(item.createdAt)}</Typography>
              </Stack>
            </MenuItem>
          ))
        )}
      </Menu>

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

      <NewDealModal open={dealModalOpen} onClose={() => setDealModalOpen(false)} />
    </AppBar>
  );
}
