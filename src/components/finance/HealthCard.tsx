import type { FinanceInsight, InsightTone } from "@/lib/finance/insights";

const dot: Record<InsightTone, string> = {
  sage: "bg-sage",
  gold: "bg-gold",
  burgundy: "bg-burgundy",
  tan: "bg-tan",
};

export default function HealthCard({ insights, isLoading }: { insights: FinanceInsight[]; isLoading: boolean }) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-charcoal">Saúde do mês</h2>
      <p className="text-sm text-charcoal/55">Leituras rápidas a partir dos seus lançamentos.</p>
      {isLoading ? (
        <div className="mt-4 grid gap-3">
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {insights.map((item) => (
            <li key={item.key} className="card-muted flex gap-3 p-3.5">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[item.tone]}`} aria-hidden />
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.title}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-charcoal/60">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
