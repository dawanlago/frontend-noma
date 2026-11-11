import { useRef, useState } from "react";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import Field from "@/components/tools/Field";
import {
  CUSTOM_BLOCK_STYLES,
  IMAGE_QUALITY,
  SECTION_KEYS,
  SECTION_TITLES,
  STRUCTURE_MAX_WIDTH,
  customKey,
  newCustomBlock,
  sectionVisible,
  type CustomBlock,
  type CustomBlockStyle,
  type ProposalData,
  type SectionKey,
} from "@/lib/proposals/model";
import { uploadImage } from "@/lib/upload";
import { Callout, MoveControls, SmallIconButton, StringListEditor, TextArea, TextInput, move, type StepProps } from "./ui";

const STYLE_TITLES = Object.fromEntries(CUSTOM_BLOCK_STYLES.map((item) => [item.value, item.title])) as Record<CustomBlockStyle, string>;

const isSection = (key: string): key is SectionKey => (SECTION_KEYS as string[]).includes(key);

/** Liga/desliga uma seção (Estrutura e Experiência usam o próprio `enabled`, que também aparece na etapa delas). */
function setSectionVisible(data: ProposalData, key: SectionKey, visible: boolean): ProposalData {
  const others = data.layout.hidden.filter((item) => item !== key);
  if (key === "structure") return { ...data, structure: { ...data.structure, enabled: visible }, layout: { ...data.layout, hidden: others } };
  if (key === "experience") return { ...data, experience: { ...data.experience, enabled: visible }, layout: { ...data.layout, hidden: others } };
  return { ...data, layout: { ...data.layout, hidden: visible ? others : [...others, key] } };
}

interface LayoutStepProps extends StepProps {
  /** Mostra na prévia a página da seção/bloco (`company`, `custom:<id>`...). */
  onShow?: (key: string) => void;
}

