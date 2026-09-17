import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/utils/format";
import type { Task, TaskStatus } from "@/types";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function taskStatus(task: Task) {
  return (task.status || (task.isCompleted ? "done" : "todo")) as TaskStatus;
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

function statusTone(status: TaskStatus) {
  if (status === "done") return "bg-sage/15 text-sage";
  if (status === "doing") return "bg-tan/15 text-tan";
  return "bg-gold/15 text-gold";
}

function dealHref(task: Task) {
  return task.deal?.funnelId ? `/funis/${task.deal.funnelId}/negociacao/${task.dealId}` : "/funis";
}

function buildDueDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const due = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours || 10, minutes || 0, 0, 0);
  return due.toISOString();
}

export default function AppointmentsPage() {
  const { data: tasks, isLoading, error, reload } = useAsyncData(() => resources.tasks.list());
  const { data: deals } = useAsyncData(() => resources.deals.list());
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    time: "10:00",
    dealId: "",
  });

  const monthDays = useMemo(() => {
    const first = startOfMonth(cursor);
    return { blanks: first.getDay(), total: daysInMonth(cursor) };
  }, [cursor]);

  const dealOptions = useMemo(
    () => [
      { value: "", label: "Sem negociação" },
      ...(deals || []).map((deal) => ({ value: deal._id, label: deal.title })),
    ],
    [deals],
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const task of tasks || []) {
      const date = new Date(task.dueDate);
      if (date.getMonth() !== cursor.getMonth() || date.getFullYear() !== cursor.getFullYear()) continue;
      const day = date.getDate();
      map.set(day, [...(map.get(day) || []), task]);
    }
    for (const [day, dayTasks] of map) {
      map.set(
        day,
        dayTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
      );
    }
    return map;
  }, [tasks, cursor]);

  const selectedDayTasks = useMemo(() => {
    if (selectedDate.getMonth() !== cursor.getMonth() || selectedDate.getFullYear() !== cursor.getFullYear()) {
      return [];
    }
    return tasksByDay.get(selectedDate.getDate()) || [];
  }, [cursor, selectedDate, tasksByDay]);

  const selectedTask = (tasks || []).find((task) => task._id === selectedTaskId) || null;

  const upcoming = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return [...(tasks || [])]
      .filter((task) => new Date(task.dueDate).getTime() >= start.getTime() && taskStatus(task) !== "done")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3);
  }, [tasks]);

  function openTask(task: Task) {
    const date = new Date(task.dueDate);
    setCursor(startOfMonth(date));
    setSelectedDate(date);
    setSelectedTaskId(task._id);
  }

  function goToMonth(offset: number) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
    setCursor(next);
    if (selectedDate.getMonth() !== next.getMonth() || selectedDate.getFullYear() !== next.getFullYear()) {
      setSelectedDate(next);
    }
  }

  function goToToday() {
    const today = new Date();
    setCursor(startOfMonth(today));
    setSelectedDate(today);
  }

  function openCreate() {
    setCreateError("");
    setForm({ title: "", description: "", time: "10:00", dealId: "" });
    setCreateOpen(true);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    setCreateError("");
    try {
      const created = await resources.tasks.create({
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: buildDueDate(selectedDate, form.time),
        status: "todo",
        ...(form.dealId ? { dealId: form.dealId } : {}),
      });
      setCreateOpen(false);
      await reload();
      setSelectedTaskId(created._id);
    } catch (createErr) {
      setCreateError(
        (createErr as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível criar o compromisso.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    setIsSaving(true);
    try {
      await resources.tasks.setStatus(taskId, status);
      await reload();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Head><title>Compromissos | Noma CRM</title></Head>
      <PageHeader
        eyebrow="Comercial"
        title="Compromissos"
        description="Clique no dia, crie o compromisso na agenda e abra para atualizar o status."
      />

      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Na fila</p>
            <h2 className="font-display text-lg font-semibold text-charcoal">Próximos compromissos</h2>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <p className="card px-5 py-6 text-sm text-charcoal/50">Nenhum compromisso futuro cadastrado.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {upcoming.map((task) => {
              const status = taskStatus(task);
              return (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => openTask(task)}
                  className="card p-4 text-left transition hover:border-tan/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-medium capitalize text-charcoal/45">
                      {new Date(task.dueDate).toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {" · "}
                      {formatTime(task.dueDate)}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(status)}`}>
                      {TASK_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-charcoal">{task.title}</p>
                  <p className="mt-1 text-xs text-charcoal/45">{task.deal?.title || "Sem negociação"}</p>
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
              <h2 className="font-display text-lg font-semibold capitalize">
                {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary h-9 px-3" onClick={() => goToMonth(-1)}>
                Anterior
              </button>
              <button type="button" className="btn-secondary h-9 px-3" onClick={goToToday}>
                Hoje
              </button>
              <button type="button" className="btn-secondary h-9 px-3" onClick={() => goToMonth(1)}>
                Próximo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/40">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="mt-3 grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, index) => (
                <div key={index} className="h-[92px] rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-7 gap-2">
              {Array.from({ length: monthDays.blanks }).map((_, index) => (
                <div key={`blank-${index}`} />
              ))}
              {Array.from({ length: monthDays.total }).map((_, index) => {
                const day = index + 1;
                const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
                const dayTasks = tasksByDay.get(day) || [];
                const isToday = sameDay(date, new Date());
                const isSelected = sameDay(date, selectedDate);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    onDoubleClick={() => {
                      setSelectedDate(date);
                      openCreate();
                    }}
                    className={`min-h-[92px] rounded-2xl border p-2 text-left transition ${
                      isSelected
                        ? "border-tan bg-tan/[0.08] shadow-soft"
                        : isToday
                          ? "border-tan/40 bg-tan/[0.04]"
                          : "border-charcoal/[0.06] bg-white hover:border-tan/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold ${isToday || isSelected ? "text-tan" : "text-charcoal"}`}>
                        {day}
                      </p>
                      {dayTasks.length ? (
                        <span className="rounded-full bg-charcoal/5 px-1.5 text-[10px] font-semibold text-charcoal/50">
                          {dayTasks.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <p
                          key={task._id}
                          className={`truncate rounded-full px-2 py-0.5 text-[11px] ${statusTone(taskStatus(task))}`}
                        >
                          {formatTime(task.dueDate)} {task.title}
                        </p>
                      ))}
                      {dayTasks.length > 2 ? (
                        <p className="text-[10px] text-tan">+{dayTasks.length - 2}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Agenda do dia</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-charcoal">
                {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <p className="mt-1 text-xs text-charcoal/45">
                {selectedDayTasks.length
                  ? `${selectedDayTasks.length} compromisso${selectedDayTasks.length > 1 ? "s" : ""}`
                  : "Nenhum compromisso neste dia"}
              </p>
            </div>
            <button type="button" className="btn-primary h-10 px-3 text-sm" onClick={openCreate}>
              Novo
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {selectedDayTasks.length === 0 ? (
              <p className="rounded-xl bg-beige/60 px-4 py-6 text-sm text-charcoal/50">
                Nenhum compromisso neste dia. Clique em Novo para marcar um horário.
              </p>
            ) : (
              selectedDayTasks.map((task) => {
                const status = taskStatus(task);
                return (
                  <button
                    key={task._id}
                    type="button"
                    onClick={() => setSelectedTaskId(task._id)}
                    className="w-full rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-left transition hover:border-tan/40 hover:bg-beige/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-charcoal">{task.title}</p>
                        <p className="mt-1 text-xs text-charcoal/45">
                          {formatTime(task.dueDate)}
                          {task.deal?.title ? ` · ${task.deal.title}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(status)}`}>
                        {TASK_STATUS_LABELS[status]}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={createOpen}
        title="Novo compromisso"
        description={selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        onClose={() => setCreateOpen(false)}
        footer={
          <button type="submit" form="new-appointment" className="btn-primary" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        }
      >
        <form id="new-appointment" onSubmit={(event) => void handleCreate(event)}>
          <FormField label="Título">
            <input
              className="input-search"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Reunião, call, visita..."
              required
            />
          </FormField>
          <FormField label="Horário">
            <input
              className="input-search"
              type="time"
              value={form.time}
              onChange={(event) => setForm({ ...form, time: event.target.value })}
              required
            />
          </FormField>
          <FormField label="Negociação" hint="Opcional. Vincule se o compromisso for de um lead.">
            <Select value={form.dealId} onChange={(dealId) => setForm({ ...form, dealId })} options={dealOptions} />
          </FormField>
          <FormField label="Descrição">
            <textarea
              className="input-search min-h-[90px]"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Pauta, local, observações..."
            />
          </FormField>
          {createError ? <p className="text-sm text-burgundy">{createError}</p> : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedTask)}
        title={selectedTask?.title || "Compromisso"}
        description={selectedTask ? formatDateTime(selectedTask.dueDate) : undefined}
        onClose={() => setSelectedTaskId(null)}
        footer={
          selectedTask?.dealId && selectedTask.deal?.funnelId ? (
            <Link href={dealHref(selectedTask)} className="btn-secondary">
              Abrir negociação
            </Link>
          ) : null
        }
      >
        {selectedTask ? (
          <div className="space-y-5">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-charcoal/45">Quando</dt>
                <dd className="mt-1 text-sm text-charcoal">
                  {formatDate(selectedTask.dueDate)} às {formatTime(selectedTask.dueDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-charcoal/45">Negociação</dt>
                <dd className="mt-1 text-sm text-charcoal">{selectedTask.deal?.title || "Sem negociação vinculada"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-charcoal/45">Descrição</dt>
                <dd className="mt-1 text-sm leading-6 text-charcoal">
                  {selectedTask.description?.trim() || "Sem descrição."}
                </dd>
              </div>
              {selectedTask.googleEventId ? (
                <p className="rounded-lg bg-sage/10 px-3 py-2 text-xs text-sage">Sincronizado com o Google Agenda.</p>
              ) : null}
            </dl>

            <div>
              <p className="mb-2 text-xs font-medium text-charcoal/45">Status</p>
              <div className="grid grid-cols-3 gap-2">
                {TASK_STATUSES.map((status) => {
                  const active = taskStatus(selectedTask) === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handleStatusChange(selectedTask._id, status)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        active ? "bg-ink text-white" : "bg-beige text-charcoal/70 hover:bg-tan/10 hover:text-charcoal"
                      }`}
                    >
                      {TASK_STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
