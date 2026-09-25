import BaseDirectory from "@/components/base/BaseDirectory";

export default function CompaniesPage() {
  return (
    <BaseDirectory
      title="Empresas"
      description="Empresas da base, com os contatos vinculados e o histórico de vendas."
      initialType="company"
      hideTypeTabs
    />
  );
}
