import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import {
  HiOutlineArrowRight,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineStar,
  HiOutlineTag,
  HiOutlineViewColumns,
  HiOutlineClipboardDocumentList,
  HiOutlineSparkles,
} from "react-icons/hi2";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";

const settingsLinks = [
  {
    href: "/configuracoes/funis",
    title: "Funis",
    description: "Crie funis, etapas e tipos (geral, agendamento e fechamento).",
    icon: HiOutlineViewColumns,
  },
  {
    href: "/configuracoes/formularios",
    title: "Formulários",
    description: "Monte formulários personalizados para qualificação de leads.",
    icon: HiOutlineClipboardDocumentList,
  },
  {
    href: "/configuracoes/etiquetas",
    title: "Etiquetas",
    description: "Crie etiquetas para organizar negociações e contatos.",
    icon: HiOutlineTag,
  },
  {
    href: "/configuracoes/negociacoes-especificas",
    title: "Negociações específicas",
    description: "Administração especial de negociações e regras avançadas.",
    icon: HiOutlineSparkles,
  },
  {
    href: "/nps",
    title: "NPS",
    description: "Gere e acompanhe avaliações Net Promoter Score.",
    icon: HiOutlineStar,
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  const { data: google, reload } = useAsyncData(
    () => (isAdmin ? resources.google.status() : Promise.resolve(null)),
    [isAdmin],
  );

  useEffect(() => {
    if (router.query.google === "connected" || router.query.google === "error") {
      void reload();
    }
  }, [reload, router.query.google]);

  const links = isAdmin
    ? [
        ...settingsLinks,
        {
          href: "/configuracoes/financeiro",
          title: "Financeiro",
          description: "Categorias e percentuais da distribuição automática das vendas.",
          icon: HiOutlineBanknotes,
        },
      ]
    : settingsLinks;

  return (
    <>
      <Head>
        <title>Configurações | Noma CRM</title>
      </Head>

      <PageHeader
        eyebrow="Workspace"
        title="Configurações"
        description="Ajustes do motor comercial: funis, captura de leads e etiquetas."
      />

      {isAdmin ? (
        <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-tan/15 to-gold/10 text-tan">
              <HiOutlineCalendarDays className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base font-semibold">Google Agenda</h3>
            <p className="mt-1 text-sm text-charcoal/50">
              {google?.connected
                ? `Conectado${google.connectedEmail ? ` como ${google.connectedEmail}` : ""}. Compromissos usam este calendário.`
                : "Conecte o calendário da empresa para sincronizar compromissos."}
            </p>
            {router.query.google === "error" ? (
              <p className="mt-2 text-sm text-burgundy">Não foi possível concluir a conexão com o Google.</p>
            ) : null}
          </div>
          {google?.connected ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void resources.google.disconnect().then(reload)}
            >
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                const { url } = await resources.google.connectUrl();
                window.location.href = url;
              }}
            >
              Conectar Google Agenda
            </button>
          )}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="card group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-tan/15 to-gold/10 text-tan">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-charcoal">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-charcoal/50">{item.description}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-tan">
                Abrir
                <HiOutlineArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </p>
            </Link>
          );
        })}
      </section>
    </>
  );
}
