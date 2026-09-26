import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import { HiChevronDown, HiOutlineMagnifyingGlass, HiXMark } from "react-icons/hi2";
import { useCompanyName } from "@/contexts/WorkspaceContext";
import Drawer from "@mui/material/Drawer";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
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
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors duration-150 ${
          active ? "bg-white/[0.09] font-semibold text-white" : "font-medium text-white/60 hover:bg-white/[0.05] hover:text-white"
        }`}
      >
        {active ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-tan" aria-hidden /> : null}
        <Icon sx={{ fontSize: 18 }} className={active ? "text-tan" : "text-white/45 transition-colors group-hover:text-white/80"} />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function MenuBody({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { user, isAdmin, can } = useAuth();
  const companyName = useCompanyName();
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // ⌘K / Ctrl+K foca a busca do menu.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = searchRef.current;
        if (!input || input.offsetParent === null) return;
        event.preventDefault();
        input.focus();
        input.select();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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

  function goTo(href: string) {
    setSearch("");
    void router.push(href);
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col bg-[hsl(222,32%,9%)] text-white">
      <div className="flex items-center justify-between px-4 pb-4 pt-5">
        <Link href="/" onClick={onNavigate} className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tan to-[hsl(222,90%,40%)] text-[15px] font-extrabold tracking-tight shadow-[0_6px_18px_-6px_hsl(210,98%,48%)]">
            N
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[15px] font-bold tracking-tight">Noma</span>
            <span className="block truncate text-[11px] text-white/45">{companyName}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onNavigate}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 lg:hidden"
          aria-label="Fechar navegação"
        >
          <HiXMark className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <label className="relative block">
          <span className="sr-only">Buscar no menu</span>
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            ref={searchRef}
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.05] pl-9 pr-12 text-[13px] text-white placeholder:text-white/35 transition focus:border-tan/60 focus:bg-white/[0.08] focus:outline-none"
            placeholder="Ir para..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults[0]) goTo(searchResults[0].href);
              if (event.key === "Escape") {
                setSearch("");
                event.currentTarget.blur();
              }
            }}
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white/40 lg:block">
            ⌘K
          </kbd>
        </label>
      </div>

      <nav className="noma-scroll flex-1 overflow-y-auto px-3 pb-3">
        {term ? (
          <ul className="space-y-0.5">
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
              <li className="px-3 py-2 text-[13px] text-white/40">Nada encontrado.</li>
            )}
          </ul>
        ) : (
          <>
            <ul className="space-y-0.5">
              {topItems.filter(allowed).map((item) => (
                <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={onNavigate} />
              ))}
            </ul>
            {visibleGroups.map((group) => {
              const expanded = openGroups.includes(group.label);
              return (
                <div key={group.label} className="mt-4">
                  <button
                    type="button"
                    onClick={() => toggle(group.label)}
                    aria-expanded={expanded}
                    className="group flex w-full items-center justify-between px-3 pb-1.5 text-left"
                  >
                    <span
                      className={`text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                        group.label === activeGroup ? "text-white/70" : "text-white/35 group-hover:text-white/60"
                      }`}
                    >
                      {group.label}
                    </span>
                    <HiChevronDown
                      className={`h-3.5 w-3.5 text-white/30 transition-transform duration-200 group-hover:text-white/60 ${expanded ? "" : "-rotate-90"}`}
                    />
                  </button>
                  <Collapse in={expanded} timeout={180} unmountOnExit>
                    <ul className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={onNavigate} />
                      ))}
                    </ul>
                  </Collapse>
                </div>
              );
            })}
            {bottomItems.some(allowed) ? (
              <ul className="mt-4 space-y-0.5 border-t border-white/[0.06] pt-4">
                {bottomItems.filter(allowed).map((item) => (
                  <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={onNavigate} />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
            {getInitials(user?.name)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold">{user?.name || "Noma"}</span>
            <span className="block truncate text-[11px] text-white/45">{user?.role ? USER_ROLE_LABELS[user.role] : "Equipe"}</span>
          </span>
          {footerItems.filter(allowed).map((item) => {
            const Icon = item.icon;
            const active = isActivePath(router.pathname, item.href);
            return (
              <Tooltip key={item.href} title={item.label}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-label={item.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    active ? "bg-white/10 text-tan" : "text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon sx={{ fontSize: 18 }} />
                </Link>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
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
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box", border: 0, bgcolor: "hsl(222,32%,9%)" },
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
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box", border: 0, bgcolor: "hsl(222,32%,9%)" },
        }}
        open
      >
        <MenuBody />
      </Drawer>
    </>
  );
}
