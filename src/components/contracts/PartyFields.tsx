import Field from "@/components/tools/Field";
import type { ContractParty } from "@/lib/contracts/model";

interface PartyFieldsProps {
  value: ContractParty;
  onChange: (patch: Partial<ContractParty>) => void;
}

/** Campos de qualificação de uma parte (nome, documento, endereço...). */
export default function PartyFields({ value, onChange }: PartyFieldsProps) {
  const input = (key: keyof ContractParty, placeholder: string, type = "text") => (
    <input
      className="input-search"
      type={type}
      value={value[key]}
      placeholder={placeholder}
      onChange={(event) => onChange({ [key]: event.target.value })}
    />
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome / Razão social">{input("name", "Nome completo ou razão social")}</Field>
      <Field label="CPF / CNPJ">{input("document", "000.000.000-00")}</Field>
      <Field label="Endereço" full>
        {input("address", "Rua, número, complemento e bairro")}
      </Field>
      <Field label="Cidade">{input("city", "Cidade")}</Field>
      <Field label="Estado">{input("state", "UF")}</Field>
      <Field label="Representante" hint="Para empresas: quem assina em nome dela. Deixe vazio para pessoa física.">
        {input("representative", "Nome do representante legal")}
      </Field>
      <Field label="E-mail">{input("email", "email@exemplo.com", "email")}</Field>
    </div>
  );
}
