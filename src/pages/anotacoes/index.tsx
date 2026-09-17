import { FormEvent, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { HiOutlineDocumentText } from "react-icons/hi2";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { useAuth } from "@/contexts/AuthContext";
import type { Note } from "@/types";

function shareUserId(share: Note["shares"][number]) {
  return typeof share.userId === "string" ? share.userId : share.userId._id;
}

function shareUserName(share: Note["shares"][number]) {
  return typeof share.userId === "string" ? share.userId : share.userId.name;
}

export default function NotesPage() {
  const { user } = useAuth();
  const { data: groups, reload: reloadGroups } = useAsyncData(() => resources.notes.groups.list());
  const { data: notes, reload: reloadNotes } = useAsyncData(() => resources.notes.list());
  const { data: users } = useAsyncData(() => resources.users.list());
  const [selectedId, setSelectedId] = useState<string>("");
  const [groupName, setGroupName] = useState("");
  const [shareUserIdValue, setShareUserIdValue] = useState("");
  const [draft, setDraft] = useState({ title: "", content: "" });

  const selected = (notes || []).find((note) => note._id === selectedId) || notes?.[0] || null;

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected._id);
    setDraft({ title: selected.title, content: selected.content });
  }, [selected?._id]);
  const ungrouped = (notes || []).filter((note) => !note.groupId && note.userId === user?._id);
  const sharedWithMe = (notes || []).filter((note) => note.userId !== user?._id);

  const grouped = useMemo(
    () =>
      (groups || []).map((group) => ({
        group,
        notes: (notes || []).filter((note) => note.groupId === group._id),
      })),
    [groups, notes],
  );

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupName.trim()) return;
    await resources.notes.groups.create({ name: groupName.trim() });
    setGroupName("");
    await reloadGroups();
  }

  async function createNote(groupId?: string) {
    const note = await resources.notes.create({ title: "Nova anotação", content: "", groupId });
    await reloadNotes();
    setSelectedId(note._id);
  }

  async function saveNote(payload: Partial<Note>) {
    if (!selected) return;
    await resources.notes.update(selected._id, payload);
    await reloadNotes();
  }

  async function deleteSelectedNote() {
    if (!selected || selected.userId !== user?._id) return;
    if (!window.confirm("Excluir esta anotação? Essa ação não pode ser desfeita.")) return;
    await resources.notes.remove(selected._id);
    setSelectedId("");
    setDraft({ title: "", content: "" });
    await reloadNotes();
  }

  return (
    <>
      <Head><title>Anotações | Noma CRM</title></Head>
      <PageHeader
        eyebrow="Workspace"
        title="Minhas anotações"
        description="Cada usuário tem o próprio espaço. Compartilhe uma nota apenas quando quiser."
      />

      <div className="grid min-h-[calc(100vh-11rem)] gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="card flex flex-col p-4">
          <form onSubmit={createGroup} className="mb-4 flex gap-2">
            <input
              className="input-search"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Novo grupo"
            />
            <button type="submit" className="btn-secondary h-11 px-3">+</button>
          </form>
          <button type="button" className="btn-primary mb-4 w-full" onClick={() => void createNote()}>
            Nova anotação
          </button>
          <div className="space-y-4 text-sm">
            {grouped.map(({ group, notes: groupNotes }) => (
              <div key={group._id}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="eyebrow">{group.name}</p>
                  <button type="button" className="text-xs text-tan" onClick={() => void createNote(group._id)}>
                    +
                  </button>
                </div>
                {groupNotes.map((note) => (
                  <button
                    key={note._id}
                    type="button"
                    onClick={() => setSelectedId(note._id)}
                    className={`mb-1 block w-full rounded-xl px-3 py-2 text-left transition ${
                      selected?._id === note._id ? "bg-ink text-white" : "hover:bg-beige"
                    }`}
                  >
                    {note.title || "Sem título"}
                  </button>
                ))}
              </div>
            ))}
            <div>
              <p className="eyebrow mb-1">Anotações sem grupo</p>
              {ungrouped.map((note) => (
                <button
                  key={note._id}
                  type="button"
                  onClick={() => setSelectedId(note._id)}
                  className={`mb-1 block w-full rounded-xl px-3 py-2 text-left transition ${
                    selected?._id === note._id ? "bg-ink text-white" : "hover:bg-beige"
                  }`}
                >
                  {note.title || "Sem título"}
                </button>
              ))}
            </div>
            {sharedWithMe.length ? (
              <div>
                <p className="eyebrow mb-1">Compartilhadas comigo</p>
                {sharedWithMe.map((note) => (
                  <button
                    key={note._id}
                    type="button"
                    onClick={() => setSelectedId(note._id)}
                    className={`mb-1 block w-full rounded-xl px-3 py-2 text-left transition ${
                      selected?._id === note._id ? "bg-ink text-white" : "hover:bg-beige"
                    }`}
                  >
                    {note.title || "Sem título"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="card flex min-h-[32rem] flex-col p-6 sm:p-8">
          {selected ? (
            <div>
              <div className="mb-4 flex items-start justify-between gap-3">
                <input
                  className="w-full border-none bg-transparent font-display text-3xl font-semibold outline-none"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  onBlur={() => void saveNote({ title: draft.title })}
                  disabled={selected.userId !== user?._id}
                />
                {selected.userId === user?._id ? (
                  <button type="button" className="btn-danger shrink-0" onClick={() => void deleteSelectedNote()}>
                    Excluir
                  </button>
                ) : null}
              </div>
              <textarea
                className="min-h-[420px] w-full resize-y border-none bg-transparent text-sm leading-7 text-charcoal outline-none"
                value={draft.content}
                onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                onBlur={() => void saveNote({ content: draft.content })}
                placeholder="Escreva livremente..."
                disabled={selected.userId !== user?._id}
              />
              {selected.userId === user?._id ? (
                <div className="mt-6 border-t border-charcoal/[0.06] pt-4">
                  <p className="mb-2 text-sm font-medium">Compartilhar</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="min-w-[220px] flex-1">
                      <Select
                        value={shareUserIdValue}
                        onChange={setShareUserIdValue}
                        placeholder="Escolher usuário"
                        options={(users || [])
                          .filter((item) => item._id !== user?._id)
                          .map((item) => ({ value: item._id, label: item.name }))}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        if (!shareUserIdValue) return;
                        void resources.notes.share(selected._id, { userId: shareUserIdValue }).then(reloadNotes);
                      }}
                    >
                      Compartilhar
                    </button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-charcoal/60">
                    {selected.shares.map((share) => (
                      <div key={shareUserId(share)} className="flex items-center justify-between">
                        <span>{shareUserName(share)}</span>
                        <button
                          type="button"
                          className="text-burgundy"
                          onClick={() => void resources.notes.unshare(selected._id, shareUserId(share)).then(reloadNotes)}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-charcoal/40">Você está visualizando uma anotação compartilhada.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-beige text-tan">
                <HiOutlineDocumentText className="h-7 w-7" />
              </div>
              <p className="font-display text-xl font-semibold text-charcoal">Sua mesa de ideias</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-charcoal/50">
                Crie um grupo ou uma anotação para começar a escrever.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
