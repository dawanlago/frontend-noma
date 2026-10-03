import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/router";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import { HiChevronDown, HiOutlineMagnifyingGlass, HiXMark } from "react-icons/hi2";
import { useCompanyName } from "@/contexts/WorkspaceContext";
import Drawer from "@mui/material/Drawer";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import MovieCreationOutlined from "@mui/icons-material/MovieCreationOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import SentimentSatisfiedAltOutlined from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import WhatsApp from "@mui/icons-material/WhatsApp";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import StickyNote2Outlined from "@mui/icons-material/StickyNote2Outlined";
import DynamicFormOutlined from "@mui/icons-material/DynamicFormOutlined";
import HandshakeOutlined from "@mui/icons-material/HandshakeOutlined";
import HandymanOutlined from "@mui/icons-material/HandymanOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import KeyboardDoubleArrowLeft from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRight from "@mui/icons-material/KeyboardDoubleArrowRight";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import StorageOutlined from "@mui/icons-material/StorageOutlined";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";
import { LOGO_DARK_THEME, LOGO_RED } from "@/components/ui/LogoMark";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { ModuleKey } from "@/types";
import { getInitials } from "@/utils/format";
import { DRAWER_WIDTH } from "@/theme";

/** Largura do menu compacto (só ícones). */
const RAIL_WIDTH = 68;
const COMPACT_KEY = "noma:menu-compact";

interface NavItem {
  href: string;
  label: string;
  icon: typeof HomeOutlined;
  module?: ModuleKey;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  /** Ícone do grupo no menu compacto. */
  icon: typeof HomeOutlined;
  items: NavItem[];
}

/** Itens soltos no topo (sem grupo). */
const topItems: NavItem[] = [{ href: "/", label: "Início", icon: HomeOutlined }];

