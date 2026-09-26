interface Option<T extends string> {
  value: T;
  title: string;
  description?: string;
  badge?: string;
}

interface OptionCardsProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}

const gridCols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 xl:grid-cols-4" };

/** Grade de cartões selecionáveis (tipo de contrato, situação do follow-up, canal...). */
export default function OptionCards<T extends string>({ value, options, onChange, columns = 2 }: OptionCardsProps<T>) {
  return (
    <div className={`grid gap-3 ${gridCols[columns]}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-xl border p-4 text-left transition duration-150 ${
              selected
                ? "border-tan bg-tan/[0.06] ring-2 ring-tan/20"
                : "border-charcoal/10 bg-surface hover:border-charcoal/25"
            }`}
          >
            {option.badge ? <span className="eyebrow mb-1 block">{option.badge}</span> : null}
            <span className="block text-sm font-semibold text-charcoal">{option.title}</span>
            {option.description ? (
              <span className="mt-1 block text-[13px] leading-5 text-charcoal/55">{option.description}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
