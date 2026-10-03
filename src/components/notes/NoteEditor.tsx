import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import {
  LuBold,
  LuCode,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuItalic,
  LuLink,
  LuList,
  LuListChecks,
  LuListOrdered,
  LuMinus,
  LuPilcrow,
  LuSquareCode,
  LuStrikethrough,
  LuTextQuote,
} from "react-icons/lu";
import styles from "./NoteEditor.module.css";

/*
 * Editor das anotações (estilo Notion) que lê e grava Markdown.
 * Quebras de linha simples viram quebras de verdade, então as anotações antigas
 * (texto puro) abrem como estavam. "/" no começo de uma linha abre o menu de blocos.
 * Só roda no navegador: a página carrega com next/dynamic (ssr: false).
 */

export interface NoteEditorProps {
  /** Markdown inicial; para trocar de conteúdo, troque a `key` do componente. */
  content: string;
  editable: boolean;
  onChange: (markdown: string) => void;
  /** Ao sair do editor (salva na hora o que estiver pendente). */
  onBlur?: () => void;
}

interface Block {
  key: string;
  label: string;
  hint: string;
  icon: ReactNode;
  /** Palavras para a busca do menu "/". */
  terms: string;
  run: (editor: Editor) => void;
}

const BLOCKS: Block[] = [
  { key: "p", label: "Texto", hint: "Parágrafo comum", icon: <LuPilcrow />, terms: "texto paragrafo", run: (e) => e.chain().setParagraph().run() },
  { key: "h1", label: "Título 1", hint: "Título grande", icon: <LuHeading1 />, terms: "titulo 1 h1 heading", run: (e) => e.chain().setHeading({ level: 1 }).run() },
  { key: "h2", label: "Título 2", hint: "Título médio", icon: <LuHeading2 />, terms: "titulo 2 h2 subtitulo", run: (e) => e.chain().setHeading({ level: 2 }).run() },
  { key: "h3", label: "Título 3", hint: "Título pequeno", icon: <LuHeading3 />, terms: "titulo 3 h3", run: (e) => e.chain().setHeading({ level: 3 }).run() },
  { key: "ul", label: "Lista", hint: "Lista com marcadores", icon: <LuList />, terms: "lista marcadores bullet", run: (e) => e.chain().toggleBulletList().run() },
  { key: "ol", label: "Lista numerada", hint: "1, 2, 3...", icon: <LuListOrdered />, terms: "lista numerada numeros ordenada", run: (e) => e.chain().toggleOrderedList().run() },
  { key: "task", label: "Checklist", hint: "Tarefas com caixa de seleção", icon: <LuListChecks />, terms: "checklist tarefas todo caixa", run: (e) => e.chain().toggleTaskList().run() },
  { key: "quote", label: "Citação", hint: "Destaque um trecho", icon: <LuTextQuote />, terms: "citacao quote destaque", run: (e) => e.chain().toggleBlockquote().run() },
  { key: "code", label: "Código", hint: "Bloco de código", icon: <LuSquareCode />, terms: "codigo code bloco", run: (e) => e.chain().toggleCodeBlock().run() },
  { key: "hr", label: "Divisória", hint: "Linha horizontal", icon: <LuMinus />, terms: "divisoria linha separador hr", run: (e) => e.chain().setHorizontalRule().run() },
];

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface SlashState {
  from: number;
  to: number;
  query: string;
  top: number;
  left: number;
}

