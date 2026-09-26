import { useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import BudgetForm from "@/components/budget/BudgetForm";
import BudgetResultPanel from "@/components/budget/BudgetResultPanel";
import OwnerFilter from "@/components/tools/OwnerFilter";
import SavedDocuments from "@/components/tools/SavedDocuments";
import SaveStatus from "@/components/tools/SaveStatus";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToolDocument } from "@/hooks/useToolDocument";
import { budgetsApi } from "@/lib/budget/api";
import { calculateBudget } from "@/lib/budget/calc";
import { defaultData, normalize, titleOf, type BudgetData } from "@/lib/budget/model";
import { confirmDialog } from "@/components/ui/DialogHost";

const api = budgetsApi;
const DESCRIPTION = "Some custos, horas de trabalho e margem para chegar a um preço seguro — e saiba quanto vale sua hora.";

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
}

export default function BudgetPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;

  return (
    <>
      <Head>
        <title>Calculadora de Orçamento | Noma</title>
      </Head>
      {!router.isReady ? null : id ? <BudgetEditor key={id} id={id} /> : <BudgetList />}
    </>
  );
}

function BudgetList() {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const { data, isLoading, error: loadError, reload } = useAsyncData(() => api.list({ ownerId }), [ownerId]);

  async function handleCreate() {
    setIsCreating(true);
    setError("");
    try {
      const initial = defaultData();
      const doc = await api.create({ title: titleOf(initial), data: initial });
      await router.push({ pathname: router.pathname, query: { id: doc._id } });
    } catch (err) {
      setError(apiError(err, "Não foi possível criar o orçamento."));
      setIsCreating(false);
    }
  }

  async function handleDuplicate(docId: string) {
    setError("");
    try {
      await api.duplicate(docId);
      await reload();
    } catch (err) {
      setError(apiError(err, "Não foi possível duplicar o orçamento."));
    }
  }

  async function handleDelete(docId: string) {
    if (!(await confirmDialog({ title: "Excluir este orçamento?", message: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
    setError("");
    try {
      await api.remove(docId);
      await reload();
    } catch (err) {
      setError(apiError(err, "Não foi possível excluir o orçamento."));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Ferramenta de precificação"
        title="Calculadora de Orçamento"
        description={DESCRIPTION}
        actions={
          <button type="button" className="btn-primary" onClick={() => void handleCreate()} disabled={isCreating}>
            {isCreating ? "Criando…" : "Criar novo orçamento"}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-charcoal/55">
          Cada orçamento fica salvo automaticamente enquanto você edita.
        </p>
        <OwnerFilter value={ownerId} onChange={setOwnerId} />
      </div>

      {error || loadError ? (
        <p className="mb-4 rounded-lg bg-burgundy/10 px-4 py-3 text-sm text-burgundy">{error || loadError}</p>
      ) : null}

      <SavedDocuments
        title="Orçamentos salvos"
        documents={data}
        isLoading={isLoading}
        emptyMessage="Você ainda não tem orçamentos. Clique em “Criar novo orçamento” para começar com valores de exemplo."
        onOpen={(docId) => void router.push({ pathname: router.pathname, query: { id: docId } })}
        onDuplicate={(docId) => void handleDuplicate(docId)}
        onDelete={(docId) => void handleDelete(docId)}
      />
    </div>
  );
}

function BudgetEditor({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [actionError, setActionError] = useState("");
  const { data, setData, isLoading, error, saveState, ownerName, flush } = useToolDocument<BudgetData>({
    api,
    id,
    normalize,
    titleOf,
  });

  const result = useMemo(() => (data ? calculateBudget(data) : null), [data]);

  function update(changes: Partial<BudgetData>) {
    setData((current) => ({ ...current, ...changes }));
  }

  async function goBack() {
    await flush();
    await router.push(router.pathname);
  }

  async function handleDuplicate() {
    setActionError("");
    try {
      await flush();
      const copy = await api.duplicate(id);
      await router.push({ pathname: router.pathname, query: { id: copy._id } });
    } catch (err) {
      setActionError(apiError(err, "Não foi possível duplicar o orçamento."));
    }
  }

  async function handleDelete() {
    if (!(await confirmDialog({ title: "Excluir este orçamento?", message: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
    setActionError("");
    try {
      await api.remove(id);
      await router.push(router.pathname);
    } catch (err) {
      setActionError(apiError(err, "Não foi possível excluir o orçamento."));
    }
  }

  async function sendToProposal() {
    if (!result) return;
    await flush();
    await router.push("/propostas?valor=" + result.suggestedPrice.toFixed(2));
  }

  const isOtherOwner = Boolean(ownerName && user?.name && ownerName !== user.name && user.role === "admin");

  return (
    <div>
      <PageHeader
        eyebrow="Ferramenta de precificação"
        title={data ? titleOf(data) : "Calculadora de Orçamento"}
        description={DESCRIPTION}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {data ? <SaveStatus state={saveState} /> : null}
            <button type="button" className="btn-secondary" onClick={() => void goBack()}>
              ← Meus orçamentos
            </button>
            <button type="button" className="btn-secondary" onClick={() => void handleDuplicate()} disabled={!data}>
              Duplicar
            </button>
            <button type="button" className="btn-secondary !text-burgundy" onClick={() => void handleDelete()}>
              Excluir
            </button>
          </div>
        }
      />

      {isOtherOwner ? (
        <p className="mb-4 inline-flex rounded-lg bg-gold/10 px-3 py-2 text-sm font-medium text-gold">
          Documento de {ownerName}
        </p>
      ) : null}

      {actionError ? (
        <p className="mb-4 rounded-lg bg-burgundy/10 px-4 py-3 text-sm text-burgundy">{actionError}</p>
      ) : null}

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <div className="skeleton h-40" />
            <div className="skeleton h-56" />
            <div className="skeleton h-56" />
          </div>
          <div className="skeleton h-96" />
        </div>
      ) : error || !data || !result ? (
        <div className="card p-6">
          <p className="text-sm text-burgundy">{error || "Orçamento não encontrado."}</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => void router.push(router.pathname)}>
            ← Voltar para meus orçamentos
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <BudgetForm data={data} result={result} onChange={update} />
          <aside className="self-start lg:sticky lg:top-20">
            <BudgetResultPanel
              result={result}
              marginPercent={data.marginPercent}
              operationalPercent={data.operationalPercent}
              onUseValue={() => void sendToProposal()}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
