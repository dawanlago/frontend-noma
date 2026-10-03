import { useEffect, useState } from "react";
import { HiOutlineCalendarDays } from "react-icons/hi2";
import { resources } from "@/lib/resources";
import type { BusyItem } from "@/types";

const TZ = "America/Sao_Paulo";
const timeOf = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const SOURCE_LABEL: Record<BusyItem["source"], string> = { noma: "Noma", reserva: "Reunião marcada", bloqueio: "Bloqueio", google: "Google Agenda" };

/**
 * Agenda do dia escolhido (compromissos, reuniões marcadas pelo link, bloqueios e Google Agenda),
 * para marcar um compromisso sem conflito. `time`/`duration` destacam conflito com o horário escolhido.
 */
export default function DayBusy({ date, time, duration = 60, ignoreTitle }: { date: string; time?: string; duration?: number; ignoreTitle?: string }) {
  const [items, setItems] = useState<BusyItem[] | null>(null);
  const [google, setGoogle] = useState("");

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    let alive = true;
    setItems(null);
    resources.scheduling
      .busy(date)
      .then((result) => {
        if (!alive) return;
        setItems(result.items.filter((item) => !ignoreTitle || item.title !== ignoreTitle));
        setGoogle(result.google);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [date, ignoreTitle]);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // Conflito com o horário escolhido (horário de Brasília, UTC−3).
  const chosen = time && /^\d{2}:\d{2}$/.test(time) ? Date.parse(`${date}T${time}:00-03:00`) : NaN;
  const conflicts = (item: BusyItem) => !Number.isNaN(chosen) && Date.parse(item.start) < chosen + duration * 60_000 && chosen < Date.parse(item.end);

  return (
    <div className="rounded-lg border border-charcoal/10 bg-beige/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-charcoal/60">
        <HiOutlineCalendarDays className="h-4 w-4" /> Sua agenda neste dia
      </p>
      {items === null ? (
        <p className="text-xs text-charcoal/45">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-charcoal/50">Nada marcado. Dia livre.</p>
      ) : (
        <ul className="grid gap-1">
          {items.map((item, index) => (
            <li
              key={`${item.start}-${index}`}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs ${conflicts(item) ? "bg-burgundy/10 font-semibold text-burgundy" : "text-charcoal/75"}`}
            >
              <span className="tabular-nums">
                {timeOf(item.start)}–{timeOf(item.end)}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-60">{SOURCE_LABEL[item.source]}</span>
            </li>
          ))}
        </ul>
      )}
      {items?.some(conflicts) ? <p className="mt-2 text-xs font-semibold text-burgundy">O horário escolhido bate com outro compromisso.</p> : null}
      {google === "reconnect" ? <p className="mt-2 text-[11px] text-charcoal/50">Para ver também o Google Agenda aqui, conecte o Google de novo (nova permissão).</p> : null}
    </div>
  );
}
