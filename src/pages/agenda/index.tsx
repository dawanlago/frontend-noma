import { useMemo, useState } from "react";
import { HiOutlineLink } from "react-icons/hi2";
import Head from "next/head";
import Link from "next/link";
import DayBusy from "@/components/agenda/DayBusy";
import GoogleCalendarConnect from "@/components/agenda/GoogleCalendarConnect";
import SchedulingPanel from "@/components/agenda/SchedulingPanel";
import EntityPicker from "@/components/base/EntityPicker";
import Select from "@/components/ui/Select";
import Field from "@/components/tools/Field";
import OwnerFilter from "@/components/tools/OwnerFilter";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import OptionSelect from "@/components/options/OptionSelect";
import { TaskTypeBadge } from "@/components/tasks/TaskType";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Task, TaskStatus } from "@/types";
import { formatDateOnly } from "@/utils/format";
import { confirmDialog } from "@/components/ui/DialogHost";

const STATUSES: { value: TaskStatus; label: string; tone: string }[] = [
  { value: "todo", label: "A fazer", tone: "bg-gold/15 text-gold" },
  { value: "doing", label: "Em andamento", tone: "bg-tan/15 text-tan" },
  { value: "done", label: "Concluído", tone: "bg-sage/15 text-sage" },
];
const statusOf = (task: Task) => STATUSES.find((item) => item.value === (task.status || (task.done ? "done" : "todo"))) || STATUSES[0];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function longDay(value: string) {
  return fromIso(value).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

const DURATIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2 horas" },
  { value: "180", label: "3 horas" },
  { value: "240", label: "4 horas" },
  { value: "480", label: "Dia de gravação (8h)" },
];

interface Draft {
  type: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  leadId: string;
  notes: string;
}

