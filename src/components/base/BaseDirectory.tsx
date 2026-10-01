import { useEffect, useMemo, useState, type ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import OptionSelect from "@/components/options/OptionSelect";
import FilterBar, { type FilterChip } from "@/components/ui/FilterBar";
import ListHeader from "@/components/ui/ListHeader";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import type { Company, Contact } from "@/types";
import AffinityStars from "./AffinityStars";
import EntityAvatar from "./Avatar";
import CompanyForm from "./CompanyForm";
import ContactForm from "./ContactForm";

type EntityType = "all" | "contact" | "company";

const TYPE_LABELS: Record<EntityType, string> = { all: "Pessoas e empresas", contact: "Pessoas", company: "Empresas" };

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
  /** Tipo inicial (pessoas, empresas ou tudo). */
  initialType?: EntityType;
  /** Mostra só registros com um destes tipos de relação (ex.: fornecedores). */
  kinds?: string[];
  /** Tipos de relação marcados nos cadastros novos feitos aqui. */
  newKinds?: string[];
  showCategory?: boolean;
  hideTypeTabs?: boolean;
  /** Botões extras no topo (ex.: "Possíveis duplicados"). */
  extraActions?: ReactNode;
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
  initialType = "all",
  kinds,
  newKinds = [],
  showCategory,
  hideTypeTabs,
  extraActions,
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

  // Botão "Criar" do topo: ?novo=contato ou ?novo=empresa abre o cadastro.
  useEffect(() => {
    const novo = router.query.novo;
    if (!router.isReady || typeof novo !== "string") return;
    setForm(novo === "empresa" ? "company" : "contact");
    const query = { ...router.query };
    delete query.novo;
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    // Só reage à chegada do parâmetro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.novo]);

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
      extra: (contact.companyIds?.length ? contact.companyIds : contact.companyId ? [contact.companyId] : [])
        .map((companyId) => companyNames.get(companyId) || "")
        .filter(Boolean)
        .join(", "),
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

  const chips: FilterChip[] = [
    search ? { key: "search", label: `Busca: ${search}`, onRemove: () => setSearch("") } : null,
    type !== initialType ? { key: "type", label: TYPE_LABELS[type], onRemove: () => setType(initialType) } : null,
    kind ? { key: "kind", label: labelOf("relationship", kind), onRemove: () => setKind("") } : null,
    niche ? { key: "niche", label: labelOf("niche", niche), onRemove: () => setNiche("") } : null,
    category ? { key: "category", label: labelOf("supplierCategory", category), onRemove: () => setCategory("") } : null,
  ].filter((chip): chip is FilterChip => Boolean(chip));

  function counts(value: EntityType) {
    return rows.filter((row) => (value === "all" || row.type === value) && (!kinds || row.kinds.some((item) => kinds.includes(item)))).length;
  }

  return (
    <>
      <Head>
        <title>{`${title} | Noma`}</title>
      </Head>
      <ListHeader
        title={title}
        description={description}
        actions={
          <>
            {extraActions}
            {initialType !== "company" ? (
              <button type="button" className="btn-primary" onClick={() => setForm("contact")}>
                Criar contato
              </button>
            ) : null}
            <button type="button" className={initialType === "company" ? "btn-primary" : "btn-secondary"} onClick={() => setForm("company")}>
              Criar empresa
            </button>
          </>
        }
      />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome, telefone, e-mail ou empresa" }}
        count={`${filtered.length} registro${filtered.length === 1 ? "" : "s"}`}
        chips={chips}
      >
        {!hideTypeTabs ? (
          <Select
            value={type}
            onChange={(value) => setType(value as EntityType)}
            options={(["all", "contact", "company"] as EntityType[]).map((value) => ({
              value,
              label: `${TYPE_LABELS[value]} (${counts(value)})`,
            }))}
          />
        ) : null}
        <Select
          value={kind}
          onChange={setKind}
          placeholder="Todas as relações"
          options={[{ value: "", label: "Todas as relações" }, ...kindOptions.map((item) => ({ value: item.value, label: item.label }))]}
        />
        <OptionSelect list="niche" noAdd value={niche} onChange={setNiche} emptyLabel="Todos os nichos" />
        {showCategory ? <OptionSelect list="supplierCategory" noAdd value={category} onChange={setCategory} emptyLabel="Todas as categorias" /> : null}
      </FilterBar>

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
