import { HiOutlineStar, HiStar } from "react-icons/hi2";

interface AffinityStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

/** Estrelas de afinidade (0 a 5). Clicar na estrela marcada zera. */
export default function AffinityStars({ value, onChange, size = "md" }: AffinityStarsProps) {
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label={`Afinidade ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const Icon = filled ? HiStar : HiOutlineStar;
        if (!onChange) return <Icon key={star} className={`${icon} ${filled ? "text-gold" : "text-charcoal/20"}`} />;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
            className="rounded p-0.5 transition hover:scale-110"
            onClick={() => onChange(star === value ? 0 : star)}
          >
            <Icon className={`${icon} ${filled ? "text-gold" : "text-charcoal/25"}`} />
          </button>
        );
      })}
    </div>
  );
}
