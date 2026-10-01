import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CustomFieldsInputs from "@/components/options/CustomFieldsInputs";
import OptionChips from "@/components/options/OptionChips";
import OptionSelect from "@/components/options/OptionSelect";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import { apiError } from "@/lib/errors";
import { duplicateOf, resources } from "@/lib/resources";
import type { Company, Contact, ContactDuplicate } from "@/types";
import { maskCpf, maskPhone } from "@/utils/format";
import AffinityStars from "./AffinityStars";
import CompanyForm from "./CompanyForm";
import ImageInput from "./ImageInput";

type ContactDraft = Omit<Contact, "_id" | "createdAt" | "updatedAt">;

export function emptyContact(): ContactDraft {
  return {
    name: "",
    fullName: "",
    nickname: "",
    email: "",
    phone: "",
    cpf: "",
    birthDate: "",
    photo: "",
    niche: "",
    jobRole: "",
    instagram: "",
    location: "",
    leadSource: "",
    companyId: "",
    companyIds: [],
    affinity: 0,
    kinds: [],
    supplierCategory: "",
    pixKey: "",
    notes: "",
    custom: {},
  };
}

interface ContactFormProps {
  open: boolean;
  contact: Contact | null;
  /** Valores iniciais para um contato novo (ex.: tipo "fornecedor"). */
  initial?: Partial<ContactDraft>;
  /**
   * Aberto como atalho dentro de outro formulário: se já existir um contato com o mesmo
   * telefone/e-mail, oferece "Usar este contato" (devolvido em `onSaved`).
   */
  allowReuse?: boolean;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}

