import BaseDirectory from "@/components/base/BaseDirectory";

export default function SuppliersPage() {
  return (
    <BaseDirectory
      title="Fornecedores e parceiros"
      description="Editores, filmmakers, locações, estúdios e parceiros da produtora, organizados por categoria."
      kinds={["supplier", "partner"]}
      newKinds={["supplier"]}
      showCategory
    />
  );
}
