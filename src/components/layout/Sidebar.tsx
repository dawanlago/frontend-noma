import Link from "next/link";
import { useRouter } from "next/router";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import CloseRounded from "@mui/icons-material/CloseRounded";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import NotesOutlined from "@mui/icons-material/NotesOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import LogoMark from "@/components/ui/LogoMark";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/utils/format";
import { DRAWER_WIDTH } from "@/theme";

const groups = [
  {
    label: "Visão geral",
    items: [{ href: "/", label: "Dashboard", icon: HomeOutlined }],
  },
  {
    label: "Comercial",
    items: [
      { href: "/funis", label: "Funis", icon: ViewKanbanOutlined },
      { href: "/compromissos", label: "Compromissos", icon: CalendarMonthOutlined },
      { href: "/contatos", label: "Contatos", icon: PeopleOutlined },
      { href: "/empresas", label: "Empresas", icon: BusinessOutlined },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/produtos", label: "Produtos", icon: Inventory2Outlined },
      { href: "/financeiro", label: "Financeiro", icon: AccountBalanceOutlined, adminOnly: true },
      { href: "/nps", label: "NPS", icon: StarOutlined },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/anotacoes", label: "Anotações", icon: NotesOutlined },
      { href: "/usuarios", label: "Usuários", icon: GroupOutlined },
      { href: "/configuracoes", label: "Configurações", icon: SettingsOutlined },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function MenuBody({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 2 }}>
        <LogoMark withWordmark />
        <IconButton onClick={onNavigate} sx={{ display: { lg: "none" } }} aria-label="Fechar navegação">
          <CloseRounded />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 2 }}>
        {groups.map((group) => {
          const items = group.items.filter((item) => !("adminOnly" in item && item.adminOnly) || isAdmin);
          if (!items.length) return null;

          return (
            <Box key={group.label} sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{ px: 1.5, mb: 0.5, display: "block", color: "text.secondary", fontWeight: 700, letterSpacing: 0.6 }}
              >
                {group.label}
              </Typography>
              <List dense disablePadding>
                {items.map((item) => {
                  const active = isActivePath(router.pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <ListItem key={item.href} disablePadding sx={{ mb: 0.25 }}>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        selected={active}
                        onClick={onNavigate}
                      >
                        <ListItemIcon sx={{ minWidth: 36, color: active ? "primary.main" : "text.secondary" }}>
                          <Icon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          slotProps={{ primary: { sx: { fontWeight: active ? 600 : 500, fontSize: 14 } } }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>
      <Divider />
      <Stack direction="row" spacing={1.5} sx={{ p: 2, alignItems: "center" }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: 13 }}>
          {getInitials(user?.name)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
            {user?.name || "Noma"}
          </Typography>
          <Typography noWrap variant="caption" color="text.secondary">
            {user?.role ? USER_ROLE_LABELS[user.role] : "Equipe"}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <MenuBody onNavigate={onClose} />
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
        open
      >
        <MenuBody />
      </Drawer>
    </>
  );
}
