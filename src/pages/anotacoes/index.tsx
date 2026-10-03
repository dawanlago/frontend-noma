import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { HiOutlineDocumentText, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Note, NoteGroup, NotePermission } from "@/types";
import { formatDateTime } from "@/utils/format";
import { confirmDialog } from "@/components/ui/DialogHost";

/* O editor (TipTap) só roda no navegador e fica fora do pacote inicial. */
const NoteEditor = dynamic(() => import("@/components/notes/NoteEditor"), {
  ssr: false,
  loading: () => <div className="skeleton min-h-[420px] flex-1" />,
});

const PERMISSION_OPTIONS: { value: NotePermission; label: string }[] = [
  { value: "view", label: "Visualizar" },
  { value: "edit", label: "Editar" },
];

/** Espera depois da última tecla para salvar sozinho. */
const AUTOSAVE_MS = 900;

type NoteChanges = { title?: string; content?: string };
type SaveState = "idle" | "pending" | "saving" | "saved";

/** Id do destino "Anotações sem grupo" ao arrastar. */
const NO_GROUP = "__none__";
const DRAG_TYPE = "application/x-noma-note";

function NoteItem({
  note,
  active,
  draggable,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  note: Note;
  active: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      title={draggable ? "Arraste para outro grupo" : undefined}
      className={`mb-1 block w-full truncate rounded-xl px-3 py-2 text-left transition ${
        active ? "bg-ink text-surface" : "hover:bg-beige"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {note.title || "Sem título"}
    </button>
  );
}

export default function NotesPage() {
  const { user } = useAuth();
  const { data: users } = useAsyncData(() => resources.users.list());
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [groupName, setGroupName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [shareUserId, setShareUserId] = useState("");
  const [sharePermission, setSharePermission] = useState<NotePermission>("view");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  /** Anotação que outra pessoa salvou antes (versão do servidor para recarregar). */
  const [conflict, setConflict] = useState<{ id: string; server: Note | null } | null>(null);
  /** Troca o editor (recria com o conteúdo novo) ao recarregar a anotação. */
  const [editorVersion, setEditorVersion] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overGroup, setOverGroup] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([resources.notes.groups.list(), resources.notes.list()])
      .then(([groupList, noteList]) => {
        setGroups(groupList);
        setNotes(noteList);
      })
      .catch((err) => setError(apiError(err, "Não foi possível carregar as anotações.")))
      .finally(() => setIsLoading(false));
  }, []);

  const mine = useMemo(() => notes.filter((note) => note.ownerId === user?._id), [notes, user?._id]);
  const sharedWithMe = useMemo(() => notes.filter((note) => note.ownerId !== user?._id), [notes, user?._id]);
  const selected = notes.find((note) => note._id === selectedId) || mine[0] || sharedWithMe[0] || null;
  const isOwner = selected?.ownerId === user?._id;
  const myPermission: NotePermission = isOwner ? "edit" : selected?.shares.find((share) => share.userId === user?._id)?.permission || "view";
  const canEdit = Boolean(selected) && myPermission === "edit" && conflict?.id !== selected?._id;

  useEffect(() => {
    setDraft({ title: selected?.title || "", content: selected?.content || "" });
    // Só troca o rascunho quando outra anotação é aberta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

  /* ---------- Salvamento automático (com trava contra edição simultânea) ---------- */

  const notesRef = useRef(notes);
  notesRef.current = notes;
  const pendingRef = useRef<{ id: string; changes: NoteChanges } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const replaceNote = useCallback((saved: Note) => {
    notesRef.current = notesRef.current.map((note) => (note._id === saved._id ? { ...note, ...saved } : note));
    setNotes(notesRef.current);
  }, []);

  /** Manda o que está pendente; os salvamentos saem em fila, cada um com a revisão mais recente. */
  const flush = useCallback(() => {
    window.clearTimeout(timerRef.current);
    const job = pendingRef.current;
    if (!job) return;
    pendingRef.current = null;
    queueRef.current = queueRef.current.then(async () => {
      const note = notesRef.current.find((item) => item._id === job.id);
      if (!note) return;
      setSaveState("saving");
      try {
        replaceNote(await resources.notes.update(job.id, { ...job.changes, rev: note.rev ?? 0 }));
        setSaveState(pendingRef.current ? "pending" : "saved");
      } catch (err) {
        const response = (err as { response?: { status?: number; data?: { data?: Note | null } } }).response;
        setSaveState("idle");
        if (response?.status === 409) {
          setConflict({ id: job.id, server: response.data?.data || null });
          if (pendingRef.current?.id === job.id) pendingRef.current = null;
        } else {
          setError(apiError(err, "Não foi possível salvar a anotação."));
        }
      }
    });
  }, [replaceNote]);

  function queueSave(changes: NoteChanges) {
    if (!selected || !canEdit) return;
    if (pendingRef.current && pendingRef.current.id !== selected._id) flush();
    pendingRef.current = { id: selected._id, changes: { ...(pendingRef.current?.changes || {}), ...changes } };
    setSaveState("pending");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, AUTOSAVE_MS);
  }

  // Salva o que faltar ao sair da página ou fechar a aba.
  useEffect(() => {
    const onLeave = () => flush();
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      flush();
    };
  }, [flush]);

  function openNote(id: string) {
    flush();
    setSelectedId(id);
  }

  /** Descarta o rascunho e abre a versão salva por outra pessoa. */
  async function reloadConflict() {
    if (!conflict) return;
    let server = conflict.server;
    if (!server) {
      const list = await resources.notes.list();
      server = list.find((note) => note._id === conflict.id) || null;
    }
    if (server) {
      replaceNote(server);
      if (selected?._id === server._id) setDraft({ title: server.title, content: server.content });
    }
    setConflict(null);
    setSaveState("idle");
    setEditorVersion((current) => current + 1);
  }

  async function run(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar."));
    }
  }

  function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupName.trim()) return;
    void run(async () => {
      const group = await resources.notes.groups.create({ name: groupName.trim() });
      setGroups((current) => [...current, group]);
      setGroupName("");
    });
  }

  function renameGroup() {
    if (!renaming?.name.trim()) {
      setRenaming(null);
      return;
    }
    const { id, name } = renaming;
    void run(async () => {
      const saved = await resources.notes.groups.update(id, { name: name.trim() });
      setGroups((current) => current.map((group) => (group._id === id ? saved : group)));
      setRenaming(null);
    });
  }

  async function deleteGroup(group: NoteGroup) {
    if (!(await confirmDialog({ title: `Excluir o grupo "${group.name}"?`, message: "As anotações dele não são apagadas: vão para \"Anotações sem grupo\".", confirmLabel: "Excluir", danger: true }))) return;
    void run(async () => {
      await resources.notes.groups.remove(group._id);
      setGroups((current) => current.filter((item) => item._id !== group._id));
      setNotes((current) => current.map((note) => (note.groupId === group._id ? { ...note, groupId: undefined } : note)));
    });
  }

  function createNote(groupId?: string) {
    void run(async () => {
      const note = await resources.notes.create({ title: "Nova anotação", content: "", groupId });
      flush();
      setNotes((current) => [note, ...current]);
      setSelectedId(note._id);
    });
  }

  function shareWith(userId: string, permission: NotePermission) {
    if (!selected) return;
    void run(async () => replaceNote(await resources.notes.share(selected._id, userId, permission)));
  }

  async function deleteSelected() {
    if (!selected || !isOwner || !(await confirmDialog({ title: "Excluir esta anotação?", message: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
    void run(async () => {
      if (pendingRef.current?.id === selected._id) pendingRef.current = null;
      await resources.notes.remove(selected._id);
      setNotes((current) => current.filter((note) => note._id !== selected._id));
      setSelectedId("");
    });
  }

  function moveNote(noteId: string, target: string) {
    const note = notes.find((item) => item._id === noteId);
    const groupId = target === NO_GROUP ? "" : target;
    if (!note || (note.groupId || "") === groupId) return;
    const previous = notes;
    setNotes((current) => current.map((item) => (item._id === noteId ? { ...item, groupId: groupId || undefined } : item)));
    void resources.notes
      .move(noteId, groupId)
      .then(replaceNote)
      .catch((err) => {
        setNotes(previous);
        setError(apiError(err, "Não foi possível mover a anotação."));
      });
  }

  /* Área que recebe a anotação arrastada (um grupo ou "sem grupo"). */
  function dropZone(target: string) {
    return {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!dragging) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (overGroup !== target) setOverGroup(target);
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverGroup(null);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        const id = event.dataTransfer.getData(DRAG_TYPE) || dragging;
        setDragging(null);
        setOverGroup(null);
        if (id) moveNote(id, target);
      },
      className: `rounded-xl p-1.5 transition ${overGroup === target && dragging ? "bg-tan/10 ring-2 ring-tan/30" : ""}`,
    };
  }

  const renderNote = (note: Note, draggable: boolean) => (
    <NoteItem
      key={note._id}
      note={note}
      active={selected?._id === note._id}
      draggable={draggable}
      onSelect={() => openNote(note._id)}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, note._id);
        event.dataTransfer.effectAllowed = "move";
        setDragging(note._id);
      }}
      onDragEnd={() => {
        setDragging(null);
        setOverGroup(null);
      }}
    />
  );

  const ungrouped = mine.filter((note) => !note.groupId || !groups.some((group) => group._id === note.groupId));

  return (
    <>
      <Head>
        <title>Anotações | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Workspace"
        title="Minhas anotações"
        description="Cada usuário tem o próprio espaço. Use / para inserir títulos, listas e checklist; compartilhe para alguém visualizar ou editar."
      />
      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}

      <div className="grid min-h-[calc(100vh-13rem)] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card flex flex-col p-4">
          <form onSubmit={createGroup} className="mb-4 flex gap-2">
            <input className="input-search" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Novo grupo" />
            <button type="submit" className="btn-secondary px-3" aria-label="Criar grupo">
              <HiOutlinePlus className="h-4 w-4" />
            </button>
          </form>
          <button type="button" className="btn-primary mb-4 w-full" onClick={() => createNote()}>
            Nova anotação
          </button>

          {isLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-8" />
              <div className="skeleton h-8" />
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {groups.map((group) => {
                const groupNotes = mine.filter((note) => note.groupId === group._id);
                return (
                  <div key={group._id} {...dropZone(group._id)}>
                    <div className="group/header mb-1 flex items-center justify-between gap-1 px-1">
                      {renaming?.id === group._id ? (
                        <input
                          className="input-search !py-1"
                          value={renaming.name}
                          autoFocus
                          onChange={(event) => setRenaming({ id: group._id, name: event.target.value })}
                          onBlur={renameGroup}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") renameGroup();
                            if (event.key === "Escape") setRenaming(null);
                          }}
                        />
                      ) : (
                        <p className="eyebrow truncate">
                          {group.name} <span className="font-normal text-charcoal/35">{groupNotes.length}</span>
                        </p>
                      )}
                      <div className="flex shrink-0 items-center">
                        <button type="button" className="rounded p-1 text-charcoal/35 hover:text-tan" aria-label="Nova anotação no grupo" onClick={() => createNote(group._id)}>
                          <HiOutlinePlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-charcoal/35 hover:text-tan"
                          aria-label="Renomear grupo"
                          onClick={() => setRenaming({ id: group._id, name: group.name })}
                        >
                          <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="rounded p-1 text-charcoal/35 hover:text-burgundy" aria-label="Excluir grupo" onClick={() => deleteGroup(group)}>
                          <HiOutlineTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {groupNotes.map((note) => renderNote(note, true))}
                    {groupNotes.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-charcoal/10 px-3 py-2 text-xs text-charcoal/35">
                        {dragging ? "Solte aqui" : "Vazio"}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              <div {...dropZone(NO_GROUP)}>
                <p className="eyebrow mb-1 px-1">Anotações sem grupo</p>
                {ungrouped.map((note) => renderNote(note, true))}
                {ungrouped.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-charcoal/10 px-3 py-2 text-xs text-charcoal/35">
                    {dragging ? "Solte aqui" : "Nenhuma"}
                  </p>
                ) : null}
              </div>

              {sharedWithMe.length ? (
                <div className="p-1.5">
                  <p className="eyebrow mb-1 px-1">Compartilhadas comigo</p>
                  {sharedWithMe.map((note) => renderNote(note, false))}
                </div>
              ) : null}
            </div>
          )}
        </aside>

        <section className="card flex min-h-[32rem] flex-col p-6 sm:p-8">
          {selected ? (
            <div className="flex flex-1 flex-col">
              <div className="mb-2 flex items-start justify-between gap-3">
                <input
                  className="w-full border-none bg-transparent text-3xl font-semibold text-charcoal outline-none"
                  value={draft.title}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, title: event.target.value }));
                    queueSave({ title: event.target.value });
                  }}
                  onBlur={flush}
                  readOnly={!canEdit}
                  aria-readonly={!canEdit}
                />
                {isOwner ? (
                  <button type="button" className="btn-danger shrink-0" onClick={deleteSelected}>
                    Excluir
                  </button>
                ) : null}
              </div>
              <p className="mb-4 text-xs text-charcoal/40">
                {isOwner
                  ? ""
                  : myPermission === "edit"
                    ? `Compartilhada por ${selected.ownerName} · você pode editar · `
                    : `Somente leitura — compartilhada por ${selected.ownerName} · `}
                Atualizada em {formatDateTime(selected.updatedAt)}
                {saveState === "pending" || saveState === "saving" ? " · Salvando..." : saveState === "saved" ? " · Salvo" : ""}
              </p>
              {conflict?.id === selected._id ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
                  <span>Esta nota foi alterada por outra pessoa — recarregue. O que você digitou depois disso não foi salvo.</span>
                  <button type="button" className="btn-secondary shrink-0" onClick={() => void reloadConflict()}>
                    Recarregar
                  </button>
                </div>
              ) : null}
              <NoteEditor
                key={`${selected._id}:${editorVersion}`}
                // O editor nasce com o conteúdo salvo (o rascunho ainda é o da anotação anterior neste render).
                content={selected.content}
                editable={canEdit}
                onChange={(content) => {
                  setDraft((current) => ({ ...current, content }));
                  queueSave({ content });
                }}
                onBlur={flush}
              />

              {isOwner ? (
                <div className="mt-6 grid gap-6 border-t border-charcoal/[0.06] pt-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium">Grupo</p>
                    <Select
                      value={selected.groupId && groups.some((group) => group._id === selected.groupId) ? selected.groupId : NO_GROUP}
                      onChange={(target) => moveNote(selected._id, target)}
                      options={[{ value: NO_GROUP, label: "Sem grupo" }, ...groups.map((group) => ({ value: group._id, label: group.name }))]}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Compartilhar</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="min-w-[10rem] flex-1">
                        <Select
                          value={shareUserId}
                          onChange={setShareUserId}
                          placeholder="Escolher usuário"
                          options={(users || [])
                            .filter((item) => item._id !== user?._id && !selected.shares.some((share) => share.userId === item._id))
                            .map((item) => ({ value: item._id, label: item.name }))}
                        />
                      </div>
                      <div className="w-36">
                        <Select value={sharePermission} onChange={(value) => setSharePermission(value as NotePermission)} options={PERMISSION_OPTIONS} />
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={!shareUserId}
                        onClick={() => {
                          shareWith(shareUserId, sharePermission);
                          setShareUserId("");
                        }}
                      >
                        Compartilhar
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-charcoal/70">
                      {selected.shares.map((share) => (
                        <div key={share.userId} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate">{share.name || "Usuário removido"}</span>
                          <div className="w-36 shrink-0">
                            <Select
                              value={share.permission}
                              onChange={(value) => shareWith(share.userId, value as NotePermission)}
                              options={PERMISSION_OPTIONS}
                            />
                          </div>
                          <button
                            type="button"
                            className="shrink-0 text-burgundy"
                            onClick={() =>
                              void run(async () => {
                                await resources.notes.unshare(selected._id, share.userId);
                                replaceNote({ ...selected, shares: selected.shares.filter((item) => item.userId !== share.userId) });
                              })
                            }
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-charcoal/40">
                  {myPermission === "edit"
                    ? "Você pode editar o título e o texto. Excluir, mover e compartilhar ficam com quem criou."
                    : "Você está visualizando uma anotação compartilhada."}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-beige text-tan">
                <HiOutlineDocumentText className="h-7 w-7" />
              </div>
              <p className="text-xl font-semibold text-charcoal">Sua mesa de ideias</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-charcoal/50">Crie um grupo ou uma anotação para começar a escrever.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