const groups: NavGroup[] = [
  {
    label: "Rotina",
    icon: TaskAltOutlined,
    items: [
      { href: "/atividades", label: "Atividades", icon: TaskAltOutlined, module: "atividades" },
      { href: "/agenda", label: "Agenda", icon: CalendarMonthOutlined, module: "agenda" },
      { href: "/anotacoes", label: "Anotações", icon: StickyNote2Outlined, module: "anotacoes" },
    ],
  },
  {
    label: "Vendas",
    icon: TrendingUpOutlined,
    items: [
      { href: "/crm", label: "CRM", icon: ViewKanbanOutlined, module: "crm" },
      { href: "/formularios", label: "Formulários", icon: DynamicFormOutlined, module: "formularios" },
      { href: "/nps", label: "NPS", icon: SentimentSatisfiedAltOutlined, module: "nps" },
      { href: "/extensao-whatsapp", label: "Extensão WhatsApp", icon: WhatsApp, module: "crm" },
    ],
  },
  {
    label: "Ferramentas",
    icon: HandymanOutlined,
    items: [
      { href: "/propostas", label: "Propostas", icon: DescriptionOutlined, module: "propostas" },
      { href: "/prospeccao", label: "Prospecção", icon: TravelExploreOutlined, module: "prospeccao" },
      { href: "/follow-up", label: "Follow-up", icon: ReplayOutlined, module: "followup" },
      { href: "/orcamento", label: "Orçamento", icon: CalculateOutlined, module: "orcamento" },
      { href: "/contratos", label: "Contratos", icon: GavelOutlined, module: "contratos" },
      { href: "/briefing", label: "Briefing", icon: AssignmentOutlined, module: "briefing" },
      { href: "/roteiros", label: "Roteiros", icon: MovieCreationOutlined, module: "briefing" },
    ],
  },
  {
    label: "Base de dados",
    icon: StorageOutlined,
    items: [
      { href: "/contatos", label: "Base geral", icon: PeopleOutlined, module: "base" },
      { href: "/empresas", label: "Empresas", icon: BusinessOutlined, module: "base" },
      { href: "/fornecedores", label: "Fornecedores e parceiros", icon: HandshakeOutlined, module: "base" },
    ],
  },
  {
    label: "Gestão",
    icon: InsightsOutlined,
    items: [
      { href: "/financeiro", label: "Financeiro", icon: AccountBalanceWalletOutlined, module: "financeiro" },
      { href: "/produtos", label: "Produtos", icon: Inventory2Outlined, module: "produtos" },
    ],
  },
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
          active ? "bg-tan/[0.08] font-semibold text-charcoal" : "font-medium text-charcoal/65 hover:bg-beige hover:text-charcoal"
        }`}
      >
        {active ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-tan" aria-hidden /> : null}
        <Icon sx={{ fontSize: 18 }} className={active ? "text-tan" : "text-charcoal/40 transition-colors group-hover:text-charcoal/70"} />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function MenuBody({ onNavigate, onCompact }: { onNavigate?: () => void; onCompact?: () => void }) {
  const router = useRouter();
  const { user, isAdmin, can } = useAuth();
  const companyName = useCompanyName();
  const { mode } = useAppearance();
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
    ? [...topItems, ...groups.flatMap((group) => group.items), ...footerItems]
        .filter(allowed)
        .filter((item) => normalize(item.label).includes(term))
    : [];

  function goTo(href: string) {
    setSearch("");
    void router.push(href);
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col border-r border-charcoal/[0.08] bg-surface text-charcoal">
      <div className="flex items-center justify-between px-4 pb-4 pt-5">
        <Link href="/" onClick={onNavigate} className="flex min-w-0 flex-col gap-1.5" aria-label="Início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mode === "dark" ? LOGO_DARK_THEME : LOGO_RED} alt="Noma" className="h-7 w-auto self-start" />
          <span className="block truncate text-[11px] text-charcoal/45">{companyName}</span>
        </Link>
        {onCompact ? (
          <Tooltip title="Recolher menu (só ícones)" placement="right">
            <button
              type="button"
              onClick={onCompact}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/40 hover:bg-beige hover:text-charcoal"
              aria-label="Recolher menu"
            >
              <KeyboardDoubleArrowLeft sx={{ fontSize: 18 }} />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={onNavigate}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/50 hover:bg-beige lg:hidden"
            aria-label="Fechar navegação"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-3 pb-3">
        <label className="relative block">
          <span className="sr-only">Buscar no menu</span>
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35" />
          <input
            ref={searchRef}
            className="h-9 w-full rounded-lg border border-charcoal/10 bg-beige/70 pl-9 pr-12 text-[13px] text-charcoal placeholder:text-charcoal/40 transition focus:border-tan focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-tan/15"
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
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-charcoal/10 bg-surface px-1.5 py-0.5 font-sans text-[10px] text-charcoal/40 lg:block">
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
              <li className="px-3 py-2 text-[13px] text-charcoal/45">Nada encontrado.</li>
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
                        group.label === activeGroup ? "text-charcoal/75" : "text-charcoal/40 group-hover:text-charcoal/70"
                      }`}
                    >
                      {group.label}
                    </span>
                    <HiChevronDown
                      className={`h-3.5 w-3.5 text-charcoal/30 transition-transform duration-200 group-hover:text-charcoal/60 ${expanded ? "" : "-rotate-90"}`}
                    />
                  </button>
                  <Collapse
                    in={expanded}
                    timeout={320}
                    easing={{ enter: "cubic-bezier(0.16, 1, 0.3, 1)", exit: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                    unmountOnExit
                  >
                    <ul className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={onNavigate} />
                      ))}
                    </ul>
                  </Collapse>
                </div>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-charcoal/[0.06] p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-beige/70 p-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tan/10 text-[11px] font-semibold text-tan">
            {getInitials(user?.name)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold">{user?.name || "Noma"}</span>
            <span className="block truncate text-[11px] text-charcoal/50">{user?.role ? USER_ROLE_LABELS[user.role] : "Equipe"}</span>
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
                    active ? "bg-surface text-tan shadow-soft" : "text-charcoal/45 hover:bg-surface hover:text-charcoal"
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

type Flyout = { key: string; top: number } | null;

/**
 * Menu compacto (estilo RD Station): só os ícones; ao passar o mouse num grupo,
 * as páginas dele abrem ao lado.
 */
function RailBody({ onExpand }: { onExpand: () => void }) {
  const router = useRouter();
  const { user, isAdmin, can } = useAuth();
  const [flyout, setFlyout] = useState<Flyout>(null);
  const [search, setSearch] = useState("");
  const closeTimer = useRef<number | null>(null);

  const allowed = (item: NavItem) => (!item.adminOnly || isAdmin) && (!item.module || can(item.module));
  const visibleGroups = groups.map((group) => ({ ...group, items: group.items.filter(allowed) })).filter((group) => group.items.length);
  const term = normalize(search.trim());
  const searchResults = term
    ? [...topItems, ...groups.flatMap((group) => group.items), ...footerItems].filter(allowed).filter((item) => normalize(item.label).includes(term))
    : [];

  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setFlyout(null), 160);
  }
  function openAt(key: string, element: HTMLElement) {
    cancelClose();
    setFlyout({ key, top: element.getBoundingClientRect().top });
  }
  function close() {
    cancelClose();
    setFlyout(null);
    setSearch("");
  }

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    setFlyout(null);
    setSearch("");
  }, [router.pathname]);

  // ⌘K / Ctrl+K abre a busca do menu.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const button = document.getElementById("noma-rail-search");
        if (!button || button.offsetParent === null) return;
        event.preventDefault();
        setFlyout({ key: "search", top: button.getBoundingClientRect().top });
      }
      if (event.key === "Escape") setFlyout(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const railButton = (active: boolean, open: boolean) =>
    `relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 ${
      active ? "bg-tan/[0.1] text-tan" : open ? "bg-beige text-charcoal" : "text-charcoal/50 hover:bg-beige hover:text-charcoal"
    }`;

  const group = flyout ? visibleGroups.find((item) => item.label === flyout.key) : undefined;

  return (
    <div className="flex h-full flex-col items-center border-r border-charcoal/[0.08] bg-surface py-4 text-charcoal">
      <Link href="/" aria-label="Início" className="mb-4 flex h-10 w-10 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/favicon.png" alt="Noma" className="h-8 w-8 rounded-lg" />
      </Link>

      <nav className="noma-scroll flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto" aria-label="Menu">
        <button
          id="noma-rail-search"
          type="button"
          aria-label="Buscar no menu (⌘K)"
          className={railButton(false, flyout?.key === "search")}
          onClick={(event) => openAt("search", event.currentTarget)}
        >
          <SearchOutlined sx={{ fontSize: 20 }} />
        </button>
        {topItems.filter(allowed).map((item) => {
          const Icon = item.icon;
          const active = isActivePath(router.pathname, item.href);
          return (
            <Tooltip key={item.href} title={item.label} placement="right">
              <Link href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className={railButton(active, false)}>
                <Icon sx={{ fontSize: 20 }} />
              </Link>
            </Tooltip>
          );
        })}
        <span className="my-1 h-px w-6 bg-charcoal/[0.08]" aria-hidden />
        {visibleGroups.map((item) => {
          const Icon = item.icon;
          const active = item.items.some((link) => isActivePath(router.pathname, link.href));
          const open = flyout?.key === item.label;
          return (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              aria-haspopup="menu"
              aria-expanded={open}
              className={railButton(active, open)}
              onMouseEnter={(event) => openAt(item.label, event.currentTarget)}
              onMouseLeave={scheduleClose}
              onFocus={(event) => openAt(item.label, event.currentTarget)}
              onClick={(event) => (open ? setFlyout(null) : openAt(item.label, event.currentTarget))}
            >
              {active ? <span className="absolute -left-[14px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-tan" aria-hidden /> : null}
              <Icon sx={{ fontSize: 20 }} />
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1 pt-2">
        {footerItems.filter(allowed).map((item) => {
          const Icon = item.icon;
          const active = isActivePath(router.pathname, item.href);
          return (
            <Tooltip key={item.href} title={item.label} placement="right">
              <Link href={item.href} aria-label={item.label} className={railButton(active, false)}>
                <Icon sx={{ fontSize: 20 }} />
              </Link>
            </Tooltip>
          );
        })}
        <Tooltip title="Expandir menu" placement="right">
          <button type="button" aria-label="Expandir menu" className={railButton(false, false)} onClick={onExpand}>
            <KeyboardDoubleArrowRight sx={{ fontSize: 20 }} />
          </button>
        </Tooltip>
        <Tooltip title={`${user?.name || "Noma"}${user?.role ? ` · ${USER_ROLE_LABELS[user.role]}` : ""}`} placement="right">
          <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-tan/10 text-[11px] font-semibold text-tan">
            {getInitials(user?.name)}
          </span>
        </Tooltip>
      </div>

      {flyout && typeof document !== "undefined"
        ? createPortal(
            <div
              role="menu"
              onMouseEnter={cancelClose}
              onMouseLeave={() => flyout.key !== "search" && scheduleClose()}
              className="noma-flyout fixed z-[1300] w-60 rounded-xl border border-charcoal/[0.08] bg-surface p-2 text-charcoal shadow-soft"
              style={{ left: RAIL_WIDTH + 6, top: Math.max(8, Math.min(flyout.top - 8, window.innerHeight - 360)) }}
            >
              {flyout.key === "search" ? (
                <>
                  <input
                    autoFocus
                    className="h-9 w-full rounded-lg border border-charcoal/10 bg-beige/70 px-3 text-[13px] text-charcoal placeholder:text-charcoal/40 focus:border-tan focus:bg-surface focus:outline-none"
                    placeholder="Ir para..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onBlur={() => window.setTimeout(() => setFlyout((current) => (current?.key === "search" ? null : current)), 150)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && searchResults[0]) {
                        void router.push(searchResults[0].href);
                        close();
                      }
                      if (event.key === "Escape") close();
                    }}
                  />
                  {term ? (
                    <ul className="mt-1.5 space-y-0.5">
                      {searchResults.length ? (
                        searchResults.map((item) => (
                          <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={close} />
                        ))
                      ) : (
                        <li className="px-3 py-2 text-[13px] text-charcoal/45">Nada encontrado.</li>
                      )}
                    </ul>
                  ) : null}
                </>
              ) : group ? (
                <>
                  <p className="px-3 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">{group.label}</p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavLink key={item.href} item={item} active={isActivePath(router.pathname, item.href)} onNavigate={close} />
                    ))}
                  </ul>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** Menu compacto por padrão; a escolha fica salva neste navegador. */
function useCompactMenu(): [boolean, (value: boolean) => void] {
  const [compact, setCompact] = useState(true);
  useEffect(() => {
    try {
      setCompact(window.localStorage.getItem(COMPACT_KEY) !== "0");
    } catch {
      /* sem armazenamento: fica o padrão */
    }
  }, []);
  function update(value: boolean) {
    setCompact(value);
    try {
      window.localStorage.setItem(COMPACT_KEY, value ? "1" : "0");
    } catch {
      /* sem armazenamento: segue só em memória */
    }
  }
  return [compact, update];
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [compact, setCompact] = useCompactMenu();
  const width = compact ? RAIL_WIDTH : DRAWER_WIDTH;
  return (
    <>
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box", border: 0, bgcolor: "background.paper" },
        }}
      >
        <MenuBody onNavigate={onClose} />
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          width,
          flexShrink: 0,
          transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          [`& .MuiDrawer-paper`]: {
            width,
            boxSizing: "border-box",
            border: 0,
            bgcolor: "background.paper",
            overflowX: "hidden",
            transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          },
        }}
        open
      >
        {compact ? <RailBody onExpand={() => setCompact(false)} /> : <MenuBody onCompact={() => setCompact(true)} />}
      </Drawer>
    </>
  );
}
