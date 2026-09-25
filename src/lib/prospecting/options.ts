/** Opções e estado do Gerador de Prospecção (rascunho local, sem servidor). */

import type { CustomValues } from "@/types";

export type ProspectChannel = "instagram" | "whatsapp" | "email" | "linkedin";
export type ProspectStyle = "natural" | "direct" | "consultive";

/**
 * Segmento, origem, oportunidades e objetivo guardam o `value` das listas
 * configuráveis (Configurações → Listas de opções / Mensagens da prospecção).
 */
export interface ProspectForm {
  channel: ProspectChannel;
  company: string;
  person: string;
  segment: string;
  source: string;
  observation: string;
  /** Uma ou mais oportunidades; a primeira conduz a mensagem. */
  opportunities: string[];
  goal: string;
  idea: string;
  custom: CustomValues;
}

export const DEFAULT_PROSPECT: ProspectForm = {
  channel: "instagram",
  company: "",
  person: "",
  segment: "restaurant",
  source: "instagram",
  observation: "",
  opportunities: ["recurring_content"],
  goal: "start_conversation",
  idea: "",
  custom: {},
};

/** Rascunhos antigos tinham uma única `opportunity`. */
export function normalizeProspect(form: ProspectForm & { opportunity?: string }): ProspectForm {
  const opportunities = Array.isArray(form.opportunities) && form.opportunities.length
    ? form.opportunities
    : form.opportunity
      ? [form.opportunity]
      : DEFAULT_PROSPECT.opportunities;
  return { ...DEFAULT_PROSPECT, ...form, opportunities, custom: form.custom || {} };
}

export const CHANNEL_OPTIONS: { value: ProspectChannel; title: string; description: string }[] = [
  { value: "instagram", title: "Instagram / Direct", description: "Mensagem curta e natural, como uma conversa." },
  { value: "whatsapp", title: "WhatsApp", description: "Quando você já tem o número, por indicação ou pelo site." },
  { value: "email", title: "E-mail", description: "Um pouco mais completa e profissional, com assunto." },
  { value: "linkedin", title: "LinkedIn", description: "Objetiva, com foco no negócio." },
];

export const CHANNEL_LABELS: Record<ProspectChannel, string> = {
  instagram: "Instagram / Direct",
  whatsapp: "WhatsApp",
  email: "E-mail",
  linkedin: "LinkedIn",
};

export const STYLES: { id: ProspectStyle; label: string; hint: string }[] = [
  { id: "natural", label: "Mais natural / Conversa", hint: "Soa como uma conversa, sem cara de venda." },
  { id: "direct", label: "Mais direta / Objetiva", hint: "Diz logo o que a produtora faz e o que propõe." },
  { id: "consultive", label: "Mais consultiva / Diagnóstico", hint: "Mostra repertório e abre com uma pergunta." },
];

export type StyleTexts = Record<ProspectStyle, string>;

/**
 * Mensagens padrão de cada oportunidade. `{angulo}` vira o que o vídeo pode
 * mostrar do segmento; `{empresa}`, `{pessoa}` e `{chave}` dos campos
 * personalizados também funcionam. Editáveis em Configurações.
 */
