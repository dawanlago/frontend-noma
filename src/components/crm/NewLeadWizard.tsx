import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import { HiOutlineInformationCircle, HiOutlineTrash, HiStar } from "react-icons/hi2";
import EntityPicker from "@/components/base/EntityPicker";
import ProductForm from "@/components/base/ProductForm";
import MoneyInput from "@/components/ui/MoneyInput";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { emptyLeadForm, formTotal, productPrice, type LeadFormState } from "@/lib/crm/model";
import { resources } from "@/lib/resources";
import type { Company, Contact, LeadProduct, Product } from "@/types";
import { formatCurrencyBRL, maskCurrencyBRL, maskPhone, parseCurrencyBRL } from "@/utils/format";

interface NewLeadWizardProps {
  open: boolean;
  funnelId?: string;
  preset?: { contactId?: string; companyId?: string };
  onClose: () => void;
  onSave: (form: LeadFormState) => Promise<void>;
}

type Party = "person" | "company";
type Step = "name" | "party" | "contact" | "value" | "done";

/** Contato ou empresa: um já cadastrado (id) ou um novo (só o nome digitado). */
interface Choice {
  id: string;
  name: string;
}

const EMPTY_PICK: Choice = { id: "", name: "" };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Campo de texto que sugere cadastros existentes; se nada for escolhido, vira um cadastro novo ao salvar. */
function ComboInput({
  value,
  items,
  placeholder,
  autoFocus,
  newLabel,
  onChange,
}: {
  value: Choice;
  items: { id: string; label: string; sublabel?: string }[];
  placeholder: string;
  autoFocus?: boolean;
  newLabel: string;
  onChange: (value: Choice) => void;
}) {
  const [open, setOpen] = useState(false);
  const term = normalize(value.name);
  const matches = useMemo(
    () => (term ? items.filter((item) => normalize(item.label).includes(term)) : items).slice(0, 6),
    [items, term],
  );

  return (
    <div className="relative">
      <input
        className="input-search"
        value={value.name}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange({ id: "", name: event.target.value });
          setOpen(true);
        }}
      />
      {value.id ? (
        <p className="mt-1.5 text-xs font-semibold text-sage">Já cadastrado na base</p>
      ) : value.name.trim() ? (
        <p className="mt-1.5 text-xs text-charcoal/50">{newLabel}</p>
      ) : null}
      {open && matches.length && !value.id ? (
        <ul className="absolute left-0 right-0 top-[46px] z-10 max-h-60 overflow-y-auto rounded-xl border border-charcoal/10 bg-surface py-1 shadow-lift">
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-beige"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({ id: item.id, name: item.label });
                  setOpen(false);
                }}
              >
                <span className="block truncate text-sm font-medium text-charcoal">{item.label}</span>
                {item.sublabel ? <span className="block truncate text-xs text-charcoal/50">{item.sublabel}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 text-xs leading-relaxed text-charcoal/60">
      <HiStar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="mb-2 block text-sm font-semibold text-charcoal">
      {children}
      {required ? <span className="text-burgundy"> *</span> : null}
    </span>
  );
}

function Bar({ className = "" }: { className?: string }) {
  return <span className={`block rounded bg-charcoal/[0.07] ${className}`} aria-hidden />;
}

