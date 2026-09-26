import Head from "next/head";
import Link from "next/link";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineClipboardDocumentList,
  HiOutlineFaceSmile,
  HiOutlineArrowRight,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineFunnel,
  HiOutlineListBullet,
  HiOutlinePaintBrush,
  HiOutlineTag,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

const settingsLinks = [
  {
    href: "/configuracoes/geral",
    title: "Geral e identidade visual",
    description: "Nome da produtora, frase de entrada do início, cores e logo usados no briefing.",
    icon: HiOutlinePaintBrush,
  },
  {
    href: "/configuracoes/opcoes",
    title: "Listas de opções",
    description: "Serviços, origens, nichos, cargos, tipos de receita, formas de pagamento e todas as outras seleções.",
    icon: HiOutlineListBullet,
  },
  {
    href: "/configuracoes/campos",
    title: "Campos personalizados",
    description: "Crie campos extras para negociações, contatos, empresas e para a prospecção.",
    icon: HiOutlineAdjustmentsHorizontal,
  },
  {
    href: "/configuracoes/funis",
    title: "Funis de venda",
    description: "Crie funis personalizados e ajuste as etapas de cada um.",
    icon: HiOutlineFunnel,
  },
  {
    href: "/configuracoes/prospeccao",
    title: "Mensagens da prospecção",
    description: "Edite as mensagens prontas de cada oportunidade e a chamada de cada objetivo.",
    icon: HiOutlineChatBubbleLeftRight,
  },
  {
    href: "/configuracoes/contratos",
    title: "Modelos de contrato",
    description: "Cadastre o contrato padrão da produtora e outros modelos com campos automáticos.",
    icon: HiOutlineDocumentText,
  },
  {
    href: "/configuracoes/etiquetas",
    title: "Etiquetas",
    description: "Crie etiquetas para organizar contatos e empresas.",
    icon: HiOutlineTag,
  },
  {
    href: "/formularios",
    title: "Formulários",
    description: "Monte formulários personalizados para enviar pela negociação ou por link público.",
    icon: HiOutlineClipboardDocumentList,
  },
  {
    href: "/nps",
    title: "Pesquisas NPS",
    description: "Crie as pesquisas de satisfação enviadas aos clientes.",
    icon: HiOutlineFaceSmile,
  },
  {
    href: "/usuarios",
    title: "Usuários e acessos",
    description: "Cadastre a equipe e escolha o que cada pessoa pode acessar no sistema.",
    icon: HiOutlineUserGroup,
    adminOnly: true,
  },
];

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const links = settingsLinks.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <Head>
        <title>Configurações | Noma</title>
      </Head>

      <PageHeader
        eyebrow="Workspace"
        title="Configurações"
        description="Ajuste campos, opções, funis, mensagens e a identidade da produtora."
      />

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
