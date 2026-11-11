import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import { HiOutlineArrowUp, HiOutlineSparkles, HiOutlineTrash } from "react-icons/hi2";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";

interface Turn {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  error?: boolean;
}

const STORAGE_KEY = "noma:assistente";

const SUGGESTIONS = [
  "Como está meu funil de vendas hoje?",
  "Quais negociações estão com a próxima ação atrasada?",
  "O que tenho na agenda esta semana?",
  "Quais propostas foram abertas e ainda não foram aceitas?",
  "Qual o resultado do financeiro neste mês?",
];

/** Texto com **negrito** e [links](/rota) (só links internos do sistema viram link). */
function inline(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = `${keyBase}-${index++}`;
    if (match[1]) parts.push(<strong key={key}>{match[1]}</strong>);
    else if (match[3].startsWith("/") && !match[3].startsWith("//"))
      parts.push(
        <Link key={key} href={match[3]} className="font-semibold text-tan hover:underline">
          {match[2]}
        </Link>,
      );
    else parts.push(match[2]);
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Markdown simples da resposta: títulos, listas, negrito e links internos. */
function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key} className="my-1 list-disc space-y-1 pl-5">
        {list.map((item, i) => (
          <li key={i}>{inline(item, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  text.split("\n").forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flush(`l${i}`);
    if (!line.trim()) return;
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    blocks.push(
      heading ? (
        <p key={i} className="mt-2 font-semibold text-charcoal">
          {inline(heading[1], `h${i}`)}
        </p>
      ) : (
        <p key={i}>{inline(line, `p${i}`)}</p>
      ),
    );
  });
  flush("end");
  return <div className="space-y-2 text-sm leading-6">{blocks}</div>;
}

/** Assistente do Noma (Claude): perguntas sobre CRM, agenda, propostas, contatos e financeiro. */
export default function AssistantPage() {
  const { user } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A conversa fica só neste navegador (some ao limpar).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setTurns(saved);
    } catch {
      // Sem armazenamento: começa vazio.
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-40)));
    } catch {
      // Ignora.
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function send(question = draft) {
    const text = question.trim();
    if (!text || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    try {
      const history = next.filter((turn) => !turn.error).map(({ role, content }) => ({ role, content }));
      const answer = await resources.assistant.chat(history);
      setTurns((current) => [...current, { role: "assistant", content: answer.reply, sources: answer.sources }]);
    } catch (err) {
      setTurns((current) => [...current, { role: "assistant", content: apiError(err, "O assistente não respondeu agora. Tente de novo."), error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <>
      <Head>
        <title>Assistente | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Claude"
        title="Assistente"
        description="Pergunte sobre suas negociações, agenda, propostas, contatos e financeiro. Ele só consulta o que você tem acesso e não altera nada."
        actions={
          turns.length ? (
            <button type="button" className="btn-secondary" onClick={() => setTurns([])} disabled={busy}>
              <HiOutlineTrash className="h-4 w-4" /> Nova conversa
            </button>
          ) : null
        }
      />

      <div className="card mx-auto flex min-h-[60vh] max-w-3xl flex-col">
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          {turns.length === 0 ? (
            <div className="py-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-tan/10 text-tan">
                <HiOutlineSparkles className="h-6 w-6" />
              </span>
              <p className="mt-3 text-lg font-semibold text-charcoal">{firstName ? `Oi, ${firstName}!` : "Oi!"} Como posso ajudar?</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void send(item)}
                    className="rounded-full border border-charcoal/10 bg-surface px-3.5 py-2 text-sm text-charcoal/75 transition hover:border-tan/40 hover:text-tan"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((turn, index) => (
              <Fragment key={index}>
                {turn.role === "user" ? (
                  <div className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-tan px-4 py-2.5 text-sm text-white">{turn.content}</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tan/10 text-tan" aria-hidden>
                      <HiOutlineSparkles className="h-4 w-4" />
                    </span>
                    <div className={`min-w-0 max-w-[90%] rounded-2xl rounded-tl-md px-4 py-2.5 ${turn.error ? "bg-burgundy/[0.07] text-burgundy" : "bg-beige/70 text-charcoal"}`}>
                      <Rich text={turn.content} />
                      {turn.sources?.length ? <p className="mt-2 text-[11px] text-charcoal/45">Consultei: {turn.sources.join(", ")}</p> : null}
                    </div>
                  </div>
                )}
              </Fragment>
            ))
          )}
          {busy ? (
            <div className="flex items-center gap-3 text-sm text-charcoal/55">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tan/10 text-tan">
                <HiOutlineSparkles className="h-4 w-4 animate-pulse" />
              </span>
              Consultando o sistema…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
        <form
          className="sticky bottom-0 flex items-end gap-2 border-t border-charcoal/[0.08] bg-surface p-3 sm:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <textarea
            ref={inputRef}
            className="input-search max-h-40 min-h-[44px] flex-1 resize-none"
            rows={1}
            value={draft}
            placeholder="Pergunte algo… (Enter envia, Shift+Enter quebra a linha)"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button type="submit" className="btn-primary h-11 w-11 shrink-0 justify-center !p-0" disabled={busy || !draft.trim()} aria-label="Enviar">
            <HiOutlineArrowUp className="h-5 w-5" />
          </button>
        </form>
      </div>
    </>
  );
}
