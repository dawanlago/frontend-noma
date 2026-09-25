import type { ReactNode } from "react";
import Link from "next/link";
import EntityAvatar from "./Avatar";
import AffinityStars from "./AffinityStars";

interface ProfileHeaderProps {
  backHref: string;
  backLabel: string;
  name: string;
  image: string;
  square?: boolean;
  subtitle?: ReactNode;
  chips?: ReactNode;
  affinity: number;
  onAffinity: (value: number) => void;
  actions?: ReactNode;
}

export default function ProfileHeader({ backHref, backLabel, name, image, square, subtitle, chips, affinity, onAffinity, actions }: ProfileHeaderProps) {
  return (
    <div className="mb-6">
      <Link href={backHref} className="text-sm font-semibold text-tan hover:underline">
        ← {backLabel}
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <EntityAvatar name={name} image={image} square={square} size={72} />
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight text-charcoal">{name}</h1>
            {subtitle ? <p className="mt-0.5 text-sm text-charcoal/60">{subtitle}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AffinityStars value={affinity} onChange={onAffinity} />
              {chips}
            </div>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function InfoList({ items }: { items: { label: string; value?: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-charcoal/[0.06]">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-3 py-2 text-sm">
          <dt className="text-charcoal/55">{item.label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-charcoal">{item.value || <span className="text-charcoal/35">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
