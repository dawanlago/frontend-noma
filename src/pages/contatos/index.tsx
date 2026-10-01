import { useState } from "react";
import BaseDirectory from "@/components/base/BaseDirectory";
import DuplicatesModal from "@/components/base/DuplicatesModal";

export default function ContactsPage() {
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  // Depois de mesclar, a lista é remontada para recarregar os contatos.
  const [version, setVersion] = useState(0);

  return (
    <>
      <BaseDirectory
        key={version}
        title="Base geral"
        description="Clientes, leads, fornecedores, parceiros e empresas num só lugar. Filtre por área para encontrar quem você precisa."
        extraActions={
          <button type="button" className="btn-secondary" onClick={() => setDuplicatesOpen(true)}>
            Possíveis duplicados
          </button>
        }
      />
      <DuplicatesModal open={duplicatesOpen} onClose={() => setDuplicatesOpen(false)} onMerged={() => setVersion((value) => value + 1)} />
    </>
  );
}
