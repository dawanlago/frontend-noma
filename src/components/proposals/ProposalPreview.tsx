import { useEffect, useMemo, useRef, useState } from "react";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { TEMPLATE_NAMES, type ProposalData } from "@/lib/proposals/model";
import { PAGE_LABELS, type ProposalPage } from "@/lib/proposals/pages";
import { renderProposalHtml } from "@/lib/proposals/render";

interface ProposalPreviewProps {
  data: ProposalData;
  pages: ProposalPage[];
  slide: number;
  onSlideChange: (index: number) => void;
  onOpenFull: () => void;
}

const PAGE_BG: Record<ProposalData["identity"]["template"], string> = {
  dark: "#0A0A0B",
  light: "#FBFAF8",
  editorial: "#F1EBE0",
  studio: "#ECEDEF",
  bold: "#FFFFFF",
};

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Prévia ao vivo: o mesmo HTML do download, dentro de um iframe 16:9. */
export default function ProposalPreview({ data, pages, slide, onSlideChange, onOpenFull }: ProposalPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const onChangeRef = useRef(onSlideChange);
  onChangeRef.current = onSlideChange;
  const debounced = useDebounced(data, 350);
  const total = pages.length;

  // O HTML só é refeito quando o conteúdo muda; trocar de slide usa postMessage.
  const html = useMemo(() => renderProposalHtml(debounced, { embed: true, start: slideRef.current }), [debounced]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data as { type?: string; index?: number };
      if (message?.type === "noma-proposal-slide" && typeof message.index === "number") {
        onChangeRef.current(message.index);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function post(index: number) {
    frameRef.current?.contentWindow?.postMessage({ type: "noma-proposal-goto", index }, "*");
  }

  useEffect(() => {
    post(slide);
  }, [slide]);

  useEffect(() => {
    if (slide > total - 1) onChangeRef.current(Math.max(0, total - 1));
  }, [slide, total]);

  const go = (index: number) => onSlideChange(Math.max(0, Math.min(total - 1, index)));
  const current = pages[Math.min(slide, total - 1)];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-charcoal/[0.08] px-4 py-3">
        <div className="min-w-0">
          <p className="eyebrow">Prévia ao vivo</p>
          <p className="truncate text-sm font-semibold text-charcoal">
            {current ? PAGE_LABELS[current.kind] : ""}
            <span className="font-normal text-charcoal/45"> · {TEMPLATE_NAMES[data.identity.template]}</span>
          </p>
        </div>
        <button type="button" className="btn-ghost" title="Abrir em tela cheia" aria-label="Abrir em tela cheia" onClick={onOpenFull}>
          <OpenInNewRounded sx={{ fontSize: 19 }} />
        </button>
      </div>
      <div className="relative aspect-video w-full" style={{ background: PAGE_BG[data.identity.template] }}>
        <iframe
          ref={frameRef}
          title="Prévia da proposta"
          srcDoc={html}
          onLoad={() => post(slideRef.current)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          allow="autoplay; fullscreen"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button type="button" className="btn-secondary !px-3 !py-1.5" disabled={slide <= 0} onClick={() => go(slide - 1)}>
          ← Anterior
        </button>
        <span className="text-sm font-semibold tabular-nums tracking-wider text-charcoal/70">
          {String(Math.min(slide, total - 1) + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <button type="button" className="btn-secondary !px-3 !py-1.5" disabled={slide >= total - 1} onClick={() => go(slide + 1)}>
          Próxima →
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto border-t border-charcoal/[0.08] px-3 py-2.5">
        {pages.map((page, index) => (
          <button
            key={index}
            type="button"
            onClick={() => go(index)}
            title={PAGE_LABELS[page.kind]}
            className={`flex-none rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              index === slide ? "bg-tan text-white" : "bg-beige text-charcoal/55 hover:text-charcoal"
            }`}
          >
            {String(index + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
    </div>
  );
}