/** "/termo" logo antes do cursor (no começo da linha ou depois de um espaço). */
function findSlash(editor: Editor, wrapper: HTMLElement | null): SlashState | null {
  const { selection } = editor.state;
  const { $from, empty } = selection;
  if (!empty || !wrapper || $from.parent.type.spec.code) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const match = /(?:^|\s)\/([\p{L}\d]{0,20})$/u.exec(before);
  if (!match) return null;
  const coords = editor.view.coordsAtPos($from.pos);
  const box = wrapper.getBoundingClientRect();
  return {
    from: $from.pos - match[1].length - 1,
    to: $from.pos,
    query: match[1],
    top: coords.bottom - box.top + 6,
    left: Math.max(0, Math.min(coords.left - box.left, box.width - 260)),
  };
}

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-[15px] transition ${
        active ? "bg-ink text-surface" : "text-charcoal/60 hover:bg-beige hover:text-charcoal"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      strike: current.isActive("strike"),
      code: current.isActive("code"),
      h1: current.isActive("heading", { level: 1 }),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      ul: current.isActive("bulletList"),
      ol: current.isActive("orderedList"),
      task: current.isActive("taskList"),
      quote: current.isActive("blockquote"),
      codeBlock: current.isActive("codeBlock"),
      link: current.isActive("link"),
    }),
  });
  const chain = () => editor.chain().focus();

  function openLink() {
    setHref((editor.getAttributes("link").href as string | undefined) || "");
    setLinkOpen(true);
  }

  function applyLink() {
    const value = href.trim();
    if (!value) chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: /^(https?:|mailto:|tel:|\/)/i.test(value) ? value : `https://${value}` }).run();
    setLinkOpen(false);
  }

  return (
    <div className="sticky top-0 z-10 -mx-2 mb-3 flex flex-wrap items-center gap-0.5 rounded-xl border border-charcoal/[0.06] bg-surface px-1.5 py-1">
      <ToolButton label="Título 1" active={state.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        <LuHeading1 />
      </ToolButton>
      <ToolButton label="Título 2" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <LuHeading2 />
      </ToolButton>
      <ToolButton label="Título 3" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <LuHeading3 />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-charcoal/10" />
      <ToolButton label="Negrito (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <LuBold />
      </ToolButton>
      <ToolButton label="Itálico (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <LuItalic />
      </ToolButton>
      <ToolButton label="Riscado" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <LuStrikethrough />
      </ToolButton>
      <ToolButton label="Código" active={state.code} onClick={() => chain().toggleCode().run()}>
        <LuCode />
      </ToolButton>
      <ToolButton label="Link" active={state.link || linkOpen} onClick={() => (linkOpen ? setLinkOpen(false) : openLink())}>
        <LuLink />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-charcoal/10" />
      <ToolButton label="Lista" active={state.ul} onClick={() => chain().toggleBulletList().run()}>
        <LuList />
      </ToolButton>
      <ToolButton label="Lista numerada" active={state.ol} onClick={() => chain().toggleOrderedList().run()}>
        <LuListOrdered />
      </ToolButton>
      <ToolButton label="Checklist" active={state.task} onClick={() => chain().toggleTaskList().run()}>
        <LuListChecks />
      </ToolButton>
      <ToolButton label="Citação" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <LuTextQuote />
      </ToolButton>
      <ToolButton label="Bloco de código" active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
        <LuSquareCode />
      </ToolButton>
      <ToolButton label="Divisória" onClick={() => chain().setHorizontalRule().run()}>
        <LuMinus />
      </ToolButton>
      {linkOpen ? (
        <form
          className="flex w-full items-center gap-2 px-1 pb-1 pt-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <input
            className="input-search !py-1.5"
            autoFocus
            value={href}
            placeholder="Cole o endereço (vazio remove o link)"
            onChange={(event) => setHref(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setLinkOpen(false);
            }}
          />
          <button type="submit" className="btn-secondary shrink-0 !py-1.5">
            Aplicar
          </button>
        </form>
      ) : null}
    </div>
  );
}

export default function NoteEditor({ content, editable, onChange, onBlur }: NoteEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  /** Posição do "/" que foi dispensado com Esc (não reabre até digitar outro). */
  const dismissedRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const items = useMemo(() => {
    if (!slash) return [];
    const query = normalize(slash.query);
    return BLOCKS.filter((block) => !query || normalize(`${block.label} ${block.terms}`).includes(query));
  }, [slash]);

  // O teclado do editor consulta o menu por ref (os handlers são criados uma vez só).
  const menuRef = useRef({ slash, items, activeIndex });
  menuRef.current = { slash, items, activeIndex };

  function refreshSlash(editor: Editor) {
    const next = findSlash(editor, wrapperRef.current);
    if (next && dismissedRef.current === next.from) return setSlash(null);
    if (!next) dismissedRef.current = null;
    const current = menuRef.current.slash;
    if (next && (!current || current.query !== next.query)) setActiveIndex(0);
    setSlash(next);
  }

  function insertBlock(editor: Editor, block: Block) {
    const current = menuRef.current.slash;
    if (!current) return;
    editor.chain().focus().deleteRange({ from: current.from, to: current.to }).run();
    block.run(editor);
    editor.commands.focus();
    setSlash(null);
  }

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    content,
    contentType: "markdown",
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Escreva livremente... digite "/" para inserir títulos, listas, checklist e mais.' }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
    ],
    editorProps: {
      attributes: { class: "focus:outline-none" },
      handleKeyDown: (_view, event) => {
        const { slash: open, items: list, activeIndex: index } = menuRef.current;
        if (!open || !list.length) return false;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          setActiveIndex((index + delta + list.length) % list.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          if (editorRef.current) insertBlock(editorRef.current, list[index] || list[0]);
          return true;
        }
        if (event.key === "Escape") {
          dismissedRef.current = open.from;
          setSlash(null);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current(current.getMarkdown());
      refreshSlash(current);
    },
    onSelectionUpdate: ({ editor: current }) => refreshSlash(current),
    onBlur: () => {
      // Dá tempo de clicar numa opção do menu antes de fechar.
      window.setTimeout(() => setSlash(null), 150);
      onBlurRef.current?.();
    },
  });
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return <div className="skeleton min-h-[420px] flex-1" />;

  return (
    <div ref={wrapperRef} className="relative flex flex-1 flex-col">
      {editable ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} className={`${styles.content} flex-1`} />
      {slash && items.length ? (
        <div
          role="listbox"
          aria-label="Inserir bloco"
          className="absolute z-20 max-h-72 w-64 overflow-y-auto rounded-xl border border-charcoal/10 bg-surface p-1 shadow-soft"
          style={{ top: slash.top, left: slash.left }}
        >
          {items.map((block, index) => (
            <button
              key={block.key}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => insertBlock(editor, block)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left ${index === activeIndex ? "bg-beige" : ""}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-charcoal/10 text-charcoal/70">{block.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-charcoal">{block.label}</span>
                <span className="block truncate text-xs text-charcoal/45">{block.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
