import Link from "next/link";
import { useState } from "react";
import { HiOutlineCheck, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Task } from "@/types";
import { formatDateOnly, todayISO } from "@/utils/format";
import { confirmDialog } from "@/components/ui/DialogHost";
import OptionSelect from "@/components/options/OptionSelect";
import { TaskTypeBadge } from "./TaskType";

interface TaskChecklistProps {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
  /** Vincula as atividades novas a esta negociação. */
  leadId?: string;
  /** Mostra o nome da negociação em cada item. */
  showLead?: boolean;
  showOwner?: boolean;
  /** Esconde o campo de nova atividade (prévia do início). */
  readOnly?: boolean;
  emptyText?: string;
  /** id do campo de nova atividade (para focar a partir de outro botão). */
  addInputId?: string;
}

function dueTone(task: Task, today: string) {
  if (task.done || !task.dueDate) return "text-charcoal/45";
  if (task.dueDate < today) return "font-semibold text-burgundy";
  if (task.dueDate === today) return "font-semibold text-gold";
  return "text-charcoal/50";
}

/** Checklist de atividades: marcar como feita, criar e excluir. */
export default function TaskChecklist({ tasks, onChange, leadId, showLead, showOwner, readOnly, emptyText, addInputId }: TaskChecklistProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ id: string; title: string; dueDate: string } | null>(null);
  const today = todayISO();

  async function run(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar a atividade."));
    }
  }

  function toggle(task: Task) {
    onChange(tasks.map((item) => (item._id === task._id ? { ...item, done: !task.done } : item)));
    void run(async () => {
      const saved = await resources.tasks.update(task._id, { done: !task.done });
      onChange(tasks.map((item) => (item._id === task._id ? { ...item, ...saved, ownerName: item.ownerName } : item)));
    });
  }

  function add() {
    if (!title.trim()) return;
    void run(async () => {
      const saved = await resources.tasks.create({ title: title.trim(), type, dueDate, leadId });
      onChange([...tasks, saved]);
      setTitle("");
      setDueDate("");
    });
  }

  /** Renomeia a atividade (e ajusta o prazo) sem sair da lista. */
  function saveEdit() {
    if (!editing || !editing.title.trim()) return;
    const { id, title: nextTitle, dueDate: nextDate } = editing;
    onChange(tasks.map((item) => (item._id === id ? { ...item, title: nextTitle.trim(), dueDate: nextDate } : item)));
    setEditing(null);
    void run(async () => {
      const saved = await resources.tasks.update(id, { title: nextTitle.trim(), dueDate: nextDate });
      onChange(tasks.map((item) => (item._id === id ? { ...item, ...saved, ownerName: item.ownerName } : item)));
    });
  }

  async function remove(task: Task) {
    if (!(await confirmDialog({ title: `Excluir a atividade "${task.title}"?`, confirmLabel: "Excluir", danger: true }))) return;
    void run(async () => {
      await resources.tasks.remove(task._id);
      onChange(tasks.filter((item) => item._id !== task._id));
    });
  }

  return (
    <div>
      {!readOnly ? (
        <form
          className="mb-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_160px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <OptionSelect list="taskType" value={type} onChange={setType} emptyLabel="Tipo" />
          <input id={addInputId} className="input-search" value={title} placeholder="Nova atividade" onChange={(e) => setTitle(e.target.value)} />
          <input className="input-search" type="date" value={dueDate} aria-label="Prazo" onChange={(e) => setDueDate(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={!title.trim()}>
            Adicionar
          </button>
        </form>
      ) : null}
      {error ? <p className="mb-2 text-sm text-burgundy">{error}</p> : null}
      {tasks.length === 0 ? (
        <p className="text-sm text-charcoal/50">{emptyText || "Nenhuma atividade por aqui."}</p>
      ) : (
        <ul className="divide-y divide-charcoal/[0.06]">
          {tasks.map((task) => (
            <li key={task._id} className="group flex items-start gap-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[hsl(120,44%,53%)]"
                checked={task.done}
                aria-label={`Concluir ${task.title}`}
                onChange={() => toggle(task)}
              />
              {editing?.id === task._id ? (
                <form
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveEdit();
                  }}
                >
                  <input
                    className="input-search !py-1.5 min-w-[160px] flex-1"
                    value={editing.title}
                    autoFocus
                    aria-label="Nome da atividade"
                    onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                    onKeyDown={(event) => event.key === "Escape" && setEditing(null)}
                  />
                  <input
                    className="input-search !w-auto !py-1.5"
                    type="date"
                    value={editing.dueDate}
                    aria-label="Prazo"
                    onChange={(event) => setEditing({ ...editing, dueDate: event.target.value })}
                  />
                  <button type="submit" className="btn-ghost h-8 w-8 text-sage" aria-label="Salvar" disabled={!editing.title.trim()}>
                    <HiOutlineCheck className="h-4 w-4" />
                  </button>
                  <button type="button" className="btn-ghost h-8 w-8" aria-label="Cancelar" onClick={() => setEditing(null)}>
                    <HiOutlineXMark className="h-4 w-4" />
                  </button>
                </form>
              ) : (
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${task.done ? "text-charcoal/40 line-through" : "text-charcoal"} ${readOnly ? "" : "cursor-text"}`}
                  onDoubleClick={() => !readOnly && setEditing({ id: task._id, title: task.title, dueDate: task.dueDate })}
                  title={readOnly ? undefined : "Clique duas vezes para renomear"}
                >
                  {task.title}
                </p>
                <p className="flex flex-wrap gap-x-3 text-xs">
                  <TaskTypeBadge type={task.type} />
                  {task.dueDate ? <span className={dueTone(task, today)}>{task.dueDate < today && !task.done ? "Atrasada · " : ""}{formatDateOnly(task.dueDate)}</span> : null}
                  {showLead && task.leadId ? (
                    <Link href={`/crm/${task.leadId}`} className="text-tan hover:underline">
                      {task.leadName || "Negociação"}
                    </Link>
                  ) : null}
                  {showOwner && task.ownerName ? <span className="text-charcoal/45">{task.ownerName}</span> : null}
                </p>
              </div>
              )}
              {!readOnly && editing?.id !== task._id ? (
                <button
                  type="button"
                  className="btn-ghost h-8 w-8 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                  aria-label="Renomear atividade"
                  onClick={() => setEditing({ id: task._id, title: task.title, dueDate: task.dueDate })}
                >
                  <HiOutlinePencilSquare className="h-4 w-4" />
                </button>
              ) : null}
              {!readOnly && editing?.id !== task._id ? (
                <button
                  type="button"
                  className="btn-ghost h-8 w-8 opacity-0 transition group-hover:opacity-100 hover:text-burgundy focus:opacity-100"
                  aria-label="Excluir atividade"
                  onClick={() => remove(task)}
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
