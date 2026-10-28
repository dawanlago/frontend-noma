import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import EntityAvatar from "@/components/base/Avatar";
import { chatTime, chatTitle, type WhatsAppChat } from "@/lib/whatsapp";

interface ChatListProps {
  chats: WhatsAppChat[] | null;
  isLoading: boolean;
  selectedId: string;
  query: string;
  onQueryChange: (value: string) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (value: boolean) => void;
  onSelect: (chat: WhatsAppChat) => void;
}

/** Coluna da esquerda: busca, filtro de não lidas e conversas (mais recentes primeiro). */
export default function ChatList({ chats, isLoading, selectedId, query, onQueryChange, unreadOnly, onUnreadOnlyChange, onSelect }: ChatListProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-charcoal/[0.08] p-3">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35" />
          <input
            className="input-search pl-9"
            placeholder="Buscar nome, número ou mensagem"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { value: false, label: "Todas" },
            { value: true, label: "Não lidas" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onUnreadOnlyChange(option.value)}
              className={`chip transition ${unreadOnly === option.value ? "bg-tan text-white" : "bg-beige text-charcoal/60 hover:text-charcoal"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="noma-scroll min-h-0 flex-1 overflow-y-auto">
        {isLoading && !chats ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : !chats?.length ? (
          <p className="px-4 py-10 text-center text-sm text-charcoal/50">
            {query || unreadOnly ? "Nenhuma conversa encontrada." : "As conversas aparecem aqui quando alguém mandar mensagem."}
          </p>
        ) : (
          <ul>
            {chats.map((chat) => {
              const active = chat._id === selectedId;
              return (
                <li key={chat._id}>
                  <button
                    type="button"
                    onClick={() => onSelect(chat)}
                    className={`flex w-full items-center gap-3 border-b border-charcoal/[0.05] px-3 py-3 text-left transition ${
                      active ? "bg-tan/10" : "hover:bg-beige"
                    }`}
                  >
                    <EntityAvatar name={chatTitle(chat)} image={chat.contact?.photo || chat.photo} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm ${chat.unread ? "font-bold text-charcoal" : "font-semibold text-charcoal/85"}`}>
                          {chatTitle(chat)}
                        </span>
                        <span className={`shrink-0 text-[11px] ${chat.unread ? "font-semibold text-sage" : "text-charcoal/40"}`}>
                          {chatTime(chat.lastMessageAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-charcoal/55">
                          {chat.lastFromMe ? "Você: " : ""}
                          {chat.lastMessageText || " "}
                        </span>
                        {chat.unread ? (
                          <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-sage px-1.5 text-[11px] font-bold text-white">
                            {chat.unread > 99 ? "99+" : chat.unread}
                          </span>
                        ) : chat.lead ? (
                          <span className="chip shrink-0 bg-tan/10 px-2 py-0.5 text-[10px] text-tan">CRM</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
