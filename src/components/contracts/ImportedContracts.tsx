import { useMemo, useRef, useState } from "react";
import { HiOutlineArrowDownTray, HiOutlineTrash } from "react-icons/hi2";
import EntityPicker from "@/components/base/EntityPicker";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { downloadStoredFile, formatBytes, MAX_FILE_BYTES, uploadFile } from "@/lib/files";
import { resources } from "@/lib/resources";
import { formatDate } from "@/utils/format";

const ACCEPT = ".pdf,.doc,.docx,.odt,.txt,.png,.jpg,.jpeg";

/** Contratos avulsos importados (PDF, Word...), com vínculo opcional ao cliente da base. */
export default function ImportedContracts({ ownerId }: { ownerId: string }) {
  const { isAdmin } = useAuth();
  const { data, isLoading, error, reload } = useAsyncData(() => resources.files.list({ category: "contract", ownerId }), [ownerId]);
  const people = useAsyncData(() => Promise.all([resources.contacts.list(), resources.companies.list()]));
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");

  const clientItems = useMemo(() => {
    const [contacts = [], companies = []] = people.data || [];
    return [
      ...companies.map((company) => ({ id: `company:${company._id}`, label: company.name, sublabel: "Empresa", image: company.logo })),
      ...contacts.map((contact) => ({ id: `contact:${contact._id}`, label: contact.name, sublabel: "Contato", image: contact.photo })),
    ];
  }, [people.data]);
  const clientName = (companyId?: string, contactId?: string) =>
    clientItems.find((item) => item.id === (companyId ? `company:${companyId}` : `contact:${contactId}`))?.label || "";

  function pick(selected?: File) {
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      setStatus("O arquivo precisa ter até 25 MB.");
      return;
    }
    setStatus("");
    setFile(selected);
    setTitle(selected.name.replace(/\.[^.]+$/, ""));
    setClientRef("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setProgress(0);
    setStatus("");
    try {
      await uploadFile(
        file,
        {
          category: "contract",
          title: title.trim(),
          contactId: clientRef.startsWith("contact:") ? clientRef.slice(8) : undefined,
          companyId: clientRef.startsWith("company:") ? clientRef.slice(8) : undefined,
        },
        setProgress,
      );
      setFile(null);
      await reload();
    } catch (err) {
      setStatus(err instanceof Error && !("response" in err) ? err.message : apiError(err, "Não foi possível enviar o arquivo."));
    } finally {
      setProgress(null);
    }
  }

  async function handleDownload(id: string) {
    const item = data?.find((stored) => stored._id === id);
    if (!item) return;
    setBusyId(id);
    try {
      await downloadStoredFile(item);
    } catch (err) {
      setStatus(apiError(err, "Não foi possível baixar o arquivo."));
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Excluir o contrato "${name}"?`)) return;
    await resources.files.remove(id);
    await reload();
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal">Contratos importados</h2>
          <p className="text-sm text-charcoal/55">Guarde contratos avulsos já assinados ou feitos fora do gerador (PDF, Word, imagem · até 25 MB).</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
          Importar contrato
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(event) => pick(event.target.files?.[0])} />
      </div>
      {status || error ? <p className="mb-3 text-sm text-burgundy">{status || error}</p> : null}
      {isLoading ? (
        <div className="skeleton h-14" />
      ) : !data?.length ? (
        <p className="text-sm text-charcoal/55">Nenhum contrato importado ainda.</p>
      ) : (
        <ul className="divide-y divide-charcoal/[0.08]">
          {data.map((item) => (
            <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal">{item.title || item.name}</p>
                <p className="text-xs text-charcoal/50">
                  {[clientName(item.companyId, item.contactId), item.name, formatBytes(item.size), `enviado ${formatDate(item.createdAt)}`, isAdmin ? item.ownerName : ""]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn-secondary !py-1.5"
                  disabled={busyId === item._id}
                  onClick={() => void handleDownload(item._id)}
                >
                  <HiOutlineArrowDownTray className="h-4 w-4" /> {busyId === item._id ? "Baixando..." : "Baixar"}
                </button>
                <button type="button" className="btn-ghost h-9 w-9 hover:text-burgundy" aria-label="Excluir" onClick={() => void handleDelete(item._id, item.title || item.name)}>
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(file)}
        onClose={() => (progress === null ? setFile(null) : undefined)}
        title="Importar contrato"
        description={file ? `${file.name} · ${formatBytes(file.size)}` : ""}
        footer={
          <>
            <button type="button" className="btn-secondary" disabled={progress !== null} onClick={() => setFile(null)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={progress !== null} onClick={() => void handleUpload()}>
              {progress !== null ? `Enviando ${Math.round(progress * 100)}%` : "Enviar"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 pt-1">
          <Field label="Título">
            <input className="input-search" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Cliente da base (opcional)" group hint="O contrato aparece no perfil do cliente.">
            <EntityPicker items={clientItems} value={clientRef} onChange={setClientRef} placeholder="Sem vínculo" />
          </Field>
          {status ? <p className="text-sm text-burgundy">{status}</p> : null}
        </div>
      </Modal>
    </section>
  );
}
