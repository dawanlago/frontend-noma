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
import LockOutlined from "@mui/icons-material/LockOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import ListItemText from "@mui/material/ListItemText";
import type { ReactNode } from "react";
import {
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineBriefcase,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineUser,
} from "react-icons/hi2";
import type { ModuleKey } from "@/types";
import LogoMark from "@/components/ui/LogoMark";
import ChangePasswordDialog from "@/components/auth/ChangePasswordDialog";
import AppearancePicker from "./AppearancePicker";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyName } from "@/contexts/WorkspaceContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/utils/format";
interface CreateItem {
  label: string;
  hint: string;
  href: string;
  module: ModuleKey;
  icon: ReactNode;
  /** Começa um novo grupo no menu. */
  divider?: boolean;
}

const CREATE_ITEMS: CreateItem[] = [
  { label: "Negociação", hint: "Nova negociação no funil", href: "/crm?novo=1", module: "crm", icon: <HiOutlineBriefcase /> },
  { label: "Contato", hint: "Pessoa da base", href: "/contatos?novo=contato", module: "base", icon: <HiOutlineUser /> },
  { label: "Empresa", hint: "Cliente, fornecedor ou parceiro", href: "/empresas?novo=empresa", module: "base", icon: <HiOutlineBuildingOffice2 /> },
  { label: "Atividade", hint: "Tarefa do checklist", href: "/atividades?novo=1", module: "atividades", icon: <HiOutlineCheckCircle /> },
  { label: "Entrada", hint: "Valor recebido ou a receber", href: "/financeiro?novo=entrada", module: "financeiro", icon: <HiOutlineArrowTrendingUp />, divider: true },
  { label: "Despesa", hint: "Custo pago ou previsto", href: "/financeiro?novo=despesa", module: "financeiro", icon: <HiOutlineArrowTrendingDown /> },
];

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
  const [createAnchor, setCreateAnchor] = useState<null | HTMLElement>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const createItems = CREATE_ITEMS.filter((item) => can(item.module));

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

        {createItems.length ? (
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            endIcon={<KeyboardArrowDownRounded />}
            aria-haspopup="menu"
            aria-expanded={Boolean(createAnchor)}
            onClick={(event) => setCreateAnchor(event.currentTarget)}
          >
            Criar
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
        anchorEl={createAnchor}
        open={Boolean(createAnchor)}
        onClose={() => setCreateAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 260, mt: 0.75 } } }}
      >
        {createItems.flatMap((item, index) => [
          item.divider && index > 0 ? <Divider key={`${item.label}-divider`} /> : null,
          <MenuItem
            key={item.label}
            onClick={() => {
              setCreateAnchor(null);
              void router.push(item.href);
            }}
          >
            <ListItemIcon sx={{ fontSize: 18, color: "text.secondary" }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              secondary={item.hint}
              slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 14 } }, secondary: { sx: { fontSize: 12 } } }}
            />
          </MenuItem>,
        ])}
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
        <AppearancePicker />
        <Divider />
        <MenuItem
          onClick={() => {
            setUserAnchor(null);
            setPasswordOpen(true);
          }}
        >
          <ListItemIcon>
            <LockOutlined fontSize="small" />
          </ListItemIcon>
          Alterar senha
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" color="error" />
          </ListItemIcon>
          Sair
        </MenuItem>
      </Menu>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </AppBar>
  );
}
