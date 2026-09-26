import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { PAGE_BG } from "@/components/proposals/ProposalPreview";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { apiError } from "@/lib/errors";
import { normalize, type ProposalData } from "@/lib/proposals/model";
import { renderProposalHtml } from "@/lib/proposals/render";
import { trackProposalView } from "@/lib/proposals/tracking";
import { resources } from "@/lib/resources";

/** Quem está logado no Noma (o próprio vendedor conferindo o link) não entra nas visualizações. */
function isTeamMember() {
  try {
    return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
  } catch {
    return false;
  }
}

/** Página pública (sem login) com a proposta enviada ao cliente — o mesmo HTML do arquivo exportado. */
export default function PublicProposalPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const [data, setData] = useState<ProposalData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [preview, setPreview] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!token) return;
    resources.publicProposals
      .get(token)
      .then((doc) => setData(normalize(doc.data as Partial<ProposalData>)))
      .catch((err) => setLoadError(apiError(err, "Este link de proposta não está mais disponível.")));
  }, [token]);

  useEffect(() => {
    if (!token || !data) return;
    if (isTeamMember()) {
      setPreview(true);
      return;
    }
    return trackProposalView(token);
  }, [token, data]);

  const html = useMemo(() => (data ? renderProposalHtml(data) : ""), [data]);
  const clientName = data ? data.client.company.trim() || data.client.name.trim() : "";
  const title = data ? `${data.client.title.trim() || "Proposta"}${clientName ? ` — ${clientName}` : ""}` : "Proposta";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      {data ? (
        <div className="fixed inset-0" style={{ background: PAGE_BG[data.identity.template] }}>
          <iframe
            ref={frameRef}
            title={title}
            srcDoc={html}
            // Foco no iframe para as setas do teclado passarem os slides.
            onLoad={() => frameRef.current?.focus()}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
            allow="autoplay; fullscreen"
            className="h-full w-full border-0"
          />
          {preview ? (
            <div className="pointer-events-none fixed inset-x-0 top-3 flex justify-center px-4">
              <p className="pointer-events-auto flex items-center gap-3 rounded-full border border-charcoal/10 bg-surface/95 px-4 py-2 text-xs text-charcoal/70 shadow-lg backdrop-blur">
                Você está logado no Noma: esta abertura não conta nas visualizações.
                <button type="button" className="font-semibold text-tan" onClick={() => setPreview(false)}>
                  Ok
                </button>
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-screen items-center justify-center bg-beige px-4 py-12">
          <div className="card w-full max-w-md p-7 text-center sm:p-8">
            {loadError ? (
              <>
                <h1 className="text-xl font-semibold text-charcoal">Proposta indisponível</h1>
                <p className="mt-2 text-sm text-charcoal/55">{loadError}</p>
                <p className="mt-1 text-sm text-charcoal/55">Peça um novo link a quem enviou a proposta.</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-tan/20 border-t-tan" />
                <p className="text-sm text-charcoal/55">Carregando proposta…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
