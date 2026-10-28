import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { HiOutlineArrowLeft, HiOutlineBriefcase, HiOutlinePaperAirplane, HiOutlinePlus, HiOutlineUser } from "react-icons/hi2";
import EntityAvatar from "@/components/base/Avatar";
import { apiError } from "@/lib/errors";
import { chatTitle, formatWhatsAppPhone, whatsappApi, type WhatsAppChat, type WhatsAppMessage } from "@/lib/whatsapp";
import MessageBubble from "./MessageBubble";

/** Intervalo da busca por mensagens novas na conversa aberta. */
const POLL_MS = 5000;

interface ChatViewProps {
  /** Conversa como veio da lista (mostra o cabeçalho antes de carregar). */
  chat: WhatsAppChat;
  onBack: () => void;
  /** Avisa a página que a conversa mudou (lida, mensagem nova, negociação criada). */
  onChatChange: (chat: WhatsAppChat) => void;
}

/** Junta mensagens novas às que já estão na tela, sem repetir (pelo id no WhatsApp). */
function mergeMessages(current: WhatsAppMessage[], incoming: WhatsAppMessage[]) {
  const byId = new Map(current.map((message) => [message.messageId, message]));
  incoming.forEach((message) => byId.set(message.messageId, message));
  return [...byId.values()].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (date.getTime() >= start) return "Hoje";
  if (date.getTime() >= start - 86_400_000) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Coluna da direita: cabeçalho com atalhos para o CRM, mensagens e campo de envio. */
export default function ChatView({ chat, onBack, onChatChange }: ChatViewProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const onChatChangeRef = useRef(onChatChange);
  onChatChangeRef.current = onChatChange;

  const markRead = useCallback(async (current: WhatsAppChat) => {
    if (!current.unread) return;
    onChatChangeRef.current({ ...current, unread: 0 });
    try {
      await whatsappApi.markRead(current._id);
    } catch {
      // Tenta de novo na próxima mensagem.
    }
  }, []);

  // Página mais recente: na abertura e a cada POLL_MS (pausa com a aba escondida).
  const refresh = useCallback(
    async (initial: boolean) => {
      try {
        const page = await whatsappApi.messages(chat._id);
        setMessages((current) => (initial ? page.messages : mergeMessages(current, page.messages)));
        if (initial) setHasMore(page.hasMore);
        setError("");
        onChatChangeRef.current(page.chat);
        void markRead(page.chat);
      } catch (loadError) {
        if (initial) setError(apiError(loadError, "Não foi possível carregar a conversa."));
      } finally {
        if (initial) setIsLoading(false);
      }
    },
    [chat._id, markRead],
  );

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    setIsLoading(true);
    setDraft("");
    stickToBottom.current = true;
    void refresh(true);
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh(false);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Desce para a última mensagem quando chega coisa nova (se a pessoa não estava lendo o histórico).
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (box && stickToBottom.current) box.scrollTop = box.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const box = scrollRef.current;
    if (box) stickToBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    const box = scrollRef.current;
    const previousHeight = box?.scrollHeight || 0;
    setLoadingOlder(true);
    stickToBottom.current = false;
    try {
      const page = await whatsappApi.messages(chat._id, { before: oldest.at });
      setMessages((current) => mergeMessages(page.messages, current));
      setHasMore(page.hasMore);
      // Mantém a posição de leitura depois de inserir as antigas em cima.
      requestAnimationFrame(() => {
        if (box) box.scrollTop = box.scrollHeight - previousHeight;
      });
    } catch (loadError) {
      setError(apiError(loadError, "Não foi possível carregar as mensagens anteriores."));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const message = await whatsappApi.send(chat._id, text);
      setDraft("");
      stickToBottom.current = true;
      if (message) setMessages((current) => mergeMessages(current, [message]));
      onChatChangeRef.current({ ...chatRef.current, lastMessageText: text, lastMessageAt: message?.at || new Date().toISOString(), lastFromMe: true, unread: 0 });
    } catch (sendError) {
      setError(apiError(sendError, "Não foi possível enviar a mensagem."));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia; Shift+Enter quebra a linha.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  async function createLead() {
    setCreatingLead(true);
    setError("");
    try {
      await whatsappApi.createLead(chat._id);
      const page = await whatsappApi.messages(chat._id, { limit: 1 });
      onChatChangeRef.current(page.chat);
    } catch (leadError) {
      setError(apiError(leadError, "Não foi possível criar a negociação."));
    } finally {
      setCreatingLead(false);
    }
  }

  const title = chatTitle(chat);
  let lastDay = "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-charcoal/[0.08] px-3 py-2.5 sm:px-4">
        <button type="button" className="btn-ghost md:hidden" onClick={onBack} aria-label="Voltar para as conversas">
          <HiOutlineArrowLeft className="h-5 w-5" />
        </button>
        <EntityAvatar name={title} image={chat.contact?.photo || chat.photo} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-charcoal">{title}</p>
          <p className="truncate text-xs text-charcoal/50">
            {formatWhatsAppPhone(chat.phone)}
            {chat.contact && chat.name && chat.name !== chat.contact.name ? ` · ${chat.name} no WhatsApp` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {chat.contact ? (
            <Link href={`/contatos/${chat.contact._id}`} className="btn-ghost" title="Abrir perfil do contato" aria-label="Abrir perfil do contato">
              <HiOutlineUser className="h-5 w-5" />
            </Link>
          ) : null}
          {chat.lead ? (
            <Link href={`/crm/${chat.lead._id}`} className="btn-secondary px-3 py-2 text-xs">
              <HiOutlineBriefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Ver negociação</span>
            </Link>
          ) : (
            <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => void createLead()} disabled={creatingLead}>
              <HiOutlinePlus className="h-4 w-4" />
              <span className="hidden sm:inline">{creatingLead ? "Criando..." : "Criar negociação"}</span>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="noma-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-beige/60 px-3 py-4 sm:px-5">
        {hasMore ? (
          <div className="pb-2 text-center">
            <button type="button" className="chip bg-surface text-charcoal/60 hover:text-charcoal" onClick={() => void loadOlder()} disabled={loadingOlder}>
              {loadingOlder ? "Carregando..." : "Carregar mensagens anteriores"}
            </button>
          </div>
        ) : null}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className={`skeleton h-10 w-2/3 rounded-xl ${item % 2 ? "ml-auto" : ""}`} />
            ))}
          </div>
        ) : !messages.length ? (
          <p className="py-10 text-center text-sm text-charcoal/50">Nenhuma mensagem nesta conversa ainda.</p>
        ) : (
          messages.map((message) => {
            const day = dayLabel(message.at);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <Fragment key={message.messageId}>
                {showDay ? (
                  <div className="py-2 text-center">
                    <span className="chip bg-surface text-charcoal/50">{day}</span>
                  </div>
                ) : null}
                <MessageBubble message={message} />
              </Fragment>
            );
          })
        )}
      </div>

      {error ? <p className="border-t border-burgundy/20 bg-burgundy/5 px-4 py-2 text-xs text-burgundy">{error}</p> : null}

      <form
        className="flex items-end gap-2 border-t border-charcoal/[0.08] p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <textarea
          className="input-search noma-scroll max-h-32 min-h-[2.75rem] flex-1 resize-none"
          rows={1}
          placeholder="Escreva uma mensagem (Enter envia, Shift+Enter quebra a linha)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={4096}
        />
        <button type="submit" className="btn-primary h-11 px-3.5" disabled={sending || !draft.trim()} aria-label="Enviar">
          <HiOutlinePaperAirplane className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