/** Etapa "Páginas e blocos": ordem das páginas, quais aparecem e blocos livres (texto, destaque, lista, imagem). */
export default function LayoutStep({ data, setData, onShow }: LayoutStepProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const order = data.layout.order;
  const blocks = new Map(data.customBlocks.map((block) => [customKey(block.id), block]));

  const setOrder = (next: string[]) => setData((current) => ({ ...current, layout: { ...current.layout, order: next } }));

  function patchBlock(id: string, patch: Partial<CustomBlock>) {
    setData((current) => ({
      ...current,
      customBlocks: current.customBlocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    }));
  }

  function addBlock(style: CustomBlockStyle) {
    const block = newCustomBlock(style);
    const key = customKey(block.id);
    setData((current) => {
      const closing = current.layout.order.indexOf("closing");
      const nextOrder = current.layout.order.slice();
      nextOrder.splice(closing >= 0 ? closing : nextOrder.length, 0, key);
      return { ...current, customBlocks: [...current.customBlocks, block], layout: { ...current.layout, order: nextOrder } };
    });
    setEditing(key);
    // A prévia só tem a página depois do próximo render.
    window.setTimeout(() => onShow?.(key), 0);
  }

  function removeBlock(id: string) {
    const key = customKey(id);
    setData((current) => ({
      ...current,
      customBlocks: current.customBlocks.filter((block) => block.id !== id),
      layout: { ...current.layout, order: current.layout.order.filter((item) => item !== key) },
    }));
    if (editing === key) setEditing(null);
  }

  function drop(to: number) {
    if (dragFrom !== null && dragFrom !== to) setOrder(move(order, dragFrom, to));
    setDragFrom(null);
    setDragOver(null);
  }

  return (
    <div className="space-y-5">
      <Callout>
        Arraste (ou use as setas) para mudar a ordem, desligue o que não quiser mostrar e adicione blocos livres — textos,
        frases de destaque, listas ou imagens — em qualquer posição. A capa é sempre a primeira página.
      </Callout>

      <ol className="space-y-2">
        <li className="flex items-center gap-3 rounded-xl border border-charcoal/[0.08] bg-beige/50 px-3 py-2.5">
          <LockOutlined sx={{ fontSize: 18 }} className="text-charcoal/35" />
          <span className="flex-1 text-sm font-semibold text-charcoal/70">Capa</span>
          <span className="text-xs text-charcoal/45">Sempre a primeira</span>
        </li>
        {order.map((key, index) => {
          const block = blocks.get(key);
          const section = isSection(key) ? key : null;
          const visible = section ? sectionVisible(data, section) : true;
          const open = editing === key;
          return (
            <li
              key={key}
              draggable
              onDragStart={(event) => {
                setDragFrom(index);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(index);
              }}
              onDragLeave={() => setDragOver((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                drop(index);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              className={`rounded-xl border bg-surface transition ${
                dragOver === index && dragFrom !== index ? "border-tan shadow-soft" : "border-charcoal/10"
              } ${dragFrom === index ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3">
                <span className="cursor-grab text-charcoal/30 active:cursor-grabbing" title="Arraste para mover" aria-hidden>
                  <DragIndicatorRounded sx={{ fontSize: 20 }} />
                </span>
                <button
                  type="button"
                  className={`min-w-0 flex-1 text-left ${visible ? "" : "opacity-45"}`}
                  onClick={() => (block ? setEditing(open ? null : key) : onShow?.(key))}
                >
                  <span className="block truncate text-sm font-semibold text-charcoal">
                    {block ? block.title.trim() || block.kicker.trim() || "Bloco sem título" : SECTION_TITLES[section!]}
                  </span>
                  <span className="block text-xs text-charcoal/50">
                    {block ? `Bloco livre · ${STYLE_TITLES[block.style]}` : visible ? "Aparece na proposta" : "Oculta"}
                  </span>
                </button>
                {block ? (
                  <SmallIconButton label={open ? "Fechar edição" : "Editar bloco"} onClick={() => setEditing(open ? null : key)}>
                    <EditOutlined sx={{ fontSize: 17 }} />
                  </SmallIconButton>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    aria-label={`${visible ? "Ocultar" : "Mostrar"} ${SECTION_TITLES[section!]}`}
                    title={visible ? "Ocultar página" : "Mostrar página"}
                    onClick={() => setData((current) => setSectionVisible(current, section!, !visible))}
                    className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition ${visible ? "bg-tan" : "bg-charcoal/20"}`}
                  >
                    <span className={`absolute h-5 w-5 rounded-full bg-surface shadow transition-all ${visible ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                )}
                <MoveControls
                  index={index}
                  length={order.length}
                  onMove={(to) => setOrder(move(order, index, to))}
                  onRemove={block ? () => removeBlock(block.id) : undefined}
                  removeLabel="Excluir bloco"
                />
              </div>
              {block && open ? <BlockEditor block={block} onChange={(patch) => patchBlock(block.id, patch)} /> : null}
            </li>
          );
        })}
      </ol>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-charcoal">Adicionar bloco livre</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CUSTOM_BLOCK_STYLES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => addBlock(item.value)}
              disabled={data.customBlocks.length >= 30}
              className="rounded-xl border border-dashed border-tan/40 px-4 py-3 text-left transition hover:bg-tan/[0.05] disabled:opacity-50"
            >
              <span className="block text-sm font-semibold text-tan">+ {item.title}</span>
              <span className="mt-0.5 block text-xs text-charcoal/55">{item.description}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-charcoal/45">O bloco entra antes do fechamento; depois é só arrastar para onde quiser.</p>
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: CustomBlock; onChange: (patch: Partial<CustomBlock>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange({ image: await uploadImage(file, "propostas", STRUCTURE_MAX_WIDTH, IMAGE_QUALITY) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a imagem.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4 border-t border-charcoal/[0.08] px-3 pb-4 pt-4 sm:px-4">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de bloco">
        {CUSTOM_BLOCK_STYLES.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={block.style === item.value}
            onClick={() => onChange({ style: item.value })}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              block.style === item.value ? "border-tan bg-tan text-white" : "border-charcoal/10 text-charcoal/60 hover:border-charcoal/25"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>
      {block.style !== "highlight" ? (
        <Field label="Texto pequeno acima do título" hint="Opcional. Ex.: Metodologia, Etapas, Bastidores.">
          <TextInput value={block.kicker} onChange={(kicker) => onChange({ kicker })} maxLength={60} />
        </Field>
      ) : null}
      <Field label={block.style === "highlight" ? "Frase de destaque" : "Título"}>
        {block.style === "highlight" ? (
          <TextArea value={block.title} onChange={(title) => onChange({ title })} rows={3} />
        ) : (
          <TextInput value={block.title} onChange={(title) => onChange({ title })} maxLength={120} />
        )}
      </Field>
      {block.style === "list" ? (
        <Field label="Itens">
          <StringListEditor items={block.items} onChange={(items) => onChange({ items })} max={12} />
        </Field>
      ) : null}
      {block.style === "image" ? (
        <Field label="Imagem">
          <div className="flex flex-wrap items-center gap-3">
            {block.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.image} alt="" className="h-20 w-32 rounded-lg object-cover" />
            ) : null}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
              <CloudUploadOutlined sx={{ fontSize: 18 }} />
              {busy ? "Enviando…" : block.image ? "Trocar imagem" : "Enviar imagem"}
            </button>
            {block.image ? (
              <button type="button" className="text-xs font-semibold text-burgundy hover:underline" onClick={() => onChange({ image: "" })}>
                Remover
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-2 text-xs text-burgundy">{error}</p> : null}
        </Field>
      ) : null}
      <Field
        label={block.style === "highlight" ? "Assinatura" : block.style === "text" ? "Texto" : "Texto de apoio"}
        hint={block.style === "text" ? "Deixe uma linha em branco para separar parágrafos." : block.style === "highlight" ? "Ex.: Nome · Empresa." : "Opcional."}
      >
        <TextArea value={block.text} onChange={(text) => onChange({ text })} rows={block.style === "text" ? 6 : 2} />
      </Field>
    </div>
  );
}
