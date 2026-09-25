import type { ReactNode } from "react";

export default function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card-muted flex flex-col items-center px-6 py-12 text-center">
      <h3 className="font-semibold text-charcoal">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-charcoal/55">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
