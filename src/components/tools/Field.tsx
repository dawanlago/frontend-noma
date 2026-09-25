import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}

/** Campo com rótulo para as grades de formulário das ferramentas (`grid sm:grid-cols-2`). */
export default function Field({ label, hint, full, children }: FieldProps) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-charcoal">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-charcoal/50">{hint}</span> : null}
    </label>
  );
}
