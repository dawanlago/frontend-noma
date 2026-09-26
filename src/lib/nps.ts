/** Mensagem padrão do convite de NPS (usada quando a pesquisa não tem uma própria). */
export const DEFAULT_NPS_MESSAGE = "Olá, {nome}! Pode nos contar como foi a sua experiência? Leva menos de 1 minuto: {link}";

/** Troca {nome}, {link} e {pesquisa}; sem {link} no texto, o link vai no final. */
export function renderNpsMessage(template: string | undefined, values: { nome: string; link: string; pesquisa: string }) {
  const text = (template || "").trim() || DEFAULT_NPS_MESSAGE;
  const filled = text
    .replace(/\{nome\}/gi, values.nome)
    .replace(/\{pesquisa\}/gi, values.pesquisa)
    .replace(/\{link\}/gi, values.link);
  return /\{link\}/i.test(text) ? filled : `${filled}\n${values.link}`;
}
