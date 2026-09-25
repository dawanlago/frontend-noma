import type { ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

interface SettingsHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Cabeçalho das páginas de configuração, com volta para a central. */
export default function SettingsHeader({ title, description, actions }: SettingsHeaderProps) {
  return (
    <PageHeader
      eyebrow="Configurações"
      title={title}
      description={description}
      actions={
        <>
          <Link href="/configuracoes" className="btn-secondary">
            ← Configurações
          </Link>
          {actions}
        </>
      }
    />
  );
}
