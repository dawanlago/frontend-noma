import { useMemo, useState } from "react";
import CopyButton from "@/components/tools/CopyButton";
import Modal from "@/components/ui/Modal";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useBrandLogo } from "@/hooks/useBrandLogo";
import { SCRIPT_LAYOUTS, scriptDocument, scriptToText, type ScriptLayout } from "@/lib/scripts/format";
import { titleOf, type ScriptData } from "@/lib/scripts/model";
import { downloadFile, printHtml, slugify } from "@/utils/document";

const PREFS_KEY = "noma:roteiro-export";

function loadPrefs(): { layout: ScriptLayout; includeNotes: boolean; includeApproval: boolean } {
  const fallback = { layout: "table" as ScriptLayout, includeNotes: true, includeApproval: false };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

interface ExportScriptModalProps {
  open: boolean;
  data: ScriptData;
  briefingTitle: string;
  onClose: () => void;
}

/** Exportar roteiro: escolhe o formato, vê a prévia e imprime/salva em PDF, baixa em Word ou copia o texto. */
export default function ExportScriptModal({ open, data, briefingTitle, onClose }: ExportScriptModalProps) {
  const settings = useWorkspace().settings;
  const logo = useBrandLogo();
  const [prefs, setPrefs] = useState(loadPrefs);

  function update(change: Partial<typeof prefs>) {
    setPrefs((current) => {
      const next = { ...current, ...change };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // Sem armazenamento local: só não lembra a escolha.
      }
      return next;
    });
  }

  const html = useMemo(
    () =>
      scriptDocument(data, {
        layout: prefs.layout,
        briefingTitle,
        includeNotes: prefs.includeNotes,
        includeApproval: prefs.includeApproval,
        brand: { name: settings?.companyName || "", logo, color: settings?.brand?.defaultColor },
      }),
    [data, briefingTitle, prefs, settings, logo],
  );
  const fileBase = `roteiro-${slugify(titleOf(data), "roteiro")}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Exportar roteiro"
      description="Escolha o formato, confira a prévia e gere o PDF ou o arquivo do Word."
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <CopyButton text={() => scriptToText(data, briefingTitle, true)} label="Copiar para WhatsApp" className="btn-secondary" />
          <CopyButton text={() => scriptToText(data, briefingTitle)} label="Copiar texto" className="btn-secondary" />
          <button type="button" className="btn-secondary" onClick={() => downloadFile(`${fileBase}.doc`, html, "application/msword;charset=utf-8")}>
            Baixar Word (.doc)
          </button>
          <button type="button" className="btn-primary" onClick={() => printHtml(html)}>
            Imprimir / salvar PDF
          </button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Formato" className="grid gap-2">
            {SCRIPT_LAYOUTS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={prefs.layout === item.value}
                onClick={() => update({ layout: item.value })}
                className={`rounded-xl border p-3 text-left transition ${
                  prefs.layout === item.value ? "border-tan bg-tan/[0.06]" : "border-charcoal/10 hover:border-charcoal/25"
                }`}
              >
                <span className="block text-sm font-semibold text-charcoal">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-charcoal/55">{item.description}</span>
              </button>
            ))}
          </div>
          {prefs.layout !== "teleprompter" ? (
            <div className="space-y-2 text-sm text-charcoal/75">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(210,98%,48%)]"
                  checked={prefs.includeNotes}
                  onChange={(event) => update({ includeNotes: event.target.checked })}
                />
                Incluir observações
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(210,98%,48%)]"
                  checked={prefs.includeApproval}
                  onChange={(event) => update({ includeApproval: event.target.checked })}
                />
                Campo de aprovação do cliente
              </label>
            </div>
          ) : null}
          <p className="text-xs leading-5 text-charcoal/50">
            O logo e a cor vêm de Configurações → Geral. A minutagem soma as durações escritas como “15s”, “0:15” ou “1min”.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-charcoal/10 bg-white">
          <iframe title="Prévia do roteiro" srcDoc={html} className="h-[60vh] min-h-[360px] w-full border-0" sandbox="" />
        </div>
      </div>
    </Modal>
  );
}
