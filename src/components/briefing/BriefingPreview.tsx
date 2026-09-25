import { EMPTY_LABEL, type BriefingSummary } from "@/lib/briefing/format";

/** Visualização ao vivo do briefing, organizada por blocos. */
export default function BriefingPreview({ summary }: { summary: BriefingSummary }) {
  const percent = summary.total ? Math.round((summary.filled / summary.total) * 100) : 0;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-charcoal/[0.08] bg-beige/60 px-5 py-4">
        <p className="eyebrow">Briefing de produção</p>
        <h3 className="mt-1 truncate text-lg font-semibold text-charcoal">{summary.title}</h3>
        <span className="chip mt-2 bg-tan/10 text-tan">{summary.typeLabel}</span>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-charcoal/60">Campos preenchidos</span>
            <span className="font-semibold text-charcoal">
              {summary.filled} / {summary.total}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-charcoal/[0.08]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={summary.total}
            aria-valuenow={summary.filled}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${percent === 100 ? "bg-sage" : "bg-tan"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
      <div className="max-h-[calc(100vh-19rem)] min-h-[320px] space-y-5 overflow-y-auto px-5 py-5">
        {summary.blocks.map((block) => (
          <section key={block.title}>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/45">{block.title}</h4>
            <dl className="divide-y divide-charcoal/[0.06] rounded-lg border border-charcoal/[0.08]">
              {block.items.map((entry) => (
                <div key={entry.label} className={`px-3 py-2 ${entry.long ? "" : "grid grid-cols-[42%_minmax(0,1fr)] gap-3"}`}>
                  <dt className="text-xs font-medium text-charcoal/55">{entry.label}</dt>
                  <dd
                    className={`text-[13px] ${entry.long ? "mt-0.5 whitespace-pre-line" : "break-words"} ${
                      entry.value ? "text-charcoal" : "italic text-charcoal/35"
                    }`}
                  >
                    {entry.value || EMPTY_LABEL}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
