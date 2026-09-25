import { useEffect, useState } from "react";
import CustomFieldsInputs from "@/components/options/CustomFieldsInputs";
import OptionChips from "@/components/options/OptionChips";
import OptionSelect from "@/components/options/OptionSelect";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Company, Contact } from "@/types";
import { maskCpf, maskPhone } from "@/utils/format";
import AffinityStars from "./AffinityStars";
import CompanyForm from "./CompanyForm";
import EntityPicker from "./EntityPicker";
import ImageInput from "./ImageInput";

type ContactDraft = Omit<Contact, "_id" | "createdAt" | "updatedAt">;

export function emptyContact(): ContactDraft {
  return {
    name: "",
    email: "",
    phone: "",
    cpf: "",
    birthDate: "",
    photo: "",
    niche: "",
    jobRole: "",
    instagram: "",
    companyId: "",
    affinity: 0,
    kinds: [],
    supplierCategory: "",
    notes: "",
    custom: {},
  };
}

interface ContactFormProps {
  open: boolean;
  contact: Contact | null;
  /** Valores iniciais para um contato novo (ex.: tipo "fornecedor"). */
  initial?: Partial<ContactDraft>;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}

/** Cadastro completo do perfil do contato. Também abre como atalho dentro de outros formulários. */
export default function ContactForm({ open, contact, initial, onClose, onSaved }: ContactFormProps) {
  const [form, setForm] = useState<ContactDraft>(emptyContact);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(contact ? { ...emptyContact(), ...contact } : { ...emptyContact(), ...initial });
    setError("");
    resources.companies.list().then(setCompanies).catch(() => setCompanies([]));
    // `initial` é recriado a cada render de quem chama; só importa na abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact]);

  const set = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const isSupplier = form.kinds.some((kind) => kind === "supplier" || kind === "partner");

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Informe o nome do contato.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const saved = contact ? await resources.contacts.update(contact._id, form) : await resources.contacts.create(form);
      onSaved(saved);
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar o contato."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Modal
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
            <ImageInput value={form.photo} onChange={(photo) => set("photo", photo)} name={form.name} label="Foto" />
          </div>
          <Field label="Nome *">
            <input className="input-search" value={form.name} autoFocus onChange={(e) => set("name", e.target.value)} />
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
          <Field label="Empresa" group>
            <EntityPicker
              items={companies.map((company) => ({ id: company._id, label: company.name, sublabel: company.taxId, image: company.logo }))}
              value={form.companyId || ""}
              onChange={(companyId) => set("companyId", companyId)}
              placeholder="Sem empresa"
              square
              addLabel="+ Nova"
              onAdd={() => setCompanyOpen(true)}
            />
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
          <CustomFieldsInputs entity="contact" value={form.custom} onChange={(custom) => set("custom", custom)} />
          <Field label="Observações" full>
            <textarea className="input-search min-h-[80px] resize-y" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          {error ? <p className="text-sm font-medium text-burgundy sm:col-span-2">{error}</p> : null}
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Modal>

      <CompanyForm
        open={companyOpen}
        company={null}
        onClose={() => setCompanyOpen(false)}
        onSaved={(company) => {
          setCompanies((current) => [...current, company].sort((a, b) => a.name.localeCompare(b.name)));
          set("companyId", company._id);
          setCompanyOpen(false);
        }}
      />
    </>
  );
}
