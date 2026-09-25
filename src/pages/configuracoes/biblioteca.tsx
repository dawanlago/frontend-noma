import Head from "next/head";
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/auth/RequireAdmin";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import type { LibraryCategory } from "@/types";

function CategoryRow({ category, onSaved }: { category: LibraryCategory; onSaved: () => void }) {
  const [form, setForm] = useState({ title: category.title, description: category.description, url: category.url });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty =
    form.title !== category.title || form.description !== category.description || form.url !== category.url;

  async function save() {
    setState("saving");
    try {
      await resources.library.update(category._id, form);
      setState("saved");
      onSaved();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="card grid gap-3 p-5 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-end">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold">Categoria</span>
        <input className="input-search" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold">Descrição</span>
        <input className="input-search" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold">Link (Google Drive, Dropbox...)</span>
        <input
          className="input-search"
          type="url"
          placeholder="https://"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
        />
      </label>
      <button type="button" className="btn-primary" disabled={!dirty || state === "saving"} onClick={() => void save()}>
        {state === "saving" ? "Salvando..." : state === "saved" && !dirty ? "Salvo" : "Salvar"}
      </button>
      {state === "error" ? <p className="text-sm text-burgundy md:col-span-4">Não foi possível salvar.</p> : null}
    </div>
  );
}

export default function LibrarySettingsPage() {
  const { data: categories, reload } = useAsyncData(() => resources.library.list());

  return (
    <RequireAdmin>
      <Head>
        <title>Biblioteca | Configurações | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Configurações"
        title="Biblioteca audiovisual"
        description="Cada categoria abre o link configurado aqui. Deixe em branco para mostrar como “em preparação”."
      />
      <div className="space-y-3">
        {(categories || []).map((category) => (
          <CategoryRow key={category._id} category={category} onSaved={() => void reload()} />
        ))}
      </div>
    </RequireAdmin>
  );
}
