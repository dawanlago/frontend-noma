import { useEffect, useState } from "react";
import CustomFieldsInputs from "@/components/options/CustomFieldsInputs";
import OptionChips from "@/components/options/OptionChips";
import OptionSelect from "@/components/options/OptionSelect";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Company } from "@/types";
import { maskCnpj, maskPhone } from "@/utils/format";
import AffinityStars from "./AffinityStars";
import ImageInput from "./ImageInput";

type CompanyDraft = Omit<Company, "_id" | "createdAt" | "updatedAt" | "contactsCount">;

export function emptyCompany(): CompanyDraft {
  return {
    name: "",
    taxId: "",
    logo: "",
    niche: "",
    email: "",
    phone: "",
    instagram: "",
    website: "",
    affinity: 0,
    kinds: [],
    supplierCategory: "",
    notes: "",
    custom: {},
    isActive: true,
  };
}

interface CompanyFormProps {
  open: boolean;
  company: Company | null;
  initial?: Partial<CompanyDraft>;
  onClose: () => void;
  onSaved: (company: Company) => void;
}

/** Cadastro da empresa (logomarca, CNPJ, nicho, afinidade...). */
export default function CompanyForm({ open, company, initial, onClose, onSaved }: CompanyFormProps) {
  const [form, setForm] = useState<CompanyDraft>(emptyCompany);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(company ? { ...emptyCompany(), ...company } : { ...emptyCompany(), ...initial });
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company]);

  const set = <K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const isSupplier = form.kinds.some((kind) => kind === "supplier" || kind === "partner");

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const saved = company ? await resources.companies.update(company._id, form) : await resources.companies.create(form);
      onSaved(saved);
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar a empresa."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={company ? "Editar empresa" : "Nova empresa"}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar empresa"}
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
          <ImageInput value={form.logo} onChange={(logo) => set("logo", logo)} name={form.name} label="Logomarca" rounded={false} />
        </div>
        <Field label="Nome *">
          <input className="input-search" value={form.name} autoFocus onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="CNPJ">
          <input className="input-search" value={form.taxId} placeholder="00.000.000/0000-00" onChange={(e) => set("taxId", maskCnpj(e.target.value))} />
        </Field>
        <Field label="E-mail">
          <input className="input-search" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Telefone">
          <input className="input-search" value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} />
        </Field>
        <Field label="Instagram">
          <input className="input-search" value={form.instagram} placeholder="@perfil" onChange={(e) => set("instagram", e.target.value)} />
        </Field>
        <Field label="Site">
          <input className="input-search" value={form.website} placeholder="https://" onChange={(e) => set("website", e.target.value)} />
        </Field>
        <Field label="Nicho">
          <OptionSelect list="niche" value={form.niche} emptyLabel="Não informado" onChange={(niche) => set("niche", niche)} />
        </Field>
        <Field label="Afinidade" group>
          <AffinityStars value={form.affinity} onChange={(affinity) => set("affinity", affinity)} />
        </Field>
        <Field label="Tipo na base" full group>
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
        <CustomFieldsInputs entity="company" value={form.custom} onChange={(custom) => set("custom", custom)} />
        <Field label="Observações" full>
          <textarea className="input-search min-h-[80px] resize-y" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        {error ? <p className="text-sm font-medium text-burgundy sm:col-span-2">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}
