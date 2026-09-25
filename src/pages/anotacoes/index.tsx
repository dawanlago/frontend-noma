import { useEffect, useMemo, useState, type DragEvent } from "react";
import Head from "next/head";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { HiOutlineEllipsisHorizontal, HiOutlinePlus } from "react-icons/hi2";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Note, NoteGroup } from "@/types";
import { formatDateTime } from "@/utils/format";

const NOTE_COLORS = ["", "#FEF3C7", "#DCFCE7", "#DBEAFE", "#FCE7F3", "#EDE9FE", "#FEE2E2"];

interface DropTarget {
  groupId: string;
  index: number;
}

function sortNotes(notes: Note[], groupId: string) {
  return notes.filter((note) => note.groupId === groupId).sort((a, b) => a.order - b.order);
}

function GroupMenu({
  group,
  isFirst,
  isLast,
  onRename,
  onMove,
  onDelete,
}: {
  group: NoteGroup;
  isFirst: boolean;
  isLast: boolean;
  onRename: () => void;
  onMove: (delta: number) => void;
  onDelete: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal/40 hover:bg-white hover:text-charcoal"
        aria-label={`Ações do grupo ${group.name}`}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <HiOutlineEllipsisHorizontal className="h-5 w-5" />
      </button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem
          onClick={() => {
            close();
            onRename();
          }}
        >
          Renomear
        </MenuItem>
        <MenuItem
          disabled={isFirst}
          onClick={() => {
            close();
            onMove(-1);
          }}
        >
          Mover para a esquerda
        </MenuItem>
        <MenuItem
          disabled={isLast}
          onClick={() => {
            close();
            onMove(1);
          }}
        >
          Mover para a direita
        </MenuItem>
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            close();
            onDelete();
          }}
        >
          Excluir grupo
        </MenuItem>
      </Menu>
    </>
  );
}

