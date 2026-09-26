import type { IconType } from "react-icons";
import { HiOutlineArrowPath, HiOutlineEnvelope, HiOutlinePhone, HiOutlineTag, HiOutlineUserGroup } from "react-icons/hi2";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Ícones dos tipos padrão; tipos personalizados usam a etiqueta. */
const ICONS: Record<string, IconType> = {
  meeting: HiOutlineUserGroup,
  call: HiOutlinePhone,
  email: HiOutlineEnvelope,
  followup: HiOutlineArrowPath,
};

export function TaskTypeBadge({ type }: { type?: string }) {
  const { labelOf } = useWorkspace();
  if (!type) return null;
  const Icon = ICONS[type] || HiOutlineTag;
  return (
    <span className="inline-flex items-center gap-1 text-charcoal/55">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {labelOf("taskType", type)}
    </span>
  );
}
