import Link from "next/link";
import Head from "next/head";
import { HiOutlineArrowRight, HiOutlineViewColumns } from "react-icons/hi2";
import PageHeader from "@/components/ui/PageHeader";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";

const stagePalette = ["bg-tan", "bg-gold", "bg-sage", "bg-burgundy", "bg-[#4A6FA5]"];

export default function FunnelsPage() {
  const { data: funnels, isLoading, error } = useAsyncData(() => resources.funnels.list());

  return (
    <>
      <Head><title>Funis | Noma CRM</title></Head>
      <PageHeader
        eyebrow="Comercial"
        title="Funis de conversão"
        description="Escolha um pipeline e acompanhe cada etapa da jornada do lead."
      />

      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}

      {isLoading && !funnels ? (
        <section className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="card p-6">
              <div className="h-3 w-16 skeleton" />
              <div className="mt-4 h-8 w-48 skeleton" />
              <div className="mt-5 h-2 w-full skeleton" />
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-20 skeleton" />
                <div className="h-6 w-24 skeleton" />
              </div>
            </div>
          ))}
        </section>
      ) : (funnels || []).length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-beige text-tan">
            <HiOutlineViewColumns className="h-6 w-6" />
          </div>
          <p className="font-medium text-charcoal">Nenhum funil cadastrado ainda.</p>
          <p className="mt-1 text-sm text-charcoal/50">Crie o primeiro em Configurações.</p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {(funnels || []).map((funnel) => (
            <Link
              key={funnel._id}
              href={`/funis/${funnel._id}`}
              className="card group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Pipeline</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-charcoal">
                    {funnel.name}
                  </h2>
                </div>
                <span className="chip bg-beige text-charcoal/55">{funnel.stages.length} etapas</span>
              </div>
              <div className="mt-5 flex h-2 overflow-hidden rounded-full">
                {funnel.stages.map((stage, index) => (
                  <div
                    key={stage._id}
                    className={stagePalette[index % stagePalette.length]}
                    style={{ width: `${100 / Math.max(funnel.stages.length, 1)}%` }}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {funnel.stages.slice(0, 5).map((stage) => (
                  <span key={stage._id} className="rounded-full bg-beige px-2.5 py-1 text-[11px] font-medium text-charcoal/60">
                    {stage.name}
                  </span>
                ))}
              </div>
              <p className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-tan">
                Abrir kanban
                <HiOutlineArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