export const DEFAULT_OPPORTUNITY_MESSAGES: Record<string, StyleTexts> = {
  recurring_content: {
    natural: "Fiquei pensando que um conteúdo em vídeo mais constante mostraria muito bem {angulo}.",
    direct: "Produzimos conteúdo recorrente em vídeo para redes sociais e vejo espaço para mostrar mais {angulo}.",
    consultive: "Um calendário de vídeos recorrentes poderia dar mais constância ao perfil e destacar {angulo}.",
  },
  institutional: {
    natural: "Fiquei imaginando um vídeo institucional contando a história de vocês e mostrando {angulo}.",
    direct: "Produzimos vídeos institucionais, e um vídeo apresentando {angulo} funcionaria muito bem para vocês.",
    consultive:
      "Um vídeo institucional bem construído ajudaria a apresentar {angulo} para quem ainda não conhece vocês — no site, nas redes e em reuniões.",
  },
  event_coverage: {
    natural: "Fiquei pensando em como uma cobertura em vídeo dos eventos de vocês renderia conteúdo por muito tempo.",
    direct: "Fazemos cobertura de eventos em vídeo, e os próximos eventos de vocês renderiam um material muito bom.",
    consultive:
      "Um evento bem registrado vira conteúdo para semanas: aftermovie, cortes para as redes e material para divulgar a próxima edição.",
  },
  product: {
    natural: "Fiquei imaginando vídeos curtos mostrando {angulo} de um jeito mais vivo do que a foto.",
    direct: "Produzimos conteúdo de produto em vídeo e dá para valorizar muito {angulo}.",
    consultive:
      "Vídeo de produto costuma converter melhor do que foto parada, principalmente quando mostra detalhe, uso e textura — e isso combina com {angulo}.",
  },
  testimonials: {
    natural: "Fiquei pensando que depoimentos em vídeo de clientes de vocês seriam uma forma muito verdadeira de mostrar {angulo}.",
    direct: "Produzimos vídeos de depoimento de clientes, e esse formato funcionaria muito bem para mostrar {angulo}.",
    consultive:
      "Depoimento em vídeo é um dos formatos que mais geram confiança, porque quem fala é o cliente — seria uma forma forte de mostrar {angulo}.",
  },
  photo_video: {
    natural: "Fiquei imaginando uma produção de foto e vídeo juntos, mostrando {angulo}, que já resolvesse o conteúdo de algumas semanas.",
    direct: "Trabalhamos com foto e vídeo na mesma produção, e dá para registrar {angulo} de uma vez só.",
    consultive: "Uma diária de foto e vídeo costuma render material para vários meses — seria uma boa forma de registrar {angulo}.",
  },
  unsure: {
    natural: "Fiquei com vontade de saber como vocês pensam o vídeo na comunicação da empresa.",
    direct: "Queria entender se vídeo faz parte dos planos de vocês para os próximos meses.",
    consultive: "Antes de sugerir qualquer coisa, queria entender melhor como vocês usam vídeo hoje.",
  },
};

/** Mensagem usada por oportunidades novas até alguém escrever as próprias. */
export const GENERIC_OPPORTUNITY_MESSAGES: StyleTexts = {
  natural: "Fiquei pensando em como {oportunidade} poderia mostrar muito bem {angulo}.",
  direct: "Trabalhamos com {oportunidade} e vejo espaço para mostrar mais {angulo}.",
  consultive: "Um projeto de {oportunidade} poderia ajudar vocês a destacar {angulo} com mais consistência.",
};

/** Frase final (chamada) de cada objetivo. */
export const DEFAULT_GOAL_CTA: Record<string, StyleTexts> = {
  start_conversation: {
    natural: "Faz sentido para vocês pensar em algo assim?",
    direct: "Isso está nos planos de vocês para os próximos meses?",
    consultive: "Se fizer sentido, te conto como a gente estruturaria isso.",
  },
  meeting: {
    natural: "Topa uma conversa rápida essa semana? Uns 15 minutos já bastam.",
    direct: "Consegue 15 minutos esta semana para eu te mostrar como funcionaria?",
    consultive: "Se fizer sentido, podemos marcar 15 minutos para eu entender o momento de vocês e mostrar alguns caminhos?",
  },
  present_idea: {
    natural: "Posso te mandar a ideia com um pouco mais de detalhe?",
    direct: "Posso te enviar a ideia resumida em tópicos?",
    consultive: "Se quiser, monto a ideia em uma página, com formato e frequência, para vocês avaliarem com calma.",
  },
  portfolio: {
    natural: "Posso te mandar alguns trabalhos parecidos que já fizemos?",
    direct: "Posso te enviar 2 ou 3 trabalhos parecidos para você ter uma referência?",
    consultive: "Posso te enviar alguns trabalhos feitos para negócios parecidos com o de vocês, para ver se o estilo combina?",
  },
  marketing_contact: {
    natural: "Você saberia me dizer quem cuida do marketing aí? Queria falar com a pessoa certa.",
    direct: "Quem é a pessoa responsável pelo marketing? Posso falar direto com ela.",
    consultive: "Para não tomar seu tempo, quem seria a melhor pessoa para conversar sobre a comunicação de vocês?",
  },
};

export const GENERIC_GOAL_CTA: StyleTexts = DEFAULT_GOAL_CTA.start_conversation;

/** Lê as mensagens salvas no item da lista (meta.messages / meta.cta), com o padrão como base. */
export function styleTexts(meta: Record<string, unknown> | undefined, key: "messages" | "cta", fallback: StyleTexts): StyleTexts {
  const saved = (meta?.[key] || {}) as Partial<StyleTexts>;
  return {
    natural: saved.natural?.trim() || fallback.natural,
    direct: saved.direct?.trim() || fallback.direct,
    consultive: saved.consultive?.trim() || fallback.consultive,
  };
}
