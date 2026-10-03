import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { BriefingData } from "@/lib/briefing/model";
import { apiError } from "@/lib/errors";
import { scriptsApi } from "@/lib/scripts/api";
import { defaultData, titleOf } from "@/lib/scripts/model";

/** Roteiros vinculados a um briefing, com atalho para criar um novo já ligado a ele. */
export default function BriefingScripts({ briefingId, briefing }: { briefingId: string; briefing: BriefingData }) {
  const router = useRouter();
  const { data, isLoading } = useAsyncData(() => scriptsApi.list({ briefingId }), [briefingId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    try {
      const name = briefing.client.projectName.trim() || briefing.client.clientName.trim();
      const initial = {
        ...defaultData(),
        title: name ? `Roteiro — ${name}` : "",
        client: briefing.client.clientName,
        format: briefing.delivery.format,
        briefingId,
      };
      const doc = await scriptsApi.create({ title: titleOf(initial), data: initial });
      await router.push({ pathname: "/roteiros", query: { id: doc._id } });
    } catch (err) {
      setError(apiError(err, "Não foi possível criar o roteiro."));
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-charcoal">Roteiros deste briefing</p>
        <button type="button" className="text-xs font-semibold text-tan hover:underline" disabled={busy} onClick={() => void create()}>
          {busy ? "Criando…" : "+ Criar roteiro"}
        </button>
      </div>
      {isLoading ? (
        <div className="skeleton mt-3 h-10" />
      ) : data?.length ? (
        <ul className="mt-2 space-y-1">
          {data.map((doc) => (
            <li key={doc._id}>
              <Link href={`/roteiros?id=${doc._id}`} className="block truncate rounded-lg px-2 py-1.5 text-sm text-charcoal/75 hover:bg-beige hover:text-charcoal">
                {doc.title || "Sem título"}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-charcoal/50">Nenhum roteiro ainda.</p>
      )}
      {error ? <p className="mt-2 text-xs text-burgundy">{error}</p> : null}
    </section>
  );
}
