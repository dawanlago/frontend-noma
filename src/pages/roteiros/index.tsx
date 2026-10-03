import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import ScriptEditor from "@/components/scripts/ScriptEditor";
import OwnerFilter from "@/components/tools/OwnerFilter";
import SavedDocuments from "@/components/tools/SavedDocuments";
import PageHeader from "@/components/ui/PageHeader";
import { alertDialog, confirmDialog } from "@/components/ui/DialogHost";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { scriptsApi } from "@/lib/scripts/api";
import { defaultData, titleOf } from "@/lib/scripts/model";

function ScriptList({ onOpen }: { onOpen: (id: string) => void }) {
  const [ownerId, setOwnerId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const { data, isLoading, error, reload } = useAsyncData(() => scriptsApi.list({ ownerId }), [ownerId]);

  async function handleCreate() {
    setIsCreating(true);
    setActionError("");
    try {
      const initial = defaultData();
      const doc = await scriptsApi.create({ title: titleOf(initial), data: initial });
      onOpen(doc._id);
    } catch (err) {
      setActionError(apiError(err, "Não foi possível criar o roteiro."));
      setIsCreating(false);
    }
  }

  async function handleDuplicate(id: string) {
    setActionError("");
    try {
      await scriptsApi.duplicate(id);
      await reload();
    } catch (err) {
      setActionError(apiError(err, "Não foi possível duplicar o roteiro."));
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog({ title: "Excluir este roteiro?", message: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
    setActionError("");
    try {
      await scriptsApi.remove(id);
      await reload();
    } catch (err) {
      setActionError(apiError(err, "Não foi possível excluir o roteiro."));
    }
  }

  return (
    <>
      <Head>
        <title>Roteiros | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Ferramenta de pré-produção"
        title="Roteiros"
        description="Cenas, falas e durações de cada vídeo — ligados ao briefing do projeto, prontos para imprimir ou copiar."
        actions={
          <button type="button" className="btn-primary" disabled={isCreating} onClick={() => void handleCreate()}>
            {isCreating ? "Criando…" : "Criar novo roteiro"}
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-charcoal/55">Os roteiros são salvos automaticamente. Para ligar a um briefing, crie pelo próprio briefing.</p>
        <OwnerFilter value={ownerId} onChange={setOwnerId} />
      </div>
      {error || actionError ? <p className="mb-4 text-sm text-burgundy">{actionError || error}</p> : null}
      <SavedDocuments
        title="Meus roteiros"
        documents={data}
        isLoading={isLoading}
        emptyMessage="Nenhum roteiro salvo ainda. Clique em “Criar novo roteiro” ou crie a partir de um briefing."
        onOpen={onOpen}
        onDuplicate={(id) => void handleDuplicate(id)}
        onDelete={(id) => void handleDelete(id)}
      />
    </>
  );
}

export default function ScriptsPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;

  if (!router.isReady) return null;

  const open = (docId: string) => void router.push({ pathname: router.pathname, query: { id: docId } });
  const back = () => void router.push(router.pathname);

  if (!id) return <ScriptList onOpen={open} />;

  return (
    <ScriptEditor
      key={id}
      id={id}
      onBack={back}
      onDuplicate={async () => {
        try {
          const copy = await scriptsApi.duplicate(id);
          open(copy._id);
        } catch (err) {
          void alertDialog({ title: "Não foi possível duplicar", message: apiError(err, "Tente de novo em instantes.") });
        }
      }}
      onDelete={async () => {
        if (!(await confirmDialog({ title: "Excluir este roteiro?", message: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
        try {
          await scriptsApi.remove(id);
          back();
        } catch (err) {
          void alertDialog({ title: "Não foi possível excluir", message: apiError(err, "Tente de novo em instantes.") });
        }
      }}
    />
  );
}
