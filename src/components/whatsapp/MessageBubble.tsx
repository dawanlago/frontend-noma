import { MESSAGE_STATUS_LABELS, type WhatsAppMessage } from "@/lib/whatsapp";

const MEDIA_LABELS: Record<string, string> = {
  image: "Imagem",
  audio: "Áudio",
  video: "Vídeo",
  document: "Documento",
  sticker: "Figurinha",
  location: "Localização",
  contact: "Contato",
  other: "Mensagem não suportada",
};

/** Balão de mensagem: enviadas à direita (cor de destaque), recebidas à esquerda. */
export default function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const time = new Date(message.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const failed = message.status === "FAILED";
  return (
    <div className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm sm:max-w-[70%] ${
          message.fromMe ? (failed ? "bg-burgundy/10 text-charcoal" : "bg-tan text-white") : "border border-charcoal/[0.06] bg-surface text-charcoal"
        }`}
      >
        {message.kind === "image" && message.mediaUrl ? (
          <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="mb-1 block overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.mediaUrl} alt={message.text || "Imagem"} className="max-h-64 w-full object-cover" />
          </a>
        ) : message.kind === "audio" && message.mediaUrl ? (
          <audio controls src={message.mediaUrl} className="mb-1 max-w-full" />
        ) : message.kind !== "text" ? (
          <p className={`text-xs font-semibold ${message.fromMe && !failed ? "text-white/80" : "text-charcoal/55"}`}>
            {message.mediaUrl ? (
              <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="underline">
                {MEDIA_LABELS[message.kind]}
              </a>
            ) : (
              MEDIA_LABELS[message.kind]
            )}
          </p>
        ) : null}
        {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
        <p className={`mt-1 text-right text-[10px] ${message.fromMe && !failed ? "text-white/70" : "text-charcoal/40"}`}>
          {message.fromMe && message.sentByName ? `${message.sentByName} · ` : ""}
          {time}
          {message.fromMe ? ` · ${MESSAGE_STATUS_LABELS[message.status] || ""}` : ""}
        </p>
        {failed && message.error ? <p className="mt-0.5 text-[11px] text-burgundy">{message.error}</p> : null}
      </div>
    </div>
  );
}
