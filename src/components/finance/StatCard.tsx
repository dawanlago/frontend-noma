import type { ReactNode } from "react";

type Tone = "default" | "sage" | "burgundy" | "gold";

const valueTone: Record<Tone, string> = {
  default: "text-charcoal",
  sage: "text-sage",
  burgundy: "text-burgundy",
  gold: "text-gold",
};

const iconTone: Record<Tone, string> = {
  default: "bg-tan/10 text-tan",
  sage: "bg-sage/15 text-sage",
  burgundy: "bg-burgundy/10 text-burgundy",
  gold: "bg-gold/10 text-gold",
};

interface StatCardProps {
  label: string;
  value: string;
  text?: string;
  tone?: Tone;
  icon?: ReactNode;
  loading?: boolean;
}

export default function StatCard({ label, value, text, tone = "default", icon, loading }: StatCardProps) {
  return (
    <div className="card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-charcoal/60">{label}</p>
        {icon ? <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconTone[tone]}`}>{icon}</span> : null}
      </div>
      {loading ? (
        <div className="skeleton mt-3 h-8 w-32" />
      ) : (
        <p className={`mt-2 text-[26px] font-semibold tabular-nums tracking-tight ${valueTone[tone]}`}>{value}</p>
      )}
      {text ? <p className="mt-1.5 text-[13px] leading-5 text-charcoal/55">{text}</p> : null}
    </div>
  );
}
