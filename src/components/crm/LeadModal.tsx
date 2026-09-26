import { useEffect, useState } from "react";
import { HiOutlineTrash } from "react-icons/hi2";
import CompanyForm from "@/components/base/CompanyForm";
import ContactForm from "@/components/base/ContactForm";
import EntityPicker from "@/components/base/EntityPicker";
import ProductForm from "@/components/base/ProductForm";
import CustomFieldsInputs from "@/components/options/CustomFieldsInputs";
import OptionSelect from "@/components/options/OptionSelect";
import QuickAddDialog from "@/components/options/QuickAddDialog";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import MoneyInput from "@/components/ui/MoneyInput";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { emptyLeadForm, firstOpenStageId, formTotal, leadToForm, productPrice, type LeadFormState } from "@/lib/crm/model";
import { resources } from "@/lib/resources";
import type { Company, Contact, Lead, Product } from "@/types";
import { formatCurrencyBRL, maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";
import FunnelEditor from "./FunnelEditor";
import { TemperatureBadge, TemperaturePicker } from "./Temperature";

interface LeadModalProps {
  open: boolean;
  lead: Lead | null;
  /** Funil pré-selecionado ao criar. */
  funnelId?: string;
  /** Contato/empresa pré-selecionados ao criar (ex.: "Nova venda" no perfil). */
  preset?: { contactId?: string; companyId?: string };
  onClose: () => void;
  onSave: (form: LeadFormState) => Promise<void>;
  onDelete?: (lead: Lead) => Promise<void>;
}

const ADD_FUNNEL = "__add_funnel__";

/** Etapas da criação (a edição mostra tudo de uma vez). */
const STEPS = [
  { title: "Cliente", description: "Com quem é a negociação?" },
  { title: "Valor", description: "O que está sendo vendido e por quanto?" },
  { title: "Funil e detalhes", description: "Em que ponto do funil ela está?" },
];

/** Cadastro e edição de negociação ("Nova venda"). */
export default function LeadModal({ open, lead, funnelId, preset, onClose, onSave, onDelete }: LeadModalProps) {
  const { funnels } = useWorkspace();
  const { can } = useAuth();
  const [form, setForm] = useState<LeadFormState>(() => emptyLeadForm());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialog, setDialog] = useState<"contact" | "company" | "product" | "funnel" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const isNew = !lead;
  const lastStep = STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    const funnel = funnels.find((item) => item._id === funnelId) || funnels[0];
    setForm(lead ? leadToForm(lead) : { ...emptyLeadForm(funnel), contactId: preset?.contactId || "", companyId: preset?.companyId || "" });
    setConfirmDelete(false);
    setError("");
    setStep(0);
    void Promise.all([resources.contacts.list(), resources.companies.list(), resources.products.list()])
      .then(([contactList, companyList, productList]) => {
        setContacts(contactList);
        setCompanies(companyList);
        setProducts(productList);
      })
      .catch(() => undefined);
    // Os funis vêm do contexto; só recarrega o formulário ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead, funnelId]);

  const funnel = funnels.find((item) => item._id === form.funnelId);
  const set = <K extends keyof LeadFormState>(key: K, value: LeadFormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  function pickContact(contactId: string) {
    const contact = contacts.find((item) => item._id === contactId);
    setForm((current) => ({
      ...current,
      contactId,
      // Herda a empresa do contato quando ainda não há uma escolhida.
      companyId: current.companyId || contact?.companyId || "",
    }));
  }

  function pickFunnel(id: string) {
    if (id === ADD_FUNNEL) {
      setDialog("funnel");
      return;
    }
    const next = funnels.find((item) => item._id === id);
    setForm((current) => ({ ...current, funnelId: id, stageId: next ? firstOpenStageId(next) : "" }));
  }

  function addProduct(productId: string) {
    const product = products.find((item) => item._id === productId);
    if (!product) return;
    set("products", [...form.products, { productId: product._id, name: product.name, price: productPrice(product) }]);
  }

  function clientError() {
    return !form.contactId && !form.companyId && !form.name.trim() ? "Escolha ou cadastre o contato (ou dê um nome à negociação)." : "";
  }

  function next() {
    if (step === 0 && clientError()) {
      setError(clientError());
      return;
    }
    setError("");
    setStep((current) => Math.min(lastStep, current + 1));
  }

  async function handleSave() {
    if (clientError()) {
      setError(clientError());
      setStep(0);
      return;
    }
    if (!form.funnelId) {
      setError("Escolha o funil.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar a negociação."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!lead || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsSaving(true);
    try {
      await onDelete(lead);
    } catch (err) {
      setError(apiError(err, "Não foi possível excluir a negociação."));
    } finally {
      setIsSaving(false);
    }
  }

  const contactName = contacts.find((item) => item._id === form.contactId)?.name || "";

  const clientFields = (
      <>
          <Field label="Contato *" group>
            <EntityPicker
              items={contacts.map((contact) => ({ id: contact._id, label: contact.name, sublabel: contact.phone || contact.email, image: contact.photo }))}
              value={form.contactId}
              onChange={pickContact}
              placeholder="Buscar contato"
              addLabel="+ Novo"
              onAdd={() => setDialog("contact")}
            />
          </Field>
          <Field label="Empresa" group>
            <EntityPicker
              items={companies.map((company) => ({ id: company._id, label: company.name, sublabel: company.taxId, image: company.logo }))}
              value={form.companyId}
              onChange={(companyId) => set("companyId", companyId)}
              placeholder="Sem empresa"
              square
              addLabel="+ Nova"
              onAdd={() => setDialog("company")}
            />
          </Field>
          <Field label="Nome da negociação" full hint="Opcional. Sem nome, a negociação usa o nome do contato.">
            <input
              className="input-search"
              value={form.name}
              placeholder={contactName ? `Ex.: ${contactName} — vídeo institucional` : "Ex.: Vídeo institucional"}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
      </>
  );
  const valueFields = (
      <>
          <Field label="Serviço de interesse">
            <OptionSelect list="leadService" value={form.service} emptyLabel="Não informado" onChange={(service) => set("service", service)} />
          </Field>
          <div className="rounded-xl border border-charcoal/10 p-4 sm:col-span-2">
            <p className="text-[13px] font-semibold text-charcoal">Valor da negociação</p>
            <p className="mb-3 text-xs text-charcoal/50">Vincule produtos cadastrados, informe um valor avulso ou os dois.</p>
            <EntityPicker
              items={products.map((product) => ({
                id: product._id,
                label: product.name,
                sublabel: [formatCurrencyBRL(productPrice(product)), product.description].filter(Boolean).join(" · "),
              }))}
              value=""
              onChange={addProduct}
              placeholder="Adicionar produto"
              showAvatar={false}
              addLabel="+ Novo produto"
              onAdd={() => setDialog("product")}
            />
            {form.products.length ? (
              <ul className="mt-3 divide-y divide-charcoal/[0.06] rounded-lg border border-charcoal/[0.08]">
                {form.products.map((item, index) => (
                  <li key={`${item.productId}-${index}`} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-charcoal">{item.name}</span>
                    <div className="w-40">
                      <MoneyInput
                        value={item.price ? maskCurrencyBRL(item.price) : ""}
                        onChange={(value) =>
                          set(
                            "products",
                            form.products.map((product, i) => (i === index ? { ...product, price: parseCurrencyBRL(value) } : product)),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-ghost h-8 w-8 hover:text-burgundy"
                      aria-label="Remover produto"
                      onClick={() => set("products", form.products.filter((_, i) => i !== index))}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 grid items-end gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-charcoal/70">Valor avulso</span>
                <MoneyInput value={form.customValue} onChange={(value) => set("customValue", value)} />
              </label>
              <p className="text-right text-sm text-charcoal/60">
                Total <strong className="ml-1 text-lg text-charcoal">{formatCurrencyBRL(formTotal(form))}</strong>
              </p>
            </div>
          </div>

      </>
  );
  const funnelFields = (
      <>
          <Field label="Funil">
            <Select
              value={form.funnelId}
              onChange={pickFunnel}
              options={[
                ...funnels.map((item) => ({ value: item._id, label: item.name })),
                ...(can("configuracoes") ? [{ value: ADD_FUNNEL, label: "+ Criar novo funil" }] : []),
              ]}
            />
          </Field>
          <Field label="Etapa">
            <Select
              value={form.stageId}
              onChange={(stageId) => set("stageId", stageId)}
              options={(funnel?.stages || []).map((stage) => ({ value: stage._id, label: stage.name }))}
            />
          </Field>
          <Field label="Origem / como chegou">
            <OptionSelect list="leadSource" value={form.source} emptyLabel="Não informada" onChange={(source) => set("source", source)} />
          </Field>

      </>
  );
  const detailFields = (
      <>
          <Field label="Termômetro" group>
            <TemperaturePicker value={form.temperature} onChange={(temperature) => set("temperature", temperature)} />
          </Field>
          <Field label="Próxima ação">
            <input type="date" className="input-search" value={form.nextActionDate} onChange={(e) => set("nextActionDate", e.target.value)} />
          </Field>
          <CustomFieldsInputs entity="lead" value={form.custom} onChange={(custom) => set("custom", custom)} />
          <Field label="Observações" full>
            <textarea
              className="input-search min-h-[88px] resize-y"
              value={form.notes}
              placeholder="O que foi conversado, próximos passos, detalhes do projeto..."
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
      </>
  );
  const previewTotal = formTotal(form);
  const previewCompany = companies.find((item) => item._id === form.companyId)?.name || "";
  const previewStage = funnel?.stages.find((item) => item._id === form.stageId)?.name || "";


  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size={isNew ? "xl" : "lg"}
        title={lead ? "Editar negociação" : "Nova negociação"}
        description={isNew ? `Etapa ${step + 1} de ${STEPS.length} · ${STEPS[step].description}` : "Cadastre o contato, o funil e o que está sendo vendido."}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div>
              {isNew ? (
                <ol className="flex items-center gap-2" aria-label="Etapas">
                  {STEPS.map((item, index) => (
                    <li key={item.title} className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`flex items-center gap-1.5 text-xs font-semibold transition ${
                          index === step ? "text-charcoal" : index < step ? "text-tan hover:underline" : "text-charcoal/35"
                        }`}
                        disabled={index > step}
                        aria-current={index === step ? "step" : undefined}
                        onClick={() => setStep(index)}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                            index === step ? "bg-charcoal text-white" : index < step ? "bg-tan/15 text-tan" : "bg-charcoal/[0.06]"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="hidden sm:inline">{item.title}</span>
                      </button>
                      {index < lastStep ? <span className="h-px w-4 bg-charcoal/15" aria-hidden /> : null}
                    </li>
                  ))}
                </ol>
              ) : null}
              {lead && onDelete ? (
                <button type="button" className={confirmDelete ? "btn-danger" : "btn-secondary text-burgundy"} onClick={handleDelete} disabled={isSaving}>
                  {confirmDelete ? "Confirmar exclusão" : "Excluir"}
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              {isNew && step > 0 ? (
                <button type="button" className="btn-secondary" onClick={() => setStep((current) => current - 1)} disabled={isSaving}>
                  Voltar
                </button>
              ) : (
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                  Cancelar
                </button>
              )}
              {isNew && step < lastStep ? (
                <button type="button" className="btn-primary" onClick={next}>
                  Próximo
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
                  {isSaving ? "Salvando..." : lead ? "Salvar" : "Criar negociação"}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className={isNew ? "grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]" : ""}>
        <form
          key={isNew ? step : "edit"}
          className={`grid content-start gap-4 pt-1 sm:grid-cols-2 ${isNew ? "noma-page-enter" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            if (isNew && step < lastStep) next();
            else void handleSave();
          }}
        >
          {!isNew || step === 0 ? clientFields : null}
          {!isNew ? funnelFields : null}
          {!isNew || step === 1 ? valueFields : null}
          {isNew && step === 2 ? funnelFields : null}
          {!isNew || step === 2 ? detailFields : null}
          {error ? <p className="text-sm font-medium text-burgundy sm:col-span-2">{error}</p> : null}
          <button type="submit" className="hidden" aria-hidden />
        </form>
        {isNew ? (
          <aside className="hidden self-start rounded-2xl bg-beige p-4 md:block" aria-label="Prévia no funil">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
              Prévia no funil{previewStage ? ` · ${previewStage}` : ""}
            </p>
            <div className="rounded-lg border border-charcoal/[0.08] bg-white p-3.5 shadow-soft">
              <p className="truncate text-sm font-semibold text-charcoal">{form.name.trim() || contactName || previewCompany || "Nova negociação"}</p>
              <p className="truncate text-xs text-charcoal/55">
                {[contactName, previewCompany].filter(Boolean).join(" · ") || "Sem contato vinculado"}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums text-charcoal">{formatCurrencyBRL(previewTotal)}</span>
                <TemperatureBadge value={form.temperature} />
              </div>
              {form.products.length ? (
                <p className="mt-2 truncate text-xs text-charcoal/50">{form.products.map((item) => item.name).join(", ")}</p>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-charcoal/50">É assim que a negociação vai aparecer no quadro do funil.</p>
          </aside>
        ) : null}
        </div>
      </Modal>

      <ContactForm
        open={dialog === "contact"}
        contact={null}
        initial={{ kinds: ["lead"], companyId: form.companyId }}
        onClose={() => setDialog(null)}
        onSaved={(contact) => {
          setContacts((current) => [...current, contact].sort((a, b) => a.name.localeCompare(b.name)));
          setForm((current) => ({ ...current, contactId: contact._id, companyId: current.companyId || contact.companyId || "" }));
          if (contact.companyId && !companies.some((item) => item._id === contact.companyId)) {
            void resources.companies.list().then(setCompanies);
          }
          setDialog(null);
        }}
      />
      <CompanyForm
        open={dialog === "company"}
        company={null}
        initial={{ kinds: ["lead"] }}
        onClose={() => setDialog(null)}
        onSaved={(company) => {
          setCompanies((current) => [...current, company].sort((a, b) => a.name.localeCompare(b.name)));
          set("companyId", company._id);
          setDialog(null);
        }}
      />
      <ProductForm
        open={dialog === "product"}
        product={null}
        onClose={() => setDialog(null)}
        onSaved={(product) => {
          setProducts((current) => [...current, product]);
          setForm((current) => ({
            ...current,
            products: [...current.products, { productId: product._id, name: product.name, price: productPrice(product) }],
          }));
          setDialog(null);
        }}
      />
      <QuickAddDialog open={dialog === "funnel"} title="Configurações · Novo funil" onClose={() => setDialog(null)}>
        <FunnelEditor
          funnel={null}
          onSaved={(saved) => {
            setForm((current) => ({ ...current, funnelId: saved._id, stageId: firstOpenStageId(saved) }));
            setDialog(null);
          }}
        />
      </QuickAddDialog>
    </>
  );
}
