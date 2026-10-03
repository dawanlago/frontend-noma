import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import { resources } from "@/lib/resources";
import type { AppNotification } from "@/types";

const POLL_MS = 60_000;

function ago(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

/** Sino de avisos: consulta a cada minuto (o backend é serverless, sem conexão aberta). */
export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const load = useCallback(() => {
    resources.notifications
      .list()
      .then((data) => {
        setItems(data.items);
        setUnread(data.unread);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  function open(item: AppNotification) {
    setAnchor(null);
    if (!item.readAt) {
      setItems((current) => current.map((entry) => (entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry)));
      setUnread((count) => Math.max(0, count - 1));
      void resources.notifications.read([item._id]);
    }
    if (item.link) void router.push(item.link);
  }

  function readAll() {
    setItems((current) => current.map((entry) => ({ ...entry, readAt: entry.readAt || new Date().toISOString() })));
    setUnread(0);
    void resources.notifications.read();
  }

  return (
    <>
      <IconButton aria-label={unread ? `Avisos (${unread} novos)` : "Avisos"} onClick={(event) => setAnchor(event.currentTarget)}>
        <Badge color="error" badgeContent={unread} max={99}>
          <NotificationsNoneOutlined />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: "calc(100vw - 24px)", mt: 0.75 } } }}
      >
        <div className="flex items-center justify-between border-b border-charcoal/[0.08] px-4 py-3">
          <p className="text-sm font-semibold text-charcoal">Avisos</p>
          {unread ? (
            <button type="button" className="text-xs font-semibold text-tan hover:underline" onClick={readAll}>
              Marcar todos como lidos
            </button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-charcoal/50">Nenhum aviso por aqui.</p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-charcoal/[0.06] overflow-y-auto">
            {items.map((item) => (
              <li key={item._id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-beige ${item.readAt ? "" : "bg-tan/[0.05]"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-tan"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-charcoal">{item.title}</span>
                    {item.body ? <span className="mt-0.5 block whitespace-pre-line text-xs leading-5 text-charcoal/65">{item.body}</span> : null}
                    <span className="mt-1 block text-[11px] text-charcoal/40">{ago(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Popover>
    </>
  );
}
