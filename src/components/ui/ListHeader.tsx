import type { ReactNode } from "react";

interface ListHeaderProps {
  title: string;
  /** Uma linha curta abaixo do título (opcional). */
  description?: ReactNode;
  /** Elementos ao lado do título (ex.: seletor de visualização). */
  aside?: ReactNode;
  actions?: ReactNode;
}

/** Cabeçalho padrão das listagens: título à esquerda, ações à direita. */
export default function ListHeader({ title, description, aside, actions }: ListHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal sm:text-[28px]">{title}</h1>
          {aside}
        </div>
        {description ? <p className="mt-1 text-sm text-charcoal/55">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
