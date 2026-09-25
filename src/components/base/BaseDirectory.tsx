import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import OptionSelect from "@/components/options/OptionSelect";
import PageHeader from "@/components/ui/PageHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import type { Company, Contact } from "@/types";
import AffinityStars from "./AffinityStars";
import EntityAvatar from "./Avatar";
import CompanyForm from "./CompanyForm";
import ContactForm from "./ContactForm";

type EntityType = "all" | "contact" | "company";

interface Row {
  id: string;
  type: "contact" | "company";
  name: string;
  image: string;
  kinds: string[];
  niche: string;
  supplierCategory: string;
  reach: string;
  affinity: number;
  extra: string;
}

interface BaseDirectoryProps {
  title: string;
  description: string;
  eyebrow?: string;
  /** Tipo inicial (pessoas, empresas ou tudo). */
  initialType?: EntityType;
  /** Mostra só registros com um destes tipos de relação (ex.: fornecedores). */
  kinds?: string[];
  /** Tipos de relação marcados nos cadastros novos feitos aqui. */
  newKinds?: string[];
  showCategory?: boolean;
  hideTypeTabs?: boolean;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Base de dados unificada: contatos e empresas, com filtro por tipo de relação, nicho e categoria. */
export default function BaseDirectory({
  title,
  description,
  eyebrow = "Base de dados",
  initialType = "all",
  kinds,
  newKinds = [],
  showCategory,
  hideTypeTabs,
}: BaseDirectoryProps) {
  const router = useRouter();
  const { optionsOf, labelOf } = useWorkspace();
  const contacts = useAsyncData(() => (initialType === "company" && hideTypeTabs ? Promise.resolve([]) : resources.contacts.list()));
  const companies = useAsyncData(() => resources.companies.list());
  const [type, setType] = useState<EntityType>(initialType);
  const [kind, setKind] = useState("");
  const [niche, setNiche] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<"contact" | "company" | null>(null);

  const companyNames = useMemo(() => new Map((companies.data || []).map((company) => [company._id, company.name])), [companies.data]);

  const rows = useMemo<Row[]>(() => {
    const people: Row[] = (contacts.data || []).map((contact: Contact) => ({
      id: contact._id,
      type: "contact",
      name: contact.name,
      image: contact.photo,
      kinds: contact.kinds || [],
      niche: contact.niche,
      supplierCategory: contact.supplierCategory,
      reach: contact.phone || contact.email,
      affinity: contact.affinity || 0,
      extra: contact.companyId ? companyNames.get(contact.companyId) || "" : "",
    }));
    const orgs: Row[] = (companies.data || []).map((company: Company) => ({
      id: company._id,
      type: "company",
      name: company.name,
      image: company.logo,
      kinds: company.kinds || [],
      niche: company.niche,
      supplierCategory: company.supplierCategory,
      reach: company.phone || company.email,
      affinity: company.affinity || 0,
      extra: company.contactsCount ? `${company.contactsCount} contato${company.contactsCount > 1 ? "s" : ""}` : company.taxId,
    }));
    return [...people, ...orgs].sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts.data, companies.data, companyNames]);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return rows.filter((row) => {
      if (type !== "all" && row.type !== type) return false;
      if (kinds && !row.kinds.some((item) => kinds.includes(item))) return false;
      if (kind && !row.kinds.includes(kind)) return false;
      if (niche && row.niche !== niche) return false;
      if (category && row.supplierCategory !== category) return false;
      if (term && !normalize(`${row.name} ${row.reach} ${row.extra}`).includes(term)) return false;
      return true;
    });
  }, [rows, type, kinds, kind, niche, category, search]);

  const kindOptions = optionsOf("relationship").filter((item) => !kinds || kinds.includes(item.value));
  const isLoading = contacts.isLoading || companies.isLoading;

  function counts(value: EntityType) {
    return rows.filter((row) => (value === "all" || row.type === value) && (!kinds || row.kinds.some((item) => kinds.includes(item)))).length;
  }

  return (
    <>
      <Head>
        <title>{`${title} | Noma`}</title>
      </Head>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <>
            {initialType !== "company" ? (
              <button type="button" className="btn-primary" onClick={() => setForm("contact")}>
                Novo contato
              </button>
            ) : null}
            <button type="button" className={initialType === "company" ? "btn-primary" : "btn-secondary"} onClick={() => setForm("company")}>
              Nova empresa
            </button>
          </>
        }
      />

      <div className="card mb-4 space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Buscar</span>
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
            <input className="input-search pl-9" placeholder="Buscar por nome, telefone, e-mail ou empresa" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:flex">
            <div className="lg:w-52">
              <OptionSelect list="niche" noAdd value={niche} onChange={setNiche} emptyLabel="Todos os nichos" />
            </div>
            {showCategory ? (
              <div className="lg:w-56">
                <OptionSelect list="supplierCategory" noAdd value={category} onChange={setCategory} emptyLabel="Todas as categorias" />
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!hideTypeTabs
            ? (["all", "contact", "company"] as EntityType[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  onClick={() => setType(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    type === value ? "bg-charcoal text-white" : "bg-beige text-charcoal/60 hover:text-charcoal"
                  }`}
                >
                  {value === "all" ? "Todos" : value === "contact" ? "Pessoas" : "Empresas"} <span className="opacity-60">{counts(value)}</span>
                </button>
              ))
            : null}
          {!hideTypeTabs ? <span className="mx-1 h-5 w-px bg-charcoal/10" aria-hidden /> : null}
          {[{ value: "", label: "Todas as relações" }, ...kindOptions].map((item) => (
            <button
              key={item.value || "all"}
              type="button"
              aria-pressed={kind === item.value}
              onClick={() => setKind(item.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                kind === item.value ? "border-tan bg-tan/10 text-tan" : "border-charcoal/10 text-charcoal/60 hover:border-charcoal/25"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[820px] text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Relação</th>
                <th className="px-4 py-3 text-left">{showCategory ? "Categoria" : "Nicho"}</th>
                <th className="px-4 py-3 text-left">Contato</th>
                <th className="px-4 py-3 text-left">Afinidade</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="skeleton h-6" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-charcoal/50">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={`${row.type}-${row.id}`}
                    className="cursor-pointer"
                    onClick={() => void router.push(row.type === "contact" ? `/contatos/${row.id}` : `/empresas/${row.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <EntityAvatar name={row.name} image={row.image} square={row.type === "company"} />
                        <div className="min-w-0">
                          <Link
                            href={row.type === "contact" ? `/contatos/${row.id}` : `/empresas/${row.id}`}
                            className="block truncate font-semibold text-charcoal hover:text-tan"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {row.name}
                          </Link>
                          <p className="truncate text-xs text-charcoal/50">
                            {row.type === "contact" ? "Pessoa" : "Empresa"}
                            {row.extra ? ` · ${row.extra}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.kinds.length ? (
                          row.kinds.map((item) => (
                            <span key={item} className="chip bg-tan/10 text-tan">
                              {labelOf("relationship", item)}
                            </span>
                          ))
                        ) : (
                          <span className="text-charcoal/35">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">
                      {showCategory
                        ? row.supplierCategory
                          ? labelOf("supplierCategory", row.supplierCategory)
                          : "—"
                        : row.niche
                          ? labelOf("niche", row.niche)
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">{row.reach || "—"}</td>
                    <td className="px-4 py-3">
                      <AffinityStars value={row.affinity} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-charcoal/45">{filtered.length} registro(s) no filtro atual.</p>

      <ContactForm
        open={form === "contact"}
        contact={null}
        initial={{ kinds: kind ? [kind] : newKinds }}
        onClose={() => setForm(null)}
        onSaved={(contact) => {
          setForm(null);
          void router.push(`/contatos/${contact._id}`);
        }}
      />
      <CompanyForm
        open={form === "company"}
        company={null}
        initial={{ kinds: kind ? [kind] : newKinds }}
        onClose={() => setForm(null)}
        onSaved={(company) => {
          setForm(null);
          void router.push(`/empresas/${company._id}`);
        }}
      />
    </>
  );
}
