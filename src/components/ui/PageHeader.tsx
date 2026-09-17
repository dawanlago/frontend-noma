import type { ReactNode } from "react";
import Hero from "./Hero";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <Hero
      compact
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
    />
  );
}
