import type { ReactNode } from "react";

interface ToolSectionProps {
  /** Número da etapa, ex.: 1 → "01." */
  step?: number;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Bloco numerado usado nos formulários das ferramentas ("01. Tipo de trabalho"). */
export default function ToolSection({ step, title, description, actions, children }: ToolSectionProps) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal">
            {step ? <span className="mr-1.5 text-tan">{String(step).padStart(2, "0")}.</span> : null}
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-charcoal/55">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
