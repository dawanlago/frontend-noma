import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import { HiChevronDown, HiOutlineMagnifyingGlass } from "react-icons/hi2";
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
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import SentimentSatisfiedAltOutlined from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import StickyNote2Outlined from "@mui/icons-material/StickyNote2Outlined";
import DynamicFormOutlined from "@mui/icons-material/DynamicFormOutlined";
import HandshakeOutlined from "@mui/icons-material/HandshakeOutlined";
import LogoMark from "@/components/ui/LogoMark";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { ModuleKey } from "@/types";
import { getInitials } from "@/utils/format";
import { DRAWER_WIDTH } from "@/theme";

interface NavItem {
  href: string;
  label: string;
  icon: typeof HomeOutlined;
  module?: ModuleKey;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Itens soltos no topo (sem grupo). */
const topItems: NavItem[] = [{ href: "/", label: "Início", icon: HomeOutlined }];

const groups: NavGroup[] = [
  {
    label: "Rotina",
    items: [
      { href: "/atividades", label: "Atividades", icon: TaskAltOutlined, module: "atividades" },
      { href: "/agenda", label: "Agenda", icon: CalendarMonthOutlined, module: "agenda" },
      { href: "/anotacoes", label: "Anotações", icon: StickyNote2Outlined, module: "anotacoes" },
    ],
  },
  {
    label: "Vendas",
    items: [
      { href: "/crm", label: "CRM", icon: ViewKanbanOutlined, module: "crm" },
      { href: "/formularios", label: "Formulários", icon: DynamicFormOutlined, module: "formularios" },
      { href: "/nps", label: "NPS", icon: SentimentSatisfiedAltOutlined, module: "nps" },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { href: "/propostas", label: "Propostas", icon: DescriptionOutlined, module: "propostas" },
      { href: "/prospeccao", label: "Prospecção", icon: TravelExploreOutlined, module: "prospeccao" },
      { href: "/follow-up", label: "Follow-up", icon: ReplayOutlined, module: "followup" },
      { href: "/orcamento", label: "Orçamento", icon: CalculateOutlined, module: "orcamento" },
      { href: "/contratos", label: "Contratos", icon: GavelOutlined, module: "contratos" },
      { href: "/briefing", label: "Briefing", icon: AssignmentOutlined, module: "briefing" },
    ],
  },
  {
    label: "Base de dados",
    items: [
      { href: "/contatos", label: "Base geral", icon: PeopleOutlined, module: "base" },
      { href: "/empresas", label: "Empresas", icon: BusinessOutlined, module: "base" },
      { href: "/fornecedores", label: "Fornecedores e parceiros", icon: HandshakeOutlined, module: "base" },
      { href: "/produtos", label: "Produtos", icon: Inventory2Outlined, module: "produtos" },
    ],
  },
];

/** Itens soltos logo abaixo dos grupos. */
const bottomItems: NavItem[] = [
  { href: "/financeiro", label: "Financeiro", icon: AccountBalanceWalletOutlined, module: "financeiro" },
];

/** Atalhos do rodapé (ícones ao lado do usuário). */
const footerItems: NavItem[] = [
  { href: "/usuarios", label: "Usuários e acessos", icon: GroupOutlined, adminOnly: true },
  { href: "/configuracoes", label: "Configurações", icon: SettingsOutlined, module: "configuracoes" },
];

const OPEN_GROUPS_KEY = "noma:menu-open-groups";

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <ListItem disablePadding>
      <ListItemButton component={Link} href={item.href} selected={active} onClick={onNavigate} sx={{ py: 0.5, minHeight: 36 }}>
        <ListItemIcon sx={{ minWidth: 32, color: active ? "primary.main" : "text.secondary" }}>
          <Icon sx={{ fontSize: 19 }} />
        </ListItemIcon>
        <ListItemText primary={item.label} slotProps={{ primary: { noWrap: true, sx: { fontWeight: active ? 600 : 500, fontSize: 14 } } }} />
      </ListItemButton>
    </ListItem>
  );
}

