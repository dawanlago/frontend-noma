import Head from "next/head";
import Link from "next/link";
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";

export default function LibraryPage() {
  const { user } = useAuth();
  const { data: categories, isLoading, error } = useAsyncData(() => resources.library.list());

  return (
    <>
      <Head>
        <title>Biblioteca Audiovisual | Noma</title>
      </Head>

      <PageHeader
        eyebrow="Biblioteca"
        title="Biblioteca Audiovisual"
        description="Recursos organizados por categoria para agilizar suas produções."
        actions={
          user?.role === "admin" ? (
            <Link href="/configuracoes/biblioteca" className="btn-secondary">
              Configurar links
            </Link>
          ) : undefined
        }
      />

      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton h-40" />)
          : (categories || []).map((category) => (
              <div key={category._id} className="card flex flex-col p-6">
                <h3 className="text-lg font-semibold text-charcoal">{category.title}</h3>
                <p className="mt-2 flex-1 text-sm text-charcoal/55">{category.description}</p>
                {category.url ? (
                  <a
                    href={category.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary mt-5 self-start"
                  >
                    Acessar {category.title.toLowerCase()}
                    <HiOutlineArrowTopRightOnSquare />
                  </a>
                ) : (
                  <p className="mt-5 text-sm text-charcoal/45">Esta categoria ainda está sendo preparada.</p>
                )}
              </div>
            ))}
      </section>
    </>
  );
}
