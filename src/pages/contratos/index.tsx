import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import ContractEditor from "@/components/contracts/ContractEditor";
import OwnerFilter from "@/components/tools/OwnerFilter";
import SavedDocuments from "@/components/tools/SavedDocuments";
import PageHeader from "@/components/ui/PageHeader";
import { useAsyncData } from "@/hooks/useAsyncData";
import { contractsApi } from "@/lib/contracts/api";
import { defaultData, titleOf } from "@/lib/contracts/model";

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
}

function ContractList({ onOpen }: { onOpen: (id: string) => void }) {
  const [ownerId, setOwnerId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const { data, isLoading, error, reload } = useAsyncData(() => contractsApi.list({ ownerId }), [ownerId]);

  async function handleCreate() {
    setIsCreating(true);
    setActionError("");
    try {
      const initial = defaultData();
      const doc = await contractsApi.create({ title: titleOf(initial), data: initial });
      onOpen(doc._id);
    } catch (err) {
      setActionError(apiError(err, "Não foi possível criar o contrato."));
      setIsCreating(false);
    }
  }

  async function handleDuplicate(id: string) {
    setActionError("");
    try {
      await contractsApi.duplicate(id);
      await reload();
    } catch (err) {
      setActionError(apiError(err, "Não foi possível duplicar o contrato."));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir este contrato? Esta ação não pode ser desfeita.")) return;
    setActionError("");
    try {
      await contractsApi.remove(id);
      await reload();
    } catch (err) {
      setActionError(apiError(err, "Não foi possível excluir o contrato."));
    }
  }

  return (
    <>
      <Head>
        <title>Gerador de Contratos | Noma CRM</title>
      </Head>
      <PageHeader
        eyebrow="Ferramenta operacional"
        title="Gerador de Contratos"
        description="Contratos de projeto fechado, recorrentes, de serviço tomado e de uso de imagem, com cláusulas que você liga e desliga."
        actions={
          <button type="button" className="btn-primary" disabled={isCreating} onClick={() => void handleCreate()}>
            {isCreating ? "Criando…" : "Criar novo contrato"}
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-charcoal/55">Os contratos são salvos automaticamente enquanto você edita.</p>
        <OwnerFilter value={ownerId} onChange={setOwnerId} />
      </div>
      {error || actionError ? <p className="mb-4 text-sm text-burgundy">{actionError || error}</p> : null}
      <SavedDocuments
        title="Meus contratos"
        documents={data}
        isLoading={isLoading}
        emptyMessage="Nenhum contrato salvo ainda. Clique em “Criar novo contrato” para começar."
        onOpen={onOpen}
        onDuplicate={(id) => void handleDuplicate(id)}
        onDelete={(id) => void handleDelete(id)}
      />
    </>
  );
}

export default function ContractsPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;

  if (!router.isReady) return null;

  const open = (docId: string) => void router.push({ pathname: router.pathname, query: { id: docId } });
  const back = () => void router.push(router.pathname);

  if (!id) return <ContractList onOpen={open} />;

  return (
    <ContractEditor
      key={id}
      id={id}
      onBack={back}
      onDuplicate={async () => {
        try {
          const copy = await contractsApi.duplicate(id);
          open(copy._id);
        } catch (err) {
          window.alert(apiError(err, "Não foi possível duplicar o contrato."));
        }
      }}
      onDelete={async () => {
        if (!window.confirm("Excluir este contrato? Esta ação não pode ser desfeita.")) return;
        try {
          await contractsApi.remove(id);
          back();
        } catch (err) {
          window.alert(apiError(err, "Não foi possível excluir o contrato."));
        }
      }}
    />
  );
}