export default function AgendaPage() {
  const { isAdmin } = useAuth();
  const { labelOf } = useWorkspace();
  const [ownerId, setOwnerId] = useState("");
  const { data, isLoading, error, setData } = useAsyncData(() => resources.tasks.list({ ownerId }), [ownerId]);
  const leads = useAsyncData(() => resources.leads.list().catch(() => []));
  const contacts = useAsyncData(() => resources.contacts.list().catch(() => []));
  const today = iso(new Date());
  const [cursor, setCursor] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ task: Task | null; draft: Draft } | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);

  const tasks = useMemo(() => (data || []).filter((task) => task.dueDate), [data]);
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => map.set(task.dueDate, [...(map.get(task.dueDate) || []), task]));
    map.forEach((list) => list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")));
    return map;
  }, [tasks]);

  /** Aniversários por "MM-DD" (29/02 cai em 28/02 nos anos não bissextos). */
  const birthdaysByDay = useMemo(() => {
    const map = new Map<string, { _id: string; name: string; year: number }[]>();
    (contacts.data || []).forEach((contact) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(contact.birthDate || "");
      if (!match) return;
      const key = `${match[2]}-${match[3]}`;
      map.set(key, [...(map.get(key) || []), { _id: contact._id, name: contact.name, year: Number(match[1]) }]);
    });
    return map;
  }, [contacts.data]);
  const birthdaysOn = (date: string) => {
    const key = date.slice(5);
    const year = Number(date.slice(0, 4));
    const leap = new Date(year, 1, 29).getDate() === 29;
    return [...(birthdaysByDay.get(key) || []), ...(key === "02-28" && !leap ? birthdaysByDay.get("02-29") || [] : [])];
  };

  const monthStart = fromIso(`${cursor}-01`);
  const blanks = monthStart.getDay();
  const totalDays = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const upcoming = tasks
    .filter((task) => task.dueDate >= today && !task.done)
    .sort((a, b) => `${a.dueDate} ${a.time || "99"}`.localeCompare(`${b.dueDate} ${b.time || "99"}`))
    .slice(0, 3);
  const dayTasks = byDay.get(selectedDate) || [];
  const dayBirthdays = birthdaysOn(selectedDate);
  const openTask = (data || []).find((task) => task._id === openTaskId) || null;

  function goToMonth(offset: number) {
    const next = new Date(monthStart.getFullYear(), monthStart.getMonth() + offset, 1);
    setCursor(iso(next).slice(0, 7));
  }

  function openCreate(date = selectedDate) {
    setFormError("");
    setEditor({ task: null, draft: { type: "", title: "", date, time: "10:00", duration: "60", leadId: "", notes: "" } });
  }

  function openEdit(task: Task) {
    setOpenTaskId(null);
    setFormError("");
    setEditor({ task, draft: {
        type: task.type || "",
        title: task.title,
        date: task.dueDate,
        time: task.time,
        duration: String(task.duration || 60),
        leadId: task.leadId || "",
        notes: task.notes,
      },
    });
  }

  const upsert = (saved: Task) =>
    setData((current) => {
      const list = current || [];
      return list.some((task) => task._id === saved._id)
        ? list.map((task) => (task._id === saved._id ? { ...task, ...saved, ownerName: task.ownerName } : task))
        : [...list, saved];
    });

  async function handleSave() {
    if (!editor) return;
    const { task, draft } = editor;
    if (!draft.title.trim() || !draft.date) {
      setFormError("Informe o título e a data.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const payload = {
        title: draft.title.trim(),
        type: draft.type,
        dueDate: draft.date,
        time: draft.time,
        duration: Number(draft.duration) || 60,
        leadId: draft.leadId,
        notes: draft.notes,
      };
      const saved = task ? await resources.tasks.update(task._id, payload) : await resources.tasks.create(payload);
      upsert(saved);
      setEditor(null);
      setSelectedDate(draft.date);
      setCursor(draft.date.slice(0, 7));
    } catch (err) {
      setFormError(apiError(err, "Não foi possível salvar o compromisso."));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(task: Task, status: TaskStatus) {
    setBusy(true);
    try {
      upsert(await resources.tasks.update(task._id, { status }));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(task: Task) {
    if (!(await confirmDialog({ title: `Excluir o compromisso "${task.title}"?`, confirmLabel: "Excluir", danger: true }))) return;
    await resources.tasks.remove(task._id);
    setData((current) => (current || []).filter((item) => item._id !== task._id));
    setOpenTaskId(null);
  }

  return (
    <>
      <Head>
        <title>Agenda | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Visão geral"
        title="Agenda"
        description="Clique no dia para ver a agenda, dê dois cliques para marcar um compromisso e abra para atualizar o status. Atividades com data também aparecem aqui."
        actions={
          <>
            <GoogleCalendarConnect onChange={(status) => setGoogleConnected(status.connected)} />
            <button type="button" className="btn-secondary" onClick={() => setSchedulingOpen(true)}>
              <HiOutlineLink className="h-4 w-4" /> Agendamento externo
            </button>
            <button type="button" className="btn-primary" onClick={() => openCreate()}>
              Novo compromisso
            </button>
          </>
        }
      />
      {isAdmin ? (
        <div className="mb-4 flex justify-end">
          <OwnerFilter value={ownerId} onChange={setOwnerId} />
        </div>
      ) : null}
      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}

      <section className="mb-6">
        <p className="eyebrow">Na fila</p>
        <h2 className="mb-3 text-lg font-semibold text-charcoal">Próximos compromissos</h2>
        {upcoming.length === 0 ? (
          <p className="card px-5 py-6 text-sm text-charcoal/50">Nenhum compromisso futuro.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {upcoming.map((task) => {
              const status = statusOf(task);
              return (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => {
                    setCursor(task.dueDate.slice(0, 7));
                    setSelectedDate(task.dueDate);
                    setOpenTaskId(task._id);
                  }}
                  className="card p-4 text-left transition hover:border-tan/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-medium capitalize text-charcoal/45">
                      {fromIso(task.dueDate).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                      {task.time ? ` · ${task.time}` : ""}
                    </p>
                    <span className={`chip ${status.tone}`}>{status.label}</span>
                  </div>
                  <p className="mt-2 font-semibold text-charcoal">{task.title}</p>
                  <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-charcoal/45">
                    <TaskTypeBadge type={task.type} />
                    <span>{task.leadName || "Sem negociação"}</span>
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Calendário</p>
              <h2 className="text-lg font-semibold capitalize">{monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary !py-1.5" onClick={() => goToMonth(-1)}>
                Anterior
              </button>
              <button
                type="button"
                className="btn-secondary !py-1.5"
                onClick={() => {
                  setCursor(today.slice(0, 7));
                  setSelectedDate(today);
                }}
              >
                Hoje
              </button>
              <button type="button" className="btn-secondary !py-1.5" onClick={() => goToMonth(1)}>
                Próximo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/40">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          {isLoading ? (
            <div className="mt-2 grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, index) => (
                <div key={index} className="skeleton h-[92px]" />
              ))}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-7 gap-2">
              {Array.from({ length: blanks }).map((_, index) => (
                <div key={`blank-${index}`} />
              ))}
              {Array.from({ length: totalDays }).map((_, index) => {
                const date = `${cursor}-${String(index + 1).padStart(2, "0")}`;
                const items = byDay.get(date) || [];
                const birthdays = birthdaysOn(date);
                const isToday = date === today;
                const isSelected = date === selectedDate;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    onDoubleClick={() => {
                      setSelectedDate(date);
                      openCreate(date);
                    }}
                    className={`min-h-[92px] rounded-xl border p-2 text-left transition ${
                      isSelected
                        ? "border-tan bg-tan/[0.08] shadow-soft"
                        : isToday
                          ? "border-tan/40 bg-tan/[0.04]"
                          : "border-charcoal/[0.06] bg-surface hover:border-tan/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold ${isToday || isSelected ? "text-tan" : "text-charcoal"}`}>{index + 1}</p>
                      {items.length ? (
                        <span className="rounded-full bg-charcoal/5 px-1.5 text-[10px] font-semibold text-charcoal/50">{items.length}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 space-y-1">
                      {birthdays.slice(0, 1).map((person) => (
                        <p key={person._id} className="truncate rounded-full bg-burgundy/10 px-2 py-0.5 text-[11px] text-burgundy">
                          🎂 {person.name.split(" ")[0]}
                          {birthdays.length > 1 ? ` +${birthdays.length - 1}` : ""}
                        </p>
                      ))}
                      {items.slice(0, 2).map((task) => (
                        <p key={task._id} className={`truncate rounded-full px-2 py-0.5 text-[11px] ${statusOf(task).tone}`}>
                          {task.time ? `${task.time} ` : ""}
                          {task.title}
                        </p>
                      ))}
                      {items.length > 2 ? <p className="text-[10px] text-tan">+{items.length - 2}</p> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="card self-start p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Agenda do dia</p>
              <h2 className="mt-1 text-lg font-semibold capitalize text-charcoal">{longDay(selectedDate)}</h2>
              <p className="mt-1 text-xs text-charcoal/45">
                {dayTasks.length ? `${dayTasks.length} compromisso${dayTasks.length > 1 ? "s" : ""}` : "Nenhum compromisso neste dia"}
              </p>
            </div>
            <button type="button" className="btn-primary !px-3 !py-2 text-sm" onClick={() => openCreate()}>
              Novo
            </button>
          </div>
          {dayBirthdays.length ? (
            <ul className="mt-4 space-y-1.5">
              {dayBirthdays.map((person) => (
                <li key={person._id} className="rounded-xl bg-burgundy/[0.06] px-3 py-2 text-sm text-charcoal">
                  🎂{" "}
                  <Link href={`/contatos/${person._id}`} className="font-medium hover:underline">
                    {person.name}
                  </Link>
                  <span className="text-xs text-charcoal/50"> · faz {Number(selectedDate.slice(0, 4)) - person.year} anos</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 space-y-2">
            {dayTasks.length === 0 ? (
              <p className="rounded-xl bg-beige/60 px-4 py-6 text-sm text-charcoal/50">Clique em Novo para marcar um horário.</p>
            ) : (
              dayTasks.map((task) => {
                const status = statusOf(task);
                return (
                  <button
                    key={task._id}
                    type="button"
                    onClick={() => setOpenTaskId(task._id)}
                    className="w-full rounded-xl border border-charcoal/10 bg-surface px-4 py-3 text-left transition hover:border-tan/40 hover:bg-beige/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-charcoal">{task.title}</p>
                        <p className="mt-1 text-xs text-charcoal/45">
                          {task.time || "Sem horário"}
                          {task.type ? ` · ${labelOf("taskType", task.type)}` : ""}
                          {task.leadName ? ` · ${task.leadName}` : ""}
                          {isAdmin && task.ownerName ? ` · ${task.ownerName}` : ""}
                        </p>
                      </div>
                      <span className={`chip shrink-0 ${status.tone}`}>{status.label}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={Boolean(openTask)}
        title={openTask?.title || "Compromisso"}
        description={openTask ? `${formatDateOnly(openTask.dueDate)}${openTask.time ? ` às ${openTask.time}` : ""}` : undefined}
        onClose={() => setOpenTaskId(null)}
        footer={
          openTask ? (
            <div className="flex w-full flex-wrap justify-between gap-2">
              <button type="button" className="btn-secondary !text-burgundy" onClick={() => void handleDelete(openTask)}>
                Excluir
              </button>
              <div className="flex gap-2">
                {openTask.leadId ? (
                  <Link href={`/crm/${openTask.leadId}`} className="btn-secondary">
                    Abrir negociação
                  </Link>
                ) : null}
                <button type="button" className="btn-primary" onClick={() => openEdit(openTask)}>
                  Editar
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {openTask ? (
          <div className="space-y-5">
            <dl className="space-y-3">
              {openTask.type ? (
                <div>
                  <dt className="text-xs font-medium text-charcoal/45">Tipo</dt>
                  <dd className="mt-1 text-sm text-charcoal">
                    <TaskTypeBadge type={openTask.type} />
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-medium text-charcoal/45">Negociação</dt>
                <dd className="mt-1 text-sm text-charcoal">{openTask.leadName || "Sem negociação vinculada"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-charcoal/45">Descrição</dt>
                <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-charcoal">{openTask.notes?.trim() || "Sem descrição."}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs font-medium text-charcoal/45">Status</p>
              <div className="grid grid-cols-3 gap-2">
                {STATUSES.map((item) => {
                  const active = statusOf(openTask).value === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={busy}
                      onClick={() => void setStatus(openTask, item.value)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        active ? "bg-ink text-surface" : "bg-beige text-charcoal/70 hover:bg-tan/10 hover:text-charcoal"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        variant="drawer"
        open={Boolean(editor)}
        title={editor?.task ? "Editar compromisso" : "Novo compromisso"}
        description={editor ? longDay(editor.draft.date || today) : undefined}
        onClose={() => setEditor(null)}
        footer={
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleSave()}>
            {busy ? "Salvando..." : "Salvar"}
          </button>
        }
      >
        {editor ? (
          <form
            className="grid gap-4 pt-1 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <Field label="Tipo" full hint="Cadastre um tipo novo pela opção no fim da lista.">
              <OptionSelect
                list="taskType"
                value={editor.draft.type}
                emptyLabel="Sem tipo"
                onChange={(type) => setEditor({ ...editor, draft: { ...editor.draft, type } })}
              />
            </Field>
            <Field label="Título" full>
              <input
                className="input-search"
                value={editor.draft.title}
                autoFocus
                placeholder="Reunião, gravação, call, visita..."
                onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, title: event.target.value } })}
              />
            </Field>
            <Field label="Data">
              <input
                className="input-search"
                type="date"
                value={editor.draft.date}
                onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, date: event.target.value } })}
              />
            </Field>
            <Field label="Horário" hint={googleConnected ? "Com horário, vai para o seu Google Agenda." : undefined}>
              <input
                className="input-search"
                type="time"
                value={editor.draft.time}
                onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, time: event.target.value } })}
              />
            </Field>
            <Field label="Duração">
              <Select
                value={editor.draft.duration}
                onChange={(duration) => setEditor({ ...editor, draft: { ...editor.draft, duration } })}
                options={DURATIONS}
              />
            </Field>
            {editor.draft.date ? (
              <div className="sm:col-span-2">
                <DayBusy date={editor.draft.date} time={editor.draft.time} duration={Number(editor.draft.duration) || 60} ignoreTitle={editor.task?.title} />
              </div>
            ) : null}
            <Field label="Negociação" full group hint="Opcional. Vincule se o compromisso for de uma venda.">
              <EntityPicker
                items={(leads.data || []).map((lead) => ({ id: lead._id, label: lead.name, sublabel: lead.company || lead.contactName }))}
                value={editor.draft.leadId}
                onChange={(leadId) => setEditor({ ...editor, draft: { ...editor.draft, leadId } })}
                placeholder="Sem negociação"
                showAvatar={false}
              />
            </Field>
            <Field label="Descrição" full>
              <textarea
                className="input-search min-h-[90px] resize-y"
                value={editor.draft.notes}
                placeholder="Pauta, local, observações..."
                onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, notes: event.target.value } })}
              />
            </Field>
            {formError ? <p className="text-sm text-burgundy sm:col-span-2">{formError}</p> : null}
            <button type="submit" className="hidden" aria-hidden />
          </form>
        ) : null}
      </Modal>
      <SchedulingPanel open={schedulingOpen} onClose={() => setSchedulingOpen(false)} />
    </>
  );
}
