import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { HiOutlinePlus } from "react-icons/hi2";
import TaskChecklist from "@/components/tasks/TaskChecklist";
import OwnerFilter, { useOwnerName } from "@/components/tools/OwnerFilter";
import FilterBar from "@/components/ui/FilterBar";
import ListHeader from "@/components/ui/ListHeader";
import Select from "@/components/ui/Select";
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
  const ownerName = useOwnerName(ownerId);
  const router = useRouter();

  function focusNew() {
    const input = document.getElementById("nova-atividade");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus();
  }

  // Botão "Criar" do topo: /atividades?novo=1 foca o campo de nova atividade.
  useEffect(() => {
    if (!router.isReady || router.query.novo !== "1" || isLoading) return;
    focusNew();
    void router.replace({ pathname: router.pathname }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.novo, isLoading]);

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
      <ListHeader
        title="Atividades"
        description="O que precisa ser feito. Atividades criadas dentro de uma negociação também aparecem aqui."
        actions={
          <button type="button" className="btn-primary" onClick={focusNew}>
            <HiOutlinePlus className="h-4 w-4" /> Criar atividade
          </button>
        }
      />
      <FilterBar
        count={`${visible.length} atividade${visible.length === 1 ? "" : "s"}`}
        chips={ownerId ? [{ key: "owner", label: ownerName || "Usuário", onRemove: () => setOwnerId("") }] : []}
      >
        <Select
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
          options={FILTERS.map((item) => ({ value: item.value, label: `${item.label} (${applyFilter(tasks, item.value, today).length})` }))}
        />
        {isAdmin ? <OwnerFilter value={ownerId} onChange={setOwnerId} /> : null}
      </FilterBar>
      <section className="card p-5 sm:p-6">
        {error ? <p className="mb-3 text-sm text-burgundy">{error}</p> : null}
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </div>
        ) : (
          <TaskChecklist tasks={visible} onChange={handleChange} showLead showOwner={isAdmin} addInputId="nova-atividade" />
        )}
      </section>
    </>
  );
}
