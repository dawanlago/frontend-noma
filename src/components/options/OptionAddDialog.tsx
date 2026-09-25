import QuickAddDialog from "./QuickAddDialog";
import OptionListEditor from "./OptionListEditor";
import { listInfo } from "@/lib/options";
import type { OptionItem } from "@/types";

interface OptionAddDialogProps {
  list: string | null;
  onClose: () => void;
  onCreated: (item: OptionItem) => void;
}

/** Cadastro da lista (o mesmo de Configurações → Listas de opções) aberto como atalho. */
export default function OptionAddDialog({ list, onClose, onCreated }: OptionAddDialogProps) {
  const info = list ? listInfo(list) : null;
  return (
    <QuickAddDialog
      open={Boolean(list)}
      onClose={onClose}
      title={info ? `Configurações · ${info.title}` : ""}
      description="Cadastre a nova opção. Ao adicionar, ela já fica selecionada e você volta ao formulário com tudo preenchido."
    >
      {list ? (
        <OptionListEditor
          list={list}
          autoFocus
          onCreated={(item) => {
            onCreated(item);
            onClose();
          }}
        />
      ) : null}
    </QuickAddDialog>
  );
}