function MenuBody({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { user, isAdmin, can } = useAuth();
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const allowed = (item: NavItem) => (!item.adminOnly || isAdmin) && (!item.module || can(item.module));
  const visibleGroups = groups
    .map((group) => ({ ...group, items: group.items.filter(allowed) }))
    .filter((group) => group.items.length);
  const activeGroup = visibleGroups.find((group) => group.items.some((item) => isActivePath(router.pathname, item.href)))?.label;

  // Lembra os grupos abertos; o grupo da página atual sempre abre.
  useEffect(() => {
    let saved: string[] = [];
    try {
      saved = JSON.parse(window.localStorage.getItem(OPEN_GROUPS_KEY) || "[]");
    } catch {
      saved = [];
    }
    setOpenGroups(activeGroup && !saved.includes(activeGroup) ? [...saved, activeGroup] : saved);
  }, [activeGroup]);

  function toggle(label: string) {
    setOpenGroups((current) => {
      const next = current.includes(label) ? current.filter((item) => item !== label) : [...current, label];
      try {
        window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* sem armazenamento: segue só em memória */
      }
      return next;
    });
  }

  const term = normalize(search.trim());
  const searchResults = term
    ? [...topItems, ...groups.flatMap((group) => group.items), ...bottomItems, ...footerItems]
        .filter(allowed)
        .filter((item) => normalize(item.label).includes(term))
    : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
        <LogoMark withWordmark />
        <IconButton onClick={onNavigate} sx={{ display: { lg: "none" } }} aria-label="Fechar navegação">
          <CloseRounded />
        </IconButton>
      </Box>
      <Box sx={{ px: 1.5, pb: 1 }}>
        <label className="relative block">
          <span className="sr-only">Buscar no menu</span>
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35" />
          <input
            className="w-full rounded-lg border border-charcoal/10 bg-beige/60 py-1.5 pl-8 pr-2 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-tan focus:outline-none"
            placeholder="Ir para..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults[0]) {
                void router.push(searchResults[0].href);
                setSearch("");
                onNavigate?.();
              }
              if (event.key === "Escape") setSearch("");
            }}
          />
        </label>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 1 }}>
        {term ? (
          <List dense disablePadding>
            {searchResults.length ? (
              searchResults.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActivePath(router.pathname, item.href)}
                  onNavigate={() => {
                    setSearch("");
                    onNavigate?.();
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1 }}>
                Nada encontrado.
              </Typography>
            )}
          </List>
        ) : (
          <>
            <List dense disablePadding>
              {topItems.filter(allowed).map((item) => (
                <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={onNavigate} />
              ))}
            </List>
            {visibleGroups.map((group) => {
              const expanded = openGroups.includes(group.label);
              const hasActive = group.label === activeGroup;
              return (
                <Box key={group.label} sx={{ mt: 0.5 }}>
                  <button
                    type="button"
                    onClick={() => toggle(group.label)}
                    aria-expanded={expanded}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] transition hover:bg-beige ${
                      hasActive ? "text-tan" : "text-charcoal/45"
                    }`}
                  >
                    <span>{group.label}</span>
                    <span className="flex items-center gap-1.5">
                      {!expanded ? <span className="rounded-full bg-charcoal/[0.06] px-1.5 text-[10px] font-semibold text-charcoal/45">{group.items.length}</span> : null}
                      <HiChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  <Collapse in={expanded} timeout={150} unmountOnExit>
                    <List dense disablePadding>
                      {group.items.map((item) => (
                        <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={onNavigate} />
                      ))}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {bottomItems.filter(allowed).map((item) => (
                <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={onNavigate} />
              ))}
            </List>
          </>
        )}
      </Box>
      <Divider />
      <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 1.25, alignItems: "center" }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 12 }}>{getInitials(user?.name)}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: 13 }}>
            {user?.name || "Noma"}
          </Typography>
          <Typography noWrap variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
            {user?.role ? USER_ROLE_LABELS[user.role] : "Equipe"}
          </Typography>
        </Box>
        {footerItems.filter(allowed).map((item) => {
          const Icon = item.icon;
          const active = isActivePath(router.pathname, item.href);
          return (
            <Tooltip key={item.href} title={item.label}>
              <IconButton component={Link} href={item.href} onClick={onNavigate} size="small" aria-label={item.label} color={active ? "primary" : "default"}>
                <Icon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
          );
        })}
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
