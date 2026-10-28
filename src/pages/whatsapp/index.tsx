import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineChatBubbleLeftRight, HiOutlineCog6Tooth } from "react-icons/hi2";
import EmptyState from "@/components/crm/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import ChatList from "@/components/whatsapp/ChatList";
import ChatView from "@/components/whatsapp/ChatView";
import { apiError } from "@/lib/errors";
import { whatsappApi, type WhatsAppChat, type WhatsAppStatus } from "@/lib/whatsapp";

/** Intervalo da busca por conversas novas. */
const POLL_MS = 8000;

export default function WhatsAppPage() {
  const router = useRouter();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [chats, setChats] = useState<WhatsAppChat[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  // Conversa aberta: guardada também na URL (?conversa=id) para o "voltar" do celular funcionar.
  const selectedId = typeof router.query.conversa === "string" ? router.query.conversa : "";
  const [selected, setSelected] = useState<WhatsAppChat | null>(null);

  useEffect(() => {
    whatsappApi
      .status()
      .then(setStatus)
      .catch((error) => setStatusError(apiError(error, "Não foi possível verificar o WhatsApp.")));
  }, []);

  // Busca com uma pequena espera para não chamar a API a cada tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadChats = useCallback(async () => {
    try {
      const data = await whatsappApi.chats({ q: search, unread: unreadOnly });
      setChats(data.items);
      setListError("");
    } catch (error) {
      setListError(apiError(error, "Não foi possível carregar as conversas."));
    } finally {
      setIsLoading(false);
    }
  }, [search, unreadOnly]);

  const configured = Boolean(status?.configured);

  useEffect(() => {
    if (!configured) return;
    setIsLoading(true);
    void loadChats();
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadChats();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [configured, loadChats]);

  // Mantém o cabeçalho da conversa aberta mesmo se ela sair da lista filtrada.
  const listed = useMemo(() => chats?.find((chat) => chat._id === selectedId) || null, [chats, selectedId]);
  useEffect(() => {
    if (!selectedId) setSelected(null);
    else if (listed) setSelected((current) => (current?._id === listed._id ? { ...current, ...listed, unread: Math.min(current.unread, listed.unread) } : listed));
  }, [selectedId, listed]);

  // Conversa aberta pela URL que ainda não está na lista (ex.: link direto): carrega pelo id.
  const fetchedRef = useRef("");
  useEffect(() => {
    if (!configured || !selectedId || listed || selected?._id === selectedId || fetchedRef.current === selectedId) return;
    fetchedRef.current = selectedId;
    whatsappApi
      .messages(selectedId, { limit: 1 })
      .then((page) => setSelected(page.chat))
      .catch(() => void router.replace({ pathname: router.pathname }, undefined, { shallow: true }));
  }, [configured, selectedId, listed, selected, router]);

  // Trocar de conversa substitui a URL; só a primeira abertura entra no histórico (o "voltar" fecha a conversa).
  const pushedRef = useRef(false);
  function openChat(chat: WhatsAppChat) {
    setSelected(chat);
    const url = { pathname: router.pathname, query: { conversa: chat._id } };
    if (selectedId) void router.replace(url, undefined, { shallow: true });
    else {
      pushedRef.current = true;
      void router.push(url, undefined, { shallow: true });
    }
  }

  function closeChat() {
    if (pushedRef.current) {
      pushedRef.current = false;
      router.back();
    } else void router.replace({ pathname: router.pathname }, undefined, { shallow: true });
  }

  const handleChatChange = useCallback((chat: WhatsAppChat) => {
    setSelected((current) => (current?._id === chat._id ? chat : current));
    setChats((current) => {
      if (!current) return current;
      const exists = current.some((item) => item._id === chat._id);
      const next = exists ? current.map((item) => (item._id === chat._id ? chat : item)) : current;
      return [...next].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
    });
  }, []);

  const unreadCount = (chats || []).filter((chat) => chat.unread > 0).length;
  const settingsLink = (
    <Link href="/configuracoes/integracoes" className="btn-secondary">
      <HiOutlineCog6Tooth className="h-4 w-4" />
      Integrações
    </Link>
  );

  return (
    <>
      <Head>
        <title>WhatsApp | Noma</title>
      </Head>

      <PageHeader
        eyebrow="CRM"
        title="WhatsApp"
        description={
          configured
            ? `Conversas do número da produtora${unreadCount ? ` · ${unreadCount} com mensagens não lidas` : ""}.`
            : "Conversas do número da produtora, ligadas aos contatos e negociações."
        }
        actions={configured ? settingsLink : undefined}
      />

      {statusError ? (
        <p className="mt-6 rounded-lg bg-burgundy/10 px-4 py-3 text-sm text-burgundy">{statusError}</p>
      ) : !status ? (
        <div className="skeleton mt-6 h-[60vh] rounded-xl" />
      ) : !configured ? (
        <div className="mt-6">
          <EmptyState
            title="WhatsApp ainda não está conectado"
            text="Configure a Z-API (instância e token) e cole a URL de webhook no painel da Z-API para as conversas aparecerem aqui."
            action={
              <Link href="/configuracoes/integracoes" className="btn-primary">
                <HiOutlineCog6Tooth className="h-4 w-4" />
                Configurar integração
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {!status.connected ? (
            <p className="mt-6 rounded-lg bg-gold/10 px-4 py-3 text-sm text-charcoal/80">
              O número não está conectado à Z-API{status.error ? ` (${status.error})` : ""}. Leia o QR code no painel da Z-API para voltar a receber e
              enviar mensagens.
            </p>
          ) : null}
          {listError ? <p className="mt-4 rounded-lg bg-burgundy/10 px-4 py-3 text-sm text-burgundy">{listError}</p> : null}

          <div className="card mt-6 flex h-[calc(100dvh-13rem)] min-h-[480px] overflow-hidden">
            {/* No celular, lista e conversa se alternam; a partir do md ficam lado a lado. */}
            <aside className={`min-h-0 w-full border-charcoal/[0.08] md:flex md:w-80 md:shrink-0 md:border-r lg:w-96 ${selectedId ? "hidden" : "flex"} flex-col`}>
              <ChatList
                chats={chats}
                isLoading={isLoading}
                selectedId={selectedId}
                query={query}
                onQueryChange={setQuery}
                unreadOnly={unreadOnly}
                onUnreadOnlyChange={setUnreadOnly}
                onSelect={openChat}
              />
            </aside>
            <section className={`min-h-0 min-w-0 flex-1 flex-col ${selectedId ? "flex" : "hidden md:flex"}`}>
              {selected ? (
                <ChatView key={selected._id} chat={selected} onBack={closeChat} onChatChange={handleChatChange} />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                  <span className="icon-well h-12 w-12">
                    <HiOutlineChatBubbleLeftRight className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-charcoal">{selectedId ? "Carregando conversa..." : "Escolha uma conversa"}</p>
                  <p className="mt-1 max-w-xs text-xs text-charcoal/50">
                    As mensagens chegam sozinhas. Quem ainda não está no CRM pode virar negociação com um clique.
                  </p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