/** Nova negociação em etapas, no formato do RD Station: pergunta à esquerda, prévia do cartão à direita. */
export default function NewLeadWizard({ open, funnelId, preset, onClose, onSave }: NewLeadWizardProps) {
  const { funnels } = useWorkspace();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [party, setParty] = useState<Party | "">("");
  const [company, setCompany] = useState<Choice>(EMPTY_PICK);
  const [contact, setContact] = useState<Choice>(EMPTY_PICK);
  const [phone, setPhone] = useState("");
  const [products, setProducts] = useState<LeadProduct[]>([]);
  const [customValue, setCustomValue] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [productOpen, setProductOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // Cadastros criados numa tentativa que falhou: reaproveita em vez de duplicar.
  const created = useRef<{ contactId?: string; companyId?: string }>({});

  const funnel = funnels.find((item) => item._id === funnelId) || funnels[0];
  const draft = emptyLeadForm(funnel);
  const stage = funnel?.stages.find((item) => item._id === draft.stageId);

  useEffect(() => {
    if (!open) return;
    setStep("name");
    setName("");
    setParty("");
    setCompany(EMPTY_PICK);
    setContact(EMPTY_PICK);
    setPhone("");
    setProducts([]);
    setCustomValue("");
    setError("");
    created.current = {};
    void Promise.all([resources.contacts.list(), resources.companies.list(), resources.products.list()])
      .then(([contactList, companyList, productList]) => {
        setContacts(contactList);
        setCompanies(companyList);
        setCatalog(productList);
        // "Nova negociação" a partir de um perfil: já vem com o contato/empresa.
        const presetCompany = companyList.find((item) => item._id === preset?.companyId);
        const presetContact = contactList.find((item) => item._id === preset?.contactId);
        if (presetCompany) {
          setParty("company");
          setCompany({ id: presetCompany._id, name: presetCompany.name });
          setName(presetCompany.name);
        }
        if (presetContact) {
          if (!presetCompany) setParty("person");
          setContact({ id: presetContact._id, name: presetContact.name });
          setPhone(presetContact.phone || "");
          if (!presetCompany) setName(presetContact.name);
        }
      })
      .catch(() => undefined);
    // Só reinicia ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const steps: Step[] = party === "company" ? ["name", "party", "contact", "value", "done"] : ["name", "party", "value", "done"];
  const index = steps.indexOf(step);
  const total = formTotal({ products, customValue });
  const pickedContact = contacts.find((item) => item._id === contact.id);

  const contactItems = useMemo(() => {
    const list = company.id ? [...contacts].sort((a, b) => Number(b.companyId === company.id) - Number(a.companyId === company.id)) : contacts;
    return list.map((item) => ({ id: item._id, label: item.name, sublabel: item.phone || item.email }));
  }, [contacts, company.id]);

  function validate(current: Step): string {
    if (current === "name" && !name.trim()) return "Este campo é obrigatório.";
    if (current === "party") {
      if (!party) return "Escolha pessoa física ou jurídica.";
      if (party === "company" && !company.name.trim()) return "Informe a empresa.";
      if (party === "person" && !contact.name.trim()) return "Informe o nome do contato.";
    }
    if (current === "contact" && !contact.name.trim()) return "Informe o nome do contato.";
    return "";
  }

  function next() {
    const message = validate(step);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep(steps[Math.min(steps.length - 1, index + 1)]);
  }

  function back() {
    setError("");
    setStep(steps[Math.max(0, index - 1)]);
  }

  function pickParty(next: Party) {
    setParty(next);
    setError("");
    if (next === "person") setCompany(EMPTY_PICK);
  }

  function pickContact(value: Choice) {
    setContact(value);
    const existing = contacts.find((item) => item._id === value.id);
    if (existing) setPhone(existing.phone || "");
  }

  async function create() {
    setSaving(true);
    setError("");
    try {
      let companyId = company.id || created.current.companyId || "";
      if (party === "company" && !companyId && company.name.trim()) {
        companyId = (await resources.companies.create({ name: company.name.trim(), kinds: ["lead"] }))._id;
        created.current.companyId = companyId;
      }
      let contactId = contact.id || created.current.contactId || "";
      if (!contactId && contact.name.trim()) {
        contactId = (await resources.contacts.create({ name: contact.name.trim(), phone, kinds: ["lead"], companyId }))._id;
        created.current.contactId = contactId;
      }
      await onSave({ ...draft, name: name.trim(), contactId, companyId, products, customValue });
    } catch (err) {
      setError(apiError(err, "Não foi possível criar a negociação."));
    } finally {
      setSaving(false);
    }
  }

  const card = (
    <div className="w-full max-w-[320px] text-left">
      <div className="rounded-xl border border-charcoal/[0.08] bg-surface p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm text-charcoal/80">
            <span className="h-3 w-3 rounded-sm bg-tan" aria-hidden />
            {stage?.name || "Novo"}
          </span>
          <HiOutlineInformationCircle className="h-4 w-4 text-charcoal/40" aria-hidden />
        </div>
        {name.trim() ? <p className="mt-1.5 truncate font-semibold text-charcoal">{name}</p> : <Bar className="mt-2.5 h-4 w-3/4" />}
        {party === "company" ? (
          company.name.trim() ? (
            <p className="truncate text-xs text-charcoal/55">{company.name}</p>
          ) : (
            <Bar className="mt-1.5 h-3 w-1/2" />
          )
        ) : null}
        <div className="mt-3">
          {total > 0 ? (
            <p className="text-sm font-semibold tabular-nums text-charcoal">{formatCurrencyBRL(total)}</p>
          ) : (
            <Bar className="h-5 w-full" />
          )}
        </div>
      </div>
      {index >= steps.indexOf(party === "company" ? "contact" : "party") && party ? (
        <div className="rounded-b-xl border border-t-0 border-dashed border-charcoal/15 px-3 py-2.5">
          {contact.name.trim() ? (
            <p className="truncate text-xs font-medium text-charcoal/75">{contact.name}</p>
          ) : (
            <Bar className="h-3 w-2/5" />
          )}
          {phone ? <p className="mt-0.5 text-xs text-charcoal/50">{phone}</p> : <Bar className="mt-1.5 h-3 w-1/4" />}
        </div>
      ) : null}
    </div>
  );

  const dashes = (
    <div className="flex gap-1.5" aria-label={`Etapa ${index + 1} de ${steps.length}`}>
      {steps.map((item, i) => (
        <span key={item} className={`h-[3px] w-5 rounded-full transition ${i <= index ? "bg-charcoal" : "bg-charcoal/20"}`} />
      ))}
    </div>
  );

  const buttons = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button type="button" className="px-2 text-sm font-semibold text-tan hover:underline" onClick={onClose} disabled={saving}>
        Criar mais tarde
      </button>
      {index > 0 ? (
        <button type="button" className="rounded-lg bg-tan/10 px-4 py-2.5 text-sm font-semibold text-tan transition hover:bg-tan/15" onClick={back} disabled={saving}>
          Voltar
        </button>
      ) : null}
      {step === "done" ? (
        <button type="button" className="btn-primary" onClick={() => void create()} disabled={saving}>
          {saving ? "Criando..." : "Criar negociação"}
        </button>
      ) : (
        <button type="submit" form="new-lead-step" className="btn-primary">
          Próximo
        </button>
      )}
    </div>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        slotProps={{ paper: { sx: { width: "min(780px, calc(100% - 32px))", borderRadius: "24px", overflow: "hidden", m: 2 } } }}
      >
        {step === "done" ? (
          <div className="flex min-h-[520px] flex-col bg-beige px-6 py-8 sm:px-8">
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-charcoal">Sua negociação está pronta!</h2>
                <p className="mt-2 text-sm text-charcoal/60">
                  Ela entra no funil <strong>{funnel?.name}</strong>, na etapa <strong>{stage?.name}</strong>. Os demais detalhes você completa
                  depois, na própria negociação.
                </p>
              </div>
              {card}
            </div>
            {error ? <p className="mb-3 text-center text-sm font-medium text-burgundy">{error}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {dashes}
              {buttons}
            </div>
          </div>
        ) : (
          <div className="grid min-h-[520px] md:grid-cols-2">
            <form
              id="new-lead-step"
              className="flex flex-col px-6 py-7 sm:px-7"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                next();
              }}
            >
              <h2 className="mb-6 text-[26px] font-bold leading-tight tracking-tight text-charcoal">Criando uma negociação</h2>
              <div key={step} className="noma-page-enter flex-1 space-y-4">
                {step === "name" ? (
                  <>
                    <label className="block">
                      <Label required>Qual nome da negociação?</Label>
                      <input
                        className="input-search"
                        value={name}
                        autoFocus
                        placeholder="Ex.: Clipe banda Aurora"
                        onChange={(event) => setName(event.target.value)}
                      />
                    </label>
                    {error ? <p className="text-xs font-medium text-burgundy">{error}</p> : null}
                    <div className="space-y-2 pt-1">
                      <Tip>Defina um nome que te ajude a identificar facilmente a negociação no funil de vendas.</Tip>
                      <Tip>Em vendas para pessoa física, a negociação geralmente leva o nome do contato; para pessoa jurídica, o nome da empresa.</Tip>
                    </div>
                  </>
                ) : null}

                {step === "party" ? (
                  <>
                    <div>
                      <Label required>Com quem você está negociando?</Label>
                      <div className="flex flex-wrap gap-2" role="radiogroup">
                        {(
                          [
                            { value: "person", label: "Pessoa física" },
                            { value: "company", label: "Pessoa jurídica" },
                          ] as { value: Party; label: string }[]
                        ).map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            role="radio"
                            aria-checked={party === item.value}
                            onClick={() => pickParty(item.value)}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                              party === item.value ? "border-tan bg-tan text-white" : "border-charcoal/20 text-charcoal hover:border-charcoal/40"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {party === "company" ? (
                      <div>
                        <Label required>Empresa</Label>
                        <ComboInput
                          value={company}
                          items={companies.map((item) => ({ id: item._id, label: item.name, sublabel: item.taxId }))}
                          placeholder="Nome da empresa"
                          newLabel="Empresa nova: será cadastrada na base ao criar."
                          autoFocus
                          onChange={setCompany}
                        />
                      </div>
                    ) : null}
                    {party === "person" ? (
                      <>
                        <div>
                          <Label required>Nome do contato</Label>
                          <ComboInput
                            value={contact}
                            items={contactItems}
                            placeholder="Nome do contato"
                            newLabel="Contato novo: será cadastrado na base ao criar."
                            autoFocus
                            onChange={pickContact}
                          />
                        </div>
                        <label className="block">
                          <Label>Telefone</Label>
                          <input
                            className="input-search"
                            value={phone}
                            inputMode="tel"
                            placeholder="(99) 99999-9999"
                            disabled={Boolean(pickedContact)}
                            onChange={(event) => setPhone(maskPhone(event.target.value))}
                          />
                        </label>
                        <Tip>As informações de contato ficam nos detalhes da negociação. Para acessá-las, clique no cartão no funil de vendas.</Tip>
                      </>
                    ) : null}
                    {error ? <p className="text-xs font-medium text-burgundy">{error}</p> : null}
                  </>
                ) : null}

                {step === "contact" ? (
                  <>
                    <div>
                      <Label required>Nome do contato</Label>
                      <ComboInput
                        value={contact}
                        items={contactItems}
                        placeholder="Quem responde pela empresa"
                        newLabel="Contato novo: será cadastrado na base ao criar."
                        autoFocus
                        onChange={pickContact}
                      />
                    </div>
                    <label className="block">
                      <Label>Telefone</Label>
                      <input
                        className="input-search"
                        value={phone}
                        inputMode="tel"
                        placeholder="(99) 99999-9999"
                        disabled={Boolean(pickedContact)}
                        onChange={(event) => setPhone(maskPhone(event.target.value))}
                      />
                    </label>
                    {error ? <p className="text-xs font-medium text-burgundy">{error}</p> : null}
                    <Tip>As informações de contato ficam nos detalhes da negociação. Para acessá-las, clique no cartão no funil de vendas.</Tip>
                  </>
                ) : null}

                {step === "value" ? (
                  <>
                    <div>
                      <Label>Qual o valor da negociação?</Label>
                      <EntityPicker
                        items={catalog.map((product) => ({
                          id: product._id,
                          label: product.name,
                          sublabel: [formatCurrencyBRL(productPrice(product)), product.description].filter(Boolean).join(" · "),
                        }))}
                        value=""
                        onChange={(productId) => {
                          const product = catalog.find((item) => item._id === productId);
                          if (product) setProducts((current) => [...current, { productId, name: product.name, price: productPrice(product) }]);
                        }}
                        placeholder="Adicionar produto"
                        showAvatar={false}
                        addLabel="+ Novo"
                        onAdd={() => setProductOpen(true)}
                      />
                    </div>
                    {products.length ? (
                      <ul className="divide-y divide-charcoal/[0.06] rounded-lg border border-charcoal/[0.08]">
                        {products.map((item, i) => (
                          <li key={`${item.productId}-${i}`} className="flex items-center gap-2 px-3 py-2">
                            <span className="min-w-0 flex-1 truncate text-sm text-charcoal">{item.name}</span>
                            <div className="w-32">
                              <MoneyInput
                                value={item.price ? maskCurrencyBRL(item.price) : ""}
                                onChange={(value) =>
                                  setProducts((current) => current.map((p, j) => (j === i ? { ...p, price: parseCurrencyBRL(value) } : p)))
                                }
                              />
                            </div>
                            <button
                              type="button"
                              className="btn-ghost h-8 w-8 hover:text-burgundy"
                              aria-label="Remover produto"
                              onClick={() => setProducts((current) => current.filter((_, j) => j !== i))}
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <label className="block">
                      <Label>{products.length ? "Valor avulso (somado aos produtos)" : "Valor avulso"}</Label>
                      <MoneyInput value={customValue} onChange={setCustomValue} />
                    </label>
                    <Tip>Opcional. Você pode vincular produtos cadastrados, informar um valor ou deixar para depois.</Tip>
                  </>
                ) : null}
              </div>
              <div className="mt-6">{dashes}</div>
            </form>
            <aside className="flex flex-col bg-beige px-6 py-7 sm:px-7">
              <div className="hidden flex-1 items-center justify-center md:flex">{card}</div>
              {buttons}
            </aside>
          </div>
        )}
      </Dialog>

      <ProductForm
        open={productOpen}
        product={null}
        onClose={() => setProductOpen(false)}
        onSaved={(product) => {
          setCatalog((current) => [...current, product]);
          setProducts((current) => [...current, { productId: product._id, name: product.name, price: productPrice(product) }]);
          setProductOpen(false);
        }}
      />
    </>
  );
}
