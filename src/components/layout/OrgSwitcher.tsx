import { useState } from "react";
import { useRouter } from "next/router";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { HiCheck, HiChevronUpDown, HiOutlineCog6Tooth } from "react-icons/hi2";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyName } from "@/contexts/WorkspaceContext";
import type { OrgSummary } from "@/types";
import { getInitials } from "@/utils/format";

export function OrgBadge({ org, size = 28 }: { org: Pick<OrgSummary, "name" | "logo" | "color">; size?: number }) {
  return org.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={org.logo} alt="" className="shrink-0 rounded-md object-contain" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
      style={{ width: size, height: size, backgroundColor: org.color || "hsl(var(--c-tan))" }}
    >
      {getInitials(org.name)}
    </span>
  );
}

/** Empresa ativa no topo; quem tem mais de uma (ou é administrador geral) troca por aqui. */
export default function OrgSwitcher() {
  const router = useRouter();
  const { user, org, switchOrg } = useAuth();
  const companyName = useCompanyName();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const orgs = user?.orgs || [];
  const canSwitch = orgs.length > 1 || user?.isSuperAdmin;
  const name = org?.name || companyName;

  if (!canSwitch) return <span className="text-sm font-semibold text-charcoal">{name}</span>;

  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        className="-ml-1.5 flex max-w-[240px] items-center gap-2 rounded-lg px-1.5 py-1 text-left transition hover:bg-beige"
      >
        {org ? <OrgBadge org={org} size={24} /> : null}
        <span className="truncate text-sm font-semibold text-charcoal">{name}</span>
        <HiChevronUpDown className="h-4 w-4 shrink-0 text-charcoal/40" />
      </button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 280, mt: 0.5 } } }}>
        <p className="px-4 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Empresas</p>
        {orgs.map((item) => {
          const active = item._id === user?.orgId;
          return (
            <MenuItem
              key={item._id}
              selected={active}
              onClick={() => {
                setAnchor(null);
                if (!active) switchOrg(item._id);
              }}
            >
              <span className="flex w-full items-center gap-3">
                <OrgBadge org={item} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                {active ? <HiCheck className="h-4 w-4 text-tan" /> : null}
              </span>
            </MenuItem>
          );
        })}
        {user?.isSuperAdmin ? <Divider /> : null}
        {user?.isSuperAdmin ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              void router.push("/configuracoes/empresas");
            }}
          >
            <span className="flex items-center gap-3 text-sm text-charcoal/70">
              <HiOutlineCog6Tooth className="h-5 w-5" /> Gerenciar empresas
            </span>
          </MenuItem>
        ) : null}
      </Menu>
    </>
  );
}
