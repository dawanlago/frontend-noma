import Head from "next/head";
import Link from "next/link";
import { HiOutlineArrowRight, HiOutlineRectangleStack, HiOutlineTag, HiOutlineUserGroup } from "react-icons/hi2";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

const settingsLinks = [
  {
    href: "/configuracoes/etiquetas",
    title: "Etiquetas",
    description: "Crie etiquetas para organizar contatos e empresas.",
    icon: HiOutlineTag,
  },
  {
    href: "/configuracoes/biblioteca",
    title: "Biblioteca audiovisual",
    description: "Defina o link de cada categoria da biblioteca (músicas, LUTs, presets...).",
    icon: HiOutlineRectangleStack,
    adminOnly: true,
  },
  {
    href: "/usuarios",
    title: "Usuários",
    description: "Cadastre a equipe. Administradores veem os dados de todos.",
    icon: HiOutlineUserGroup,
    adminOnly: true,
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const links = settingsLinks.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <Head>
        <title>Configurações | Noma</title>
      </Head>

      <PageHeader eyebrow="Workspace" title="Configurações" description="Ajustes gerais do seu Box." />

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
              <h3 className="font-display text-lg font-semibold tracking-tight text-charcoal">{item.title}</h3>
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