/** Cadastro completo do perfil do contato. Também abre como atalho dentro de outros formulários. */
export default function ContactForm({ open, contact, initial, allowReuse, onClose, onSaved }: ContactFormProps) {
  const [form, setForm] = useState<ContactDraft>(emptyContact);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<ContactDuplicate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base: ContactDraft = contact ? { ...emptyContact(), ...contact } : { ...emptyContact(), ...initial };
    // Cadastros antigos e atalhos informam só a empresa principal.
    setForm({ ...base, companyIds: base.companyIds?.length ? base.companyIds : base.companyId ? [base.companyId] : [] });
    setError("");
    setDuplicate(null);
    resources.companies.list().then(setCompanies).catch(() => setCompanies([]));
    // `initial` é recriado a cada render de quem chama; só importa na abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact]);

  const set = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const isSupplier = form.kinds.some((kind) => kind === "supplier" || kind === "partner");

  const companyIds = form.companyIds || [];

  async function handleSave(allowDuplicate = false) {
    if (!form.name.trim()) {
      setError("Informe o nome do contato.");
      return;
    }
    setIsSaving(true);
    setError("");
    setDuplicate(null);
    try {
      // A lista de empresas é que vale; a principal (companyId) é a primeira dela.
      const payload = { ...form, companyId: undefined, companyIds, allowDuplicate };
      const saved = contact ? await resources.contacts.update(contact._id, payload) : await resources.contacts.create(payload);
      onSaved(saved);
    } catch (err) {
      const existing = duplicateOf(err);
      if (existing) setDuplicate(existing);
      else setError(apiError(err, "Não foi possível salvar o contato."));
    } finally {
      setIsSaving(false);
    }
  }

  async function pickExisting(id: string) {
    setIsSaving(true);
    try {
      onSaved(await resources.contacts.get(id));
    } catch (err) {
      setError(apiError(err, "Não foi possível abrir o contato existente."));
    } finally {
      setIsSaving(false);
    }
  }

  const duplicateField = duplicate?.field === "email" ? "e-mail" : "telefone";

  return (
    <>
      <Modal
        variant="drawer"
        open={open}
        onClose={onClose}
        size="lg"
        title={contact ? "Editar contato" : "Novo contato"}
        description="Perfil do cliente, fornecedor ou parceiro."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar contato"}
            </button>
          </>
        }
      >
        <form
          className="grid gap-4 pt-1 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="sm:col-span-2">
            <ImageInput value={form.photo} onChange={(photo) => set("photo", photo)} name={form.name} label="Foto" folder="contatos" />
          </div>
          <Field label="Nome *" hint="Como o contato aparece no sistema.">
            <input className="input-search" value={form.name} autoFocus onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Apelido">
            <input className="input-search" value={form.nickname || ""} onChange={(e) => set("nickname", e.target.value)} />
          </Field>
          <Field label="Nome completo" full>
            <input className="input-search" value={form.fullName || ""} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input className="input-search" value={form.phone} placeholder="(00) 00000-0000" onChange={(e) => set("phone", maskPhone(e.target.value))} />
          </Field>
          <Field label="E-mail">
            <input className="input-search" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Instagram">
            <input className="input-search" value={form.instagram} placeholder="@perfil" onChange={(e) => set("instagram", e.target.value)} />
          </Field>
          <Field label="CPF">
            <input className="input-search" value={form.cpf} placeholder="000.000.000-00" onChange={(e) => set("cpf", maskCpf(e.target.value))} />
          </Field>
          <Field label="Data de nascimento">
            <input className="input-search" type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
          </Field>
          <Field label="Localização">
            <input className="input-search" value={form.location || ""} placeholder="Cidade/UF" onChange={(e) => set("location", e.target.value)} />
          </Field>
          <Field label="Origem do lead">
            <OptionSelect list="leadSource" value={form.leadSource || ""} emptyLabel="Não informada" onChange={(leadSource) => set("leadSource", leadSource)} />
          </Field>
          <Field label="Empresas" full group hint="Um contato pode estar em mais de uma empresa. A primeira da lista é a principal.">
            <div className="flex gap-2">
              <Autocomplete
                multiple
                fullWidth
                size="small"
                options={companies}
                value={companyIds.map((id) => companies.find((company) => company._id === id)).filter((company): company is Company => Boolean(company))}
                onChange={(_, selected) => set("companyIds", selected.map((company) => company._id))}
                getOptionLabel={(company) => company.name}
                isOptionEqualToValue={(option, current) => option._id === current._id}
                noOptionsText="Nada encontrado"
                renderInput={(params) => <TextField {...params} placeholder={companyIds.length ? "" : "Sem empresa"} />}
              />
              <button type="button" className="btn-secondary shrink-0 self-start !px-3 !py-2 text-xs" onClick={() => setCompanyOpen(true)}>
                + Nova
              </button>
            </div>
          </Field>
          <Field label="Cargo">
            <OptionSelect list="jobRole" value={form.jobRole} emptyLabel="Não informado" onChange={(jobRole) => set("jobRole", jobRole)} />
          </Field>
          <Field label="Nicho">
            <OptionSelect list="niche" value={form.niche} emptyLabel="Não informado" onChange={(niche) => set("niche", niche)} />
          </Field>
          <Field label="Afinidade" group>
            <AffinityStars value={form.affinity} onChange={(affinity) => set("affinity", affinity)} />
          </Field>
          <Field label="Tipo na base" full group hint="Um contato pode ser cliente e parceiro ao mesmo tempo.">
            <OptionChips list="relationship" value={form.kinds} onChange={(kinds) => set("kinds", kinds)} />
          </Field>
          {isSupplier ? (
            <Field label="Categoria do fornecedor/parceiro">
              <OptionSelect
                list="supplierCategory"
                value={form.supplierCategory}
                emptyLabel="Não informada"
                onChange={(supplierCategory) => set("supplierCategory", supplierCategory)}
              />
            </Field>
          ) : null}
          {isSupplier ? (
            <Field label="Chave PIX" hint="Para pagar este fornecedor ou parceiro.">
              <input className="input-search" value={form.pixKey} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" onChange={(e) => set("pixKey", e.target.value)} />
            </Field>
          ) : null}
          <CustomFieldsInputs entity="contact" value={form.custom} onChange={(custom) => set("custom", custom)} />
          <Field label="Observações" full>
            <textarea className="input-search min-h-[80px] resize-y" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          {error ? <p className="text-sm font-medium text-burgundy sm:col-span-2">{error}</p> : null}
          {duplicate ? (
            <div className="rounded-lg border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 sm:col-span-2" role="alert">
              <p className="text-sm font-medium text-burgundy">
                Já existe um contato com este {duplicateField}: <strong>{duplicate.name}</strong>
              </p>
              <p className="mt-0.5 text-xs text-charcoal/60">{[duplicate.phone, duplicate.email].filter(Boolean).join(" · ")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {allowReuse ? (
                  <button type="button" className="btn-primary !py-1.5 text-xs" disabled={isSaving} onClick={() => void pickExisting(duplicate._id)}>
                    Usar este contato
                  </button>
                ) : null}
                <a href={`/contatos/${duplicate._id}`} target={allowReuse ? "_blank" : undefined} rel="noreferrer" className="btn-secondary !py-1.5 text-xs">
                  Abrir contato
                </a>
                <button type="button" className="btn-secondary !py-1.5 text-xs" disabled={isSaving} onClick={() => void handleSave(true)}>
                  Salvar mesmo assim
                </button>
              </div>
            </div>
          ) : null}
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Modal>

      <CompanyForm
        open={companyOpen}
        company={null}
        onClose={() => setCompanyOpen(false)}
        onSaved={(company) => {
          setCompanies((current) => [...current, company].sort((a, b) => a.name.localeCompare(b.name)));
          setForm((current) => ({ ...current, companyIds: [...(current.companyIds || []), company._id] }));
          setCompanyOpen(false);
        }}
      />
    </>
  );
}
