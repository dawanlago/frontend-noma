import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import CopyButton from "@/components/tools/CopyButton";
import OwnerFilter from "@/components/tools/OwnerFilter";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { publicFormUrl } from "@/lib/forms";
import { resources } from "@/lib/resources";
import { formatDate } from "@/utils/format";

export default function FormsPage() {
  const { isAdmin } = useAuth();
  const [ownerId, setOwnerId] = useState("");
  const { data, isLoading } = useAsyncData(() => resources.forms.list({ ownerId }), [ownerId]);

  return (
    <>
      <Head>
        <title>Formulários | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Comercial"
        title="Formulários"
        description="Crie formulários personalizados. Envie pela negociação (link com código de 6 dígitos, respostas ficam na negociação) ou compartilhe o link público, em que cada resposta vira contato e negociação."
        actions={
          <Link href="/formularios/novo" className="btn-primary">
            Novo formulário
          </Link>
        }
      />
      <div className="mb-4 flex justify-end">
        <OwnerFilter value={ownerId} onChange={setOwnerId} />
      </div>
      {isLoading ? (
        <div className="skeleton h-40" />
      ) : !data?.length ? (
        <div className="card-muted px-6 py-12 text-center">
          <p className="font-semibold text-charcoal">Nenhum formulário ainda</p>
          <p className="mt-1 text-sm text-charcoal/55">Crie um formulário de contato, pré-briefing ou pesquisa e compartilhe o link.</p>
        </div>
      ) : (
        <div className="noma-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((form) => (
            <article key={form._id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/formularios/${form._id}`} className="min-w-0 font-semibold text-charcoal hover:text-tan">
                  <span className="block truncate">{form.name}</span>
                </Link>
                <span className={`chip ${form.isActive ? "bg-sage/15 text-sage" : "bg-charcoal/[0.06] text-charcoal/50"}`}>
                  {form.isActive ? "Ativo" : "Pausado"}
                </span>
              </div>
              <p className="mt-1 text-xs text-charcoal/50">
                {form.fields.length} campos · {form.responsesCount || 0} respostas · criado em {formatDate(form.createdAt)}
                {isAdmin && form.ownerName ? ` · ${form.ownerName}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-charcoal/[0.06] pt-4">
                <Link href={`/formularios/${form._id}`} className="btn-secondary !py-1.5">
                  Editar
                </Link>
                <Link href={`/formularios/${form._id}?aba=respostas`} className="btn-secondary !py-1.5">
                  Respostas
                </Link>
                <CopyButton text={() => publicFormUrl(form.publicId)} label="Copiar link" className="btn-primary !py-1.5" />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
