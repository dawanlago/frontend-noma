import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import BriefingEditor from "@/components/briefing/BriefingEditor";
import OwnerFilter from "@/components/tools/OwnerFilter";
import SavedDocuments from "@/components/tools/SavedDocuments";
import PageHeader from "@/components/ui/PageHeader";
import { useAsyncData } from "@/hooks/useAsyncData";
import { briefingsApi } from "@/lib/briefing/api";
import { defaultData, titleOf } from "@/lib/briefing/model";

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
}

function BriefingList({ onOpen }: { onOpen: (id: string) => void }) {
  const [ownerId, setOwnerId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const { data, isLoading, error, reload } = useAsyncData(() => briefingsApi.list({ ownerId }), [ownerId]);

  async function handleCreate() {
    setIsCreating(true);
    setActionError("");
    try {
      const initial = defaultData();
      const doc = await briefingsApi.create({ title: titleOf(initial), data: initial });
      onOpen(doc._id);
    } catch (err) {
      setActionError(apiError(err, "Não foi possível criar o briefing."));
      setIsCreating(false);
    }
  }

  async function handleDuplicate(id: string) {
    setActionError("");
    try {
      await briefingsApi.duplicate(id);
      await reload();
    } catch (err) {
      setActionError(apiError(err, "Não foi possível duplicar o briefing."));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir este briefing? Esta ação não pode ser desfeita.")) return;
    setActionError("");
    try {
      await briefingsApi.remove(id);
      await reload();
    } catch (err) {
      setActionError(apiError(err, "Não foi possível excluir o briefing."));
    }
  }

  return (
    <>
      <Head>
        <title>Gerador de Briefing | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Ferramenta de pré-produção"
        title="Gerador de Briefing"
        description="Uso interno: preencha durante ou depois da reunião com o cliente e transforme a conversa num briefing claro para a produção."
        actions={
          <button type="button" className="btn-primary" disabled={isCreating} onClick={() => void handleCreate()}>
            {isCreating ? "Criando…" : "Criar novo briefing"}
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-charcoal/55">Os briefings são salvos automaticamente enquanto você edita.</p>
        <OwnerFilter value={ownerId} onChange={setOwnerId} />
      </div>
      {error || actionError ? <p className="mb-4 text-sm text-burgundy">{actionError || error}</p> : null}
      <SavedDocuments
        title="Meus briefings"
        documents={data}
        isLoading={isLoading}
        emptyMessage="Nenhum briefing salvo ainda. Clique em “Criar novo briefing” para começar."
        onOpen={onOpen}
        onDuplicate={(id) => void handleDuplicate(id)}
        onDelete={(id) => void handleDelete(id)}
      />
    </>
  );
}

export default function BriefingPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;

  if (!router.isReady) return null;

  const open = (docId: string) => void router.push({ pathname: router.pathname, query: { id: docId } });
  const back = () => void router.push(router.pathname);

  if (!id) return <BriefingList onOpen={open} />;

  return (
    <BriefingEditor
      key={id}
      id={id}
      onBack={back}
      onDuplicate={async () => {
        try {
          const copy = await briefingsApi.duplicate(id);
          open(copy._id);
        } catch (err) {
          window.alert(apiError(err, "Não foi possível duplicar o briefing."));
        }
      }}
      onDelete={async () => {
        if (!window.confirm("Excluir este briefing? Esta ação não pode ser desfeita.")) return;
        try {
          await briefingsApi.remove(id);
          back();
        } catch (err) {
          window.alert(apiError(err, "Não foi possível excluir o briefing."));
        }
      }}
    />
  );
}
