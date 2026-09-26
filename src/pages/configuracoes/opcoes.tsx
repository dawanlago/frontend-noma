import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import BudgetCatalogFields from "@/components/budget/BudgetCatalogFields";
import OptionListEditor from "@/components/options/OptionListEditor";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { BUDGET_ITEM_LIST } from "@/lib/budget/catalog";
import { MESSAGE_LISTS, OPTION_LISTS } from "@/lib/options";

const AREAS = [...new Set(OPTION_LISTS.map((item) => item.area))];

export default function OptionListsPage() {
  const router = useRouter();
  const { optionsOf } = useWorkspace();
  const { can } = useAuth();
  const selectedKey = typeof router.query.lista === "string" ? router.query.lista : OPTION_LISTS[0].key;
  const selected = OPTION_LISTS.find((item) => item.key === selectedKey) || OPTION_LISTS[0];

  function select(key: string) {
    void router.replace({ pathname: router.pathname, query: { lista: key } }, undefined, { shallow: true });
  }

  return (
    <>
      <Head>
        <title>Listas de opções | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Listas de opções"
        description="Tudo o que aparece nos campos de seleção do sistema. Você também pode cadastrar direto do formulário pelo atalho “+ Cadastrar nova opção”."
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <nav className="card self-start p-3">
          {AREAS.map((area) => (
            <div key={area} className="mb-3 last:mb-0">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">{area}</p>
              {OPTION_LISTS.filter((item) => item.area === area).map((item) => {
                const active = item.key === selected.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => select(item.key)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      active ? "bg-tan/10 font-semibold text-tan" : "text-charcoal/70 hover:bg-beige"
                    }`}
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="text-xs text-charcoal/40">{optionsOf(item.key).length}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <section className="card p-5 sm:p-6">
          <p className="eyebrow">{selected.area}</p>
          <h2 className="mt-1 text-lg font-semibold text-charcoal">{selected.title}</h2>
          <p className="mb-5 mt-1 text-sm text-charcoal/55">{selected.description}</p>
          {MESSAGE_LISTS.includes(selected.key) ? (
            <p className="mb-4 rounded-lg border border-tan/20 bg-tan/[0.05] px-4 py-3 text-sm text-charcoal/70">
              As mensagens de cada item ficam em{" "}
              <Link href="/configuracoes/prospeccao" className="font-semibold text-tan hover:underline">
                Mensagens da prospecção
              </Link>
              .
            </p>
          ) : null}
          {selected.key === BUDGET_ITEM_LIST ? (
            <p className="mb-4 text-sm text-charcoal/60">Ao lado de cada item: unidade e valor padrão usados ao adicioná-lo na calculadora.</p>
          ) : null}
          <OptionListEditor
            key={selected.key}
            list={selected.key}
            renderExtra={
              selected.key === BUDGET_ITEM_LIST
                ? (item) => <BudgetCatalogFields item={item} editable={can("configuracoes")} />
                : undefined
            }
          />
        </section>
      </div>
    </>
  );
}
