/** Utilitários de texto usados pelos geradores de mensagem (Follow-up e Prospecção). */

/** Remove espaços extras e quebras de linha. */
export function clean(value: string | undefined | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

/** Primeiro nome, para cumprimentos ("Ana Paula Souza" → "Ana"). */
export function firstName(value: string | undefined | null) {
  return clean(value).split(" ")[0] || "";
}

/**
 * Deixa a primeira letra minúscula para encaixar o termo no meio da frase
 * ("Vídeo institucional" → "vídeo institucional"), preservando siglas e nomes
 * que começam com duas maiúsculas ("TV", "SP").
 */
export function lowerFirst(value: string) {
  const text = clean(value);
  if (text.length < 2) return text.toLowerCase();
  if (text[1] === text[1].toUpperCase() && /[A-ZÀ-Ý]/.test(text[1])) return text;
  return text[0].toLowerCase() + text.slice(1);
}

/** Garante pontuação final em um trecho digitado pela pessoa. */
export function sentence(value: string) {
  const text = clean(value);
  if (!text) return "";
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

/** Junta parágrafos ignorando os vazios. */
export function paragraphs(items: Array<string | false | null | undefined>, separator = "\n\n") {
  return items.filter((item): item is string => Boolean(item && item.trim())).join(separator);
}
