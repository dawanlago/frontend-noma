import { api } from "@/lib/api";
import { maskPhone } from "@/utils/format";

/** Situação da Z-API da empresa ativa. */
export interface WhatsAppStatus {
  /** Integração ativa e com instância + token preenchidos. */
  configured: boolean;
  connected: boolean;
  smartphoneConnected: boolean;
  error: string;
}

export interface WhatsAppChat {
  _id: string;
  /** DDI + DDD + número, só dígitos. */
  phone: string;
  /** Nome exibido no WhatsApp. */
  name: string;
  photo: string;
  lastMessageText: string;
  lastMessageAt?: string;
  lastFromMe: boolean;
  unread: number;
  contact: { _id: string; name: string; phone: string; photo: string } | null;
  /** Negociação aberta mais recente do contato. */
  lead: { _id: string; name: string; status: string; funnelId: string; stageId: string } | null;
}

export type WhatsAppMessageKind = "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contact" | "other";
export type WhatsAppMessageStatus = "PENDING" | "SENT" | "RECEIVED" | "READ" | "PLAYED" | "FAILED";

export interface WhatsAppMessage {
  _id: string;
  messageId: string;
  fromMe: boolean;
  kind: WhatsAppMessageKind;
  text: string;
  mediaUrl: string;
  fileName: string;
  status: WhatsAppMessageStatus;
  error: string;
  senderName: string;
  sentByName: string;
  at: string;
}

export interface WhatsAppMessagePage {
  chat: WhatsAppChat;
  /** Da mais antiga para a mais nova. */
  messages: WhatsAppMessage[];
  hasMore: boolean;
}

export const whatsappApi = {
  status: async () => (await api.get<{ data: WhatsAppStatus }>("/whatsapp/status")).data.data,
  chats: async (params: { q?: string; unread?: boolean } = {}) =>
    (
      await api.get<{ data: { items: WhatsAppChat[]; unreadChats: number } }>("/whatsapp/chats", {
        params: { q: params.q || undefined, unread: params.unread ? "1" : undefined },
      })
    ).data.data,
  messages: async (chatId: string, params: { before?: string; limit?: number } = {}) =>
    (await api.get<{ data: WhatsAppMessagePage }>(`/whatsapp/chats/${chatId}/messages`, { params })).data.data,
  send: async (chatId: string, text: string) =>
    (await api.post<{ data: WhatsAppMessage }>(`/whatsapp/chats/${chatId}/messages`, { text })).data.data,
  /** Começa uma conversa com um número (devolve a conversa). */
  sendToPhone: async (phone: string, text: string) =>
    (await api.post<{ data: WhatsAppChat }>("/whatsapp/send", { phone, text })).data.data,
  markRead: async (chatId: string) => {
    await api.post(`/whatsapp/chats/${chatId}/read`);
  },
  createLead: async (chatId: string) =>
    (await api.post<{ data: { contactId: string; leadId: string; created: boolean } }>(`/whatsapp/chats/${chatId}/lead`)).data.data,
};

/** Número legível: (11) 99999-9999 no Brasil; +DDI ... nos outros. */
export function formatWhatsAppPhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return maskPhone(digits.slice(2));
  return digits ? `+${digits}` : "";
}

/** Nome para mostrar: contato da base, nome no WhatsApp ou o número. */
export function chatTitle(chat: WhatsAppChat) {
  return chat.contact?.name || chat.name || formatWhatsAppPhone(chat.phone);
}

/** Hora (hoje), "Ontem" ou data curta. */
export function chatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (date.getTime() >= startOfToday - 86_400_000) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export const MESSAGE_STATUS_LABELS: Record<WhatsAppMessageStatus, string> = {
  PENDING: "Enviando",
  SENT: "Enviada",
  RECEIVED: "Entregue",
  READ: "Lida",
  PLAYED: "Ouvida",
  FAILED: "Não enviada",
};
