import { useState } from "react";
import { HiOutlineLink, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { confirmDialog } from "@/components/ui/DialogHost";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { SchedulingLink, WeeklyWindow } from "@/types";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TZ = "America/Sao_Paulo";
const when = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const bookingUrl = (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/agendar/${slug}`;

const DURATIONS = ["15", "20", "30", "45", "60", "90", "120"].map((value) => ({ value, label: Number(value) >= 60 ? `${Number(value) / 60}h${Number(value) % 60 ? "30" : ""}` : `${value} min` }));

type Draft = Pick<
  SchedulingLink,
  "title" | "description" | "location" | "durationMinutes" | "bufferMinutes" | "minNoticeHours" | "horizonDays" | "windows" | "blocks" | "confirmationMessage" | "isActive"
>;

/** Converte "YYYY-MM-DDTHH:MM" (horário de Brasília) em ISO. */
const toIso = (local: string) => new Date(`${local}:00-03:00`).toISOString();

/** Links de agendamento externo, horários disponíveis, bloqueios e reuniões marcadas. */
export default function SchedulingPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const links = useAsyncData(() => (open ? resources.scheduling.links() : Promise.resolve([])), [open]);
  const bookings = useAsyncData(() => (open ? resources.scheduling.bookings() : Promise.resolve([])), [open]);
  const [editing, setEditing] = useState<{ link: SchedulingLink | null; draft: Draft } | null>(null);
  const [block, setBlock] = useState({ start: "", end: "", note: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function openEdit(link: SchedulingLink | null) {
    setError("");
    setBlock({ start: "", end: "", note: "" });
    setEditing({
      link,
      draft: link
        ? { ...link, windows: [...link.windows], blocks: [...link.blocks] }
        : {
            title: "Reunião",
            description: "",
            location: "",
            durationMinutes: 30,
            bufferMinutes: 0,
            minNoticeHours: 12,
            horizonDays: 30,
            windows: [1, 2, 3, 4, 5].flatMap((weekday) => [
              { weekday, start: "09:00", end: "12:00" },
              { weekday, start: "14:00", end: "18:00" },
            ]),
            blocks: [],
            confirmationMessage: "",
            isActive: true,
          },
    });
  }

  const patch = (change: Partial<Draft>) => setEditing((current) => (current ? { ...current, draft: { ...current.draft, ...change } } : current));

  function setWindow(index: number, change: Partial<WeeklyWindow>) {
    if (!editing) return;
    patch({ windows: editing.draft.windows.map((item, i) => (i === index ? { ...item, ...change } : item)) });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const payload = { ...editing.draft };
      if (editing.link) await resources.scheduling.updateLink(editing.link._id, payload);
      else await resources.scheduling.createLink(payload);
      setEditing(null);
      await links.reload();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(link: SchedulingLink) {
    if (!(await confirmDialog({ title: `Excluir o link "${link.title}"?`, message: "Quem tiver o link não consegue mais agendar. Reuniões já marcadas continuam.", confirmLabel: "Excluir", danger: true }))) return;
    await resources.scheduling.removeLink(link._id);
    await links.reload();
  }

  async function cancel(id: string) {
    if (!(await confirmDialog({ title: "Cancelar esta reunião?", message: "O horário volta a ficar livre no link e o compromisso é marcado como cancelado.", confirmLabel: "Cancelar reunião", danger: true }))) return;
    await resources.scheduling.cancelBooking(id);
    await bookings.reload();
  }

  const upcoming = (bookings.data || []).filter((item) => item.status === "confirmed" && Date.parse(item.end) > Date.now());

  return (
    <>
      <Modal open={open && !editing} onClose={onClose} size="lg" title="Agendamento externo" description="Envie o link para o lead escolher um horário livre na sua agenda. O horário reservado sai da lista na hora.">
        <div className="grid gap-5 pt-1">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-charcoal">Seus links</p>
              <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => openEdit(null)}>
                <HiOutlinePlus className="h-4 w-4" /> Novo link
              </button>
            </div>
            {links.isLoading ? <div className="skeleton h-14" /> : null}
            {!links.isLoading && !(links.data || []).length ? <p className="rounded-lg bg-beige px-3 py-3 text-sm text-charcoal/60">Crie um link com os seus horários de atendimento.</p> : null}
            <ul className="grid gap-2">
              {(links.data || []).map((link) => (
                <li key={link._id} className="rounded-xl border border-charcoal/10 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <HiOutlineLink className="h-4 w-4 text-tan" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-charcoal">
                      {link.title} · {link.durationMinutes} min
                    </span>
                    {!link.isActive ? <span className="chip bg-charcoal/[0.06] text-charcoal/50">Desativado</span> : null}
                    <button type="button" className="text-xs font-semibold text-tan hover:underline" onClick={() => openEdit(link)}>
                      Editar
                    </button>
                    <button type="button" className="btn-ghost h-8 w-8 hover:text-burgundy" aria-label="Excluir link" onClick={() => void remove(link)}>
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate rounded-md bg-beige px-2 py-1 text-xs text-charcoal/70">{bookingUrl(link.slug)}</span>
                    <CopyButton text={bookingUrl(link.slug)} label="Copiar link" className="btn-secondary !py-1 text-xs" />
                    <a href={bookingUrl(link.slug)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-tan hover:underline">
                      Abrir
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-charcoal">Próximas reuniões marcadas pelo link</p>
            {!upcoming.length ? (
              <p className="text-sm text-charcoal/50">Nenhuma reunião marcada.</p>
            ) : (
              <ul className="divide-y divide-charcoal/[0.06] rounded-xl border border-charcoal/10">
                {upcoming.map((item) => (
                  <li key={item._id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <span className="font-semibold capitalize text-charcoal">{when(item.start)}</span>
                    <span className="min-w-0 flex-1 truncate text-charcoal/70">
                      {item.name} · {[item.email, item.phone].filter(Boolean).join(" · ")}
                    </span>
                    <button type="button" className="text-xs font-semibold text-burgundy hover:underline" onClick={() => void cancel(item._id)}>
                      Cancelar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Modal>

      <Modal
        variant="drawer"
        size="lg"
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.link ? "Editar link de agendamento" : "Novo link de agendamento"}
        description="Horários de Brasília. Compromissos da sua agenda (em qualquer empresa) e do Google Agenda saem da lista automaticamente."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Voltar
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
              {busy ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4 pt-1 sm:grid-cols-2">
            <Field label="Título" full>
              <input className="input-search" value={editing.draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex.: Reunião de briefing" />
            </Field>
            <Field label="Duração">
              <Select value={String(editing.draft.durationMinutes)} onChange={(value) => patch({ durationMinutes: Number(value) })} options={DURATIONS} />
            </Field>
            <Field label="Intervalo entre reuniões" hint="Folga antes e depois de cada compromisso.">
              <Select
                value={String(editing.draft.bufferMinutes)}
                onChange={(value) => patch({ bufferMinutes: Number(value) })}
                options={["0", "10", "15", "30", "60"].map((value) => ({ value, label: value === "0" ? "Sem intervalo" : `${value} min` }))}
              />
            </Field>
            <Field label="Antecedência mínima" hint="Ninguém marca em cima da hora.">
              <Select
                value={String(editing.draft.minNoticeHours)}
                onChange={(value) => patch({ minNoticeHours: Number(value) })}
                options={["0", "2", "4", "12", "24", "48", "72"].map((value) => ({ value, label: value === "0" ? "Nenhuma" : `${value} horas` }))}
              />
            </Field>
            <Field label="Mostrar horários até">
              <Select
                value={String(editing.draft.horizonDays)}
                onChange={(value) => patch({ horizonDays: Number(value) })}
                options={["7", "14", "30", "60", "90"].map((value) => ({ value, label: `${value} dias à frente` }))}
              />
            </Field>
            <Field label="Local ou link da reunião" full>
              <input className="input-search" value={editing.draft.location} onChange={(e) => patch({ location: e.target.value })} placeholder="Google Meet, endereço do estúdio..." />
            </Field>
            <Field label="Descrição para o lead" full>
              <textarea className="input-search min-h-[70px]" value={editing.draft.description} onChange={(e) => patch({ description: e.target.value })} />
            </Field>

            <div className="sm:col-span-2">
              <p className="mb-2 text-[13px] font-semibold text-charcoal">Horários disponíveis na semana</p>
              <ul className="grid gap-1.5">
                {editing.draft.windows.map((item, index) => (
                  <li key={index} className="flex flex-wrap items-center gap-2">
                    <div className="w-36">
                      <Select value={String(item.weekday)} onChange={(value) => setWindow(index, { weekday: Number(value) })} options={WEEKDAYS.map((label, value) => ({ value: String(value), label }))} />
                    </div>
                    <input type="time" className="input-search !w-auto" value={item.start} onChange={(e) => setWindow(index, { start: e.target.value })} aria-label="Início" />
                    <span className="text-sm text-charcoal/50">até</span>
                    <input type="time" className="input-search !w-auto" value={item.end} onChange={(e) => setWindow(index, { end: e.target.value })} aria-label="Fim" />
                    <button type="button" className="btn-ghost h-8 w-8 hover:text-burgundy" aria-label="Remover horário" onClick={() => patch({ windows: editing.draft.windows.filter((_, i) => i !== index) })}>
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-2 text-sm font-semibold text-tan hover:underline" onClick={() => patch({ windows: [...editing.draft.windows, { weekday: 1, start: "09:00", end: "12:00" }] })}>
                + Adicionar horário
              </button>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-2 text-[13px] font-semibold text-charcoal">Bloqueios (férias, gravações, feriados)</p>
              {editing.draft.blocks.length ? (
                <ul className="mb-2 grid gap-1">
                  {editing.draft.blocks.map((item, index) => (
                    <li key={item._id || index} className="flex items-center gap-2 rounded-md bg-beige px-2 py-1 text-sm text-charcoal/75">
                      <span className="flex-1 capitalize">
                        {when(item.start)} → {when(item.end)}
                        {item.note ? ` · ${item.note}` : ""}
                      </span>
                      <button type="button" className="text-xs font-semibold text-burgundy hover:underline" onClick={() => patch({ blocks: editing.draft.blocks.filter((_, i) => i !== index) })}>
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <input type="datetime-local" className="input-search !w-auto" value={block.start} onChange={(e) => setBlock({ ...block, start: e.target.value })} aria-label="Início do bloqueio" />
                <span className="text-sm text-charcoal/50">até</span>
                <input type="datetime-local" className="input-search !w-auto" value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })} aria-label="Fim do bloqueio" />
                <input className="input-search !w-40" value={block.note} placeholder="Motivo (opcional)" onChange={(e) => setBlock({ ...block, note: e.target.value })} />
                <button
                  type="button"
                  className="btn-secondary !py-1.5 text-xs"
                  disabled={!block.start || !block.end || block.end <= block.start}
                  onClick={() => {
                    patch({ blocks: [...editing.draft.blocks, { start: toIso(block.start), end: toIso(block.end), note: block.note }] });
                    setBlock({ start: "", end: "", note: "" });
                  }}
                >
                  Bloquear
                </button>
              </div>
            </div>

            <Field label="E-mail de confirmação para o lead" hint="Use {nome}, {titulo}, {data}, {hora} e {local}. Em branco = mensagem padrão." full>
              <textarea
                className="input-search min-h-[90px]"
                value={editing.draft.confirmationMessage}
                placeholder={'Olá, {nome}! Sua reunião "{titulo}" está confirmada para {data} às {hora}.{local}'}
                onChange={(e) => patch({ confirmationMessage: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-charcoal sm:col-span-2">
              <input type="checkbox" checked={editing.draft.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
              Link ativo
            </label>
            {error ? <p className="text-sm text-burgundy sm:col-span-2">{error}</p> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