export default function NotesPage() {
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [adding, setAdding] = useState<{ groupId: string; title: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);

  useEffect(() => {
    resources.notes
      .board()
      .then((board) => {
        setGroups(board.groups);
        setNotes(board.notes);
      })
      .catch((err) => setError(apiError(err, "Não foi possível carregar as anotações.")))
      .finally(() => setIsLoading(false));
  }, []);

  const ordered = useMemo(() => [...groups].sort((a, b) => a.order - b.order), [groups]);

  async function run(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar."));
    }
  }

  /* --------------------------------- Arrastar -------------------------------- */

  function onCardDragOver(event: DragEvent<HTMLElement>, groupId: string, index: number) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    const next = { groupId, index: after ? index + 1 : index };
    if (target?.groupId !== next.groupId || target.index !== next.index) setTarget(next);
  }

  function onColumnDragOver(event: DragEvent<HTMLElement>, groupId: string) {
    event.preventDefault();
    if (target?.groupId !== groupId) setTarget({ groupId, index: sortNotes(notes, groupId).length });
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const note = notes.find((item) => item._id === (event.dataTransfer.getData("text/plain") || dragId));
    const drop = target;
    setDragId(null);
    setTarget(null);
    if (!note || !drop) return;
    const destination = sortNotes(notes, drop.groupId).filter((item) => item._id !== note._id);
    const sourceIndex = sortNotes(notes, drop.groupId).findIndex((item) => item._id === note._id);
    // Ao mover dentro do mesmo grupo para baixo, o índice alvo já contava o próprio cartão.
    const index = sourceIndex !== -1 && sourceIndex < drop.index ? drop.index - 1 : drop.index;
    destination.splice(Math.max(0, Math.min(index, destination.length)), 0, { ...note, groupId: drop.groupId });
    const orderedIds = destination.map((item) => item._id);
    const previous = notes;
    setNotes((current) =>
      current.map((item) => {
        const position = orderedIds.indexOf(item._id);
        return position === -1 ? item : { ...item, groupId: drop.groupId, order: position };
      }),
    );
    void resources.notes.move(note._id, drop.groupId, orderedIds).catch((err) => {
      setNotes(previous);
      setError(apiError(err, "Não foi possível mover a anotação."));
    });
  }

  /* ---------------------------------- Ações --------------------------------- */

  function addNote() {
    if (!adding?.title.trim()) return;
    const { groupId, title } = adding;
    void run(async () => {
      const note = await resources.notes.create({ groupId, title: title.trim() });
      setNotes((current) => [...current, note]);
      setAdding({ groupId, title: "" });
    });
  }

  function addGroup() {
    if (!newGroup.trim()) return;
    void run(async () => {
      const group = await resources.notes.createGroup({ name: newGroup.trim() });
      setGroups((current) => [...current, group]);
      setNewGroup("");
    });
  }

  function renameGroup() {
    if (!renaming?.name.trim()) return;
    const { id, name } = renaming;
    void run(async () => {
      const saved = await resources.notes.updateGroup(id, { name: name.trim() });
      setGroups((current) => current.map((group) => (group._id === id ? saved : group)));
      setRenaming(null);
    });
  }

  function moveGroup(index: number, delta: number) {
    const list = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const ids = list.map((group) => group._id);
    setGroups(list.map((group, order) => ({ ...group, order })));
    void run(() => resources.notes.reorderGroups(ids));
  }

  function deleteGroup(group: NoteGroup) {
    const count = notes.filter((note) => note.groupId === group._id).length;
    if (!window.confirm(`Excluir o grupo "${group.name}"${count ? ` e as ${count} anotações dele` : ""}?`)) return;
    void run(async () => {
      await resources.notes.removeGroup(group._id);
      setGroups((current) => current.filter((item) => item._id !== group._id));
      setNotes((current) => current.filter((note) => note.groupId !== group._id));
    });
  }

  function saveNote(note: Note) {
    void run(async () => {
      const saved = await resources.notes.update(note._id, { title: note.title, content: note.content, color: note.color });
      setNotes((current) => current.map((item) => (item._id === saved._id ? saved : item)));
      setEditing(null);
    });
  }

  function deleteNote(note: Note) {
    if (!window.confirm("Excluir esta anotação?")) return;
    void run(async () => {
      await resources.notes.remove(note._id);
      setNotes((current) => current.filter((item) => item._id !== note._id));
      setEditing(null);
    });
  }

  return (
    <>
      <Head>
        <title>Anotações | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Visão geral"
        title="Anotações"
        description="Organize ideias e lembretes em grupos, no estilo Trello. Arraste os cartões entre os grupos ou dentro deles."
      />
      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}

      {isLoading ? (
        <div className="flex gap-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-64 w-[280px] shrink-0" />
          ))}
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-start gap-3">
            {ordered.map((group, groupIndex) => {
              const items = sortNotes(notes, group._id);
              const isTarget = target?.groupId === group._id && dragId !== null;
              return (
                <section
                  key={group._id}
                  onDragOver={(event) => onColumnDragOver(event, group._id)}
                  onDrop={handleDrop}
                  className={`flex w-[280px] shrink-0 flex-col rounded-xl border p-3 transition ${
                    isTarget ? "border-tan bg-tan/[0.05]" : "border-charcoal/[0.06] bg-beige"
                  }`}
                >
                  <header className="mb-2 flex items-center justify-between gap-2 px-1">
                    {renaming?.id === group._id ? (
                      <input
                        className="input-search !py-1.5"
                        value={renaming.name}
                        autoFocus
                        onChange={(e) => setRenaming({ id: group._id, name: e.target.value })}
                        onBlur={renameGroup}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameGroup();
                          if (e.key === "Escape") setRenaming(null);
                        }}
                      />
                    ) : (
                      <h2
                        className="cursor-text truncate text-sm font-semibold text-charcoal"
                        onDoubleClick={() => setRenaming({ id: group._id, name: group.name })}
                      >
                        {group.name} <span className="ml-1 text-xs font-normal text-charcoal/40">{items.length}</span>
                      </h2>
                    )}
                    <GroupMenu
                      group={group}
                      isFirst={groupIndex === 0}
                      isLast={groupIndex === ordered.length - 1}
                      onRename={() => setRenaming({ id: group._id, name: group.name })}
                      onMove={(delta) => moveGroup(groupIndex, delta)}
                      onDelete={() => deleteGroup(group)}
                    />
                  </header>

                  <div className="flex min-h-[48px] flex-col gap-2">
                    {items.map((note, index) => (
                      <div key={note._id}>
                        {isTarget && target?.index === index ? <div className="mb-2 h-1 rounded-full bg-tan" /> : null}
                        <article
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", note._id);
                            event.dataTransfer.effectAllowed = "move";
                            setDragId(note._id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setTarget(null);
                          }}
                          onDragOver={(event) => onCardDragOver(event, group._id, index)}
                          onClick={() => setEditing(note)}
                          style={note.color ? { backgroundColor: note.color } : undefined}
                          className={`cursor-pointer rounded-lg border border-charcoal/[0.08] bg-white p-3 shadow-sm transition hover:border-charcoal/20 ${
                            dragId === note._id ? "opacity-40" : ""
                          }`}
                        >
                          <p className="text-sm font-semibold text-charcoal">{note.title || "Sem título"}</p>
                          {note.content ? <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs text-charcoal/60">{note.content}</p> : null}
                        </article>
                      </div>
                    ))}
                    {isTarget && target?.index === items.length ? <div className="h-1 rounded-full bg-tan" /> : null}
                  </div>

                  {adding?.groupId === group._id ? (
                    <form
                      className="mt-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addNote();
                      }}
                    >
                      <textarea
                        className="input-search min-h-[64px] resize-none"
                        value={adding.title}
                        autoFocus
                        placeholder="Título da anotação"
                        onChange={(e) => setAdding({ groupId: group._id, title: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            addNote();
                          }
                          if (e.key === "Escape") setAdding(null);
                        }}
                      />
                      <div className="mt-2 flex gap-2">
                        <button type="submit" className="btn-primary !py-1.5">
                          Adicionar
                        </button>
                        <button type="button" className="btn-secondary !py-1.5" onClick={() => setAdding(null)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-charcoal/55 hover:bg-white hover:text-charcoal"
                      onClick={() => setAdding({ groupId: group._id, title: "" })}
                    >
                      <HiOutlinePlus className="h-4 w-4" /> Adicionar anotação
                    </button>
                  )}
                </section>
              );
            })}

            <form
              className="w-[280px] shrink-0 rounded-xl border border-dashed border-charcoal/15 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                addGroup();
              }}
            >
              <input className="input-search" value={newGroup} placeholder="+ Novo grupo" onChange={(e) => setNewGroup(e.target.value)} />
              {newGroup.trim() ? (
                <button type="submit" className="btn-primary mt-2 w-full !py-1.5">
                  Criar grupo
                </button>
              ) : null}
            </form>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Anotação"
        description={editing ? `Atualizada em ${formatDateTime(editing.updatedAt)}` : ""}
        footer={
          editing ? (
            <div className="flex w-full justify-between gap-2">
              <button type="button" className="btn-secondary !text-burgundy" onClick={() => deleteNote(editing)}>
                Excluir
              </button>
              <button type="button" className="btn-primary" onClick={() => saveNote(editing)}>
                Salvar
              </button>
            </div>
          ) : null
        }
      >
        {editing ? (
          <div className="space-y-3 pt-1">
            <input
              className="input-search font-semibold"
              value={editing.title}
              placeholder="Título"
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <textarea
              className="input-search min-h-[200px] resize-y"
              value={editing.content}
              placeholder="Escreva aqui..."
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-charcoal/60">Cor</span>
              {NOTE_COLORS.map((color) => (
                <button
                  key={color || "none"}
                  type="button"
                  aria-label={color ? `Cor ${color}` : "Sem cor"}
                  onClick={() => setEditing({ ...editing, color })}
                  className={`h-7 w-7 rounded-full border ${editing.color === color ? "ring-2 ring-tan ring-offset-1" : "border-charcoal/15"}`}
                  style={{ backgroundColor: color || "#fff" }}
                />
              ))}
            </div>
            <p className="text-xs text-charcoal/45">Para trocar de grupo, arraste o cartão no quadro.</p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
