import type { ReactNode } from "react";
import Link from "next/link";
import LogoMark from "@/components/ui/LogoMark";

/** Moldura das telas de senha (esqueci / redefinir): logo, cartão central e volta ao login. */
export default function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <LogoMark size="md" withWordmark />
        </div>
        <div className="card p-7 shadow-soft sm:p-8">
          <h1 className="text-2xl font-semibold text-charcoal">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-charcoal/60">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-semibold text-tan hover:underline">
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
