import { useMemo, useState } from "react";
import Head from "next/head";
import TaskChecklist from "@/components/tasks/TaskChecklist";
import OwnerFilter from "@/components/tools/OwnerFilter";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import type { Task } from "@/types";
import { todayISO } from "@/utils/format";

type Filter = "pending" | "today" | "overdue" | "done" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "today", label: "Para hoje" },
  { value: "overdue", label: "Atrasadas" },
  { value: "done", label: "Concluídas" },
  { value: "all", label: "Todas" },
];

function applyFilter(tasks: Task[], filter: Filter, today: string) {
  switch (filter) {
    case "pending":
      return tasks.filter((task) => !task.done);
    case "today":
      return tasks.filter((task) => !task.done && task.dueDate === today);
    case "overdue":
      return tasks.filter((task) => !task.done && task.dueDate && task.dueDate < today);
    case "done":
      return tasks.filter((task) => task.done);
    default:
      return tasks;
  }
}

export default function TasksPage() {
  const { isAdmin } = useAuth();
  const [ownerId, setOwnerId] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const { data, isLoading, error, setData } = useAsyncData(() => resources.tasks.list({ ownerId }), [ownerId]);
  const today = todayISO();
  const tasks = useMemo(() => data || [], [data]);
  const visible = useMemo(() => applyFilter(tasks, filter, today), [tasks, filter, today]);

  // O checklist devolve a lista visível alterada; mescla de volta na lista completa.
  function handleChange(next: Task[]) {
    setData((current) => {
      const all = current || [];
      const byId = new Map(next.map((task) => [task._id, task]));
      const kept = all.filter((task) => !visible.some((item) => item._id === task._id) || byId.has(task._id));
      const merged = kept.map((task) => byId.get(task._id) || task);
      const added = next.filter((task) => !all.some((item) => item._id === task._id));
      return [...merged, ...added];
    });
  }

  return (
    <>
      <Head>
        <title>Atividades | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Visão geral"
        title="Atividades"
        description="Checklist do que precisa ser feito. Atividades criadas dentro de uma negociação também aparecem aqui."
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="inline-flex min-w-max gap-1 rounded-xl bg-beige p-1">
            {FILTERS.map((item) => {
              const count = applyFilter(tasks, item.value, today).length;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    filter === item.value ? "bg-white text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 text-xs text-charcoal/40">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <OwnerFilter value={ownerId} onChange={setOwnerId} />
      </div>
      <section className="card p-5 sm:p-6">
        {error ? <p className="mb-3 text-sm text-burgundy">{error}</p> : null}
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </div>
        ) : (
          <TaskChecklist tasks={visible} onChange={handleChange} showLead showOwner={isAdmin} />
        )}
      </section>
    </>
  );
}
