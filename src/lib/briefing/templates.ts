export type BriefingType = "social" | "event" | "institutional" | "product" | "testimonial" | "other";

export type BriefingFieldKind = "text" | "textarea" | "number" | "date" | "time" | "select";

export interface BriefingField {
  key: string;
  label: string;
  kind: BriefingFieldKind;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  full?: boolean;
}

export interface BriefingTemplate {
  type: BriefingType;
  title: string;
  description: string;
  sectionTitle: string;
  fields: BriefingField[];
}

const YES_NO_TBD = ["Não", "Sim", "A definir"];

export const BRIEFING_TEMPLATES: Record<BriefingType, BriefingTemplate> = {
  social: {
    type: "social",
    title: "Conteúdo mensal",
    description: "Reels, conteúdo recorrente e redes sociais.",
    sectionTitle: "Conteúdo mensal",
    fields: [
      { key: "videoCount", label: "Quantidade de vídeos", kind: "number", defaultValue: "4" },
      { key: "duration", label: "Duração média", kind: "text", defaultValue: "Até 60 segundos" },
      { key: "participants", label: "Quem vai participar?", kind: "text", placeholder: "Ex.: sócia, equipe de atendimento" },
      { key: "script", label: "Precisa de roteiro?", kind: "select", options: ["Sim", "Não", "Parcialmente"] },
      {
        key: "topics",
        label: "Temas ou assuntos principais",
        kind: "textarea",
        full: true,
        placeholder: "Ex.: bastidores, dúvidas frequentes, lançamentos do mês",
      },
      {
        key: "campaign",
        label: "Existe campanha específica?",
        kind: "textarea",
        full: true,
        placeholder: "Datas comemorativas, promoções ou lançamentos que precisam entrar no calendário",
      },
    ],
  },
  event: {
    type: "event",
    title: "Evento",
    description: "Palestras, entrevistas e cobertura.",
    sectionTitle: "Detalhes do evento",
    fields: [
      { key: "date", label: "Data do evento", kind: "date" },
      { key: "location", label: "Local", kind: "text", placeholder: "Nome e endereço do local" },
      { key: "time", label: "Horário", kind: "text", placeholder: "Ex.: 19h às 23h" },
      { key: "audience", label: "Público estimado", kind: "text", placeholder: "Ex.: 300 pessoas" },
      {
        key: "mustHave",
        label: "Momentos obrigatórios",
        kind: "textarea",
        full: true,
        placeholder: "Abertura, palestra principal, premiação, fotos com convidados...",
      },
      {
        key: "deliverables",
        label: "Entregas desejadas",
        kind: "textarea",
        full: true,
        placeholder: "Ex.: aftermovie de 1 minuto + 3 reels + fotos",
      },
      { key: "sameDay", label: "Precisa entrega no mesmo dia?", kind: "select", options: YES_NO_TBD },
      { key: "onSiteContact", label: "Contato responsável no local", kind: "text", placeholder: "Nome e telefone" },
    ],
  },
  institutional: {
    type: "institutional",
    title: "Institucional",
    description: "Empresa, marca ou estrutura.",
    sectionTitle: "Vídeo institucional",
    fields: [
      { key: "duration", label: "Duração desejada", kind: "text", placeholder: "Ex.: 2 a 3 minutos" },
      { key: "interviewees", label: "Quem será entrevistado?", kind: "text", placeholder: "Ex.: CEO e gerente de operações" },
      {
        key: "mainMessage",
        label: "Mensagem principal",
        kind: "textarea",
        full: true,
        placeholder: "O que a pessoa precisa sentir ou entender ao final do vídeo?",
      },
      {
        key: "areas",
        label: "Áreas que precisam aparecer",
        kind: "textarea",
        full: true,
        placeholder: "Recepção, fábrica, laboratório, equipe comercial...",
      },
      { key: "voiceOver", label: "Precisa de locução?", kind: "select", options: YES_NO_TBD },
      { key: "archive", label: "Existe material de arquivo?", kind: "select", options: YES_NO_TBD },
    ],
  },
  product: {
    type: "product",
    title: "Produto",
    description: "Demonstração, lançamento ou campanha.",
    sectionTitle: "Produto",
    fields: [
      { key: "product", label: "Produto", kind: "text", placeholder: "Nome do produto" },
      { key: "variations", label: "Quantos produtos/variações?", kind: "number", placeholder: "1" },
      { key: "benefits", label: "Principais benefícios", kind: "textarea", full: true },
      {
        key: "details",
        label: "Detalhes que precisam aparecer",
        kind: "textarea",
        full: true,
        placeholder: "Texturas, embalagem, funcionamento, acessórios...",
      },
      { key: "style", label: "Estilo desejado", kind: "select", options: ["Clean", "Lifestyle", "Comercial", "Premium", "A definir"] },
      { key: "model", label: "Precisa de modelo/pessoa?", kind: "select", options: YES_NO_TBD },
    ],
  },
  testimonial: {
    type: "testimonial",
    title: "Depoimento",
    description: "Case, cliente, prova social.",
    sectionTitle: "Depoimento",
    fields: [
      { key: "interviewee", label: "Nome do entrevistado", kind: "text" },
      { key: "relation", label: "Cargo/relação com a empresa", kind: "text", placeholder: "Ex.: cliente há 3 anos" },
      {
        key: "story",
        label: "História que queremos contar",
        kind: "textarea",
        full: true,
        placeholder: "Qual era o problema, o que mudou e qual foi o resultado?",
      },
      {
        key: "questions",
        label: "Perguntas principais",
        kind: "textarea",
        full: true,
        defaultValue: [
          "1. Como era a situação antes de conhecer a empresa?",
          "2. Por que decidiu escolher esta empresa?",
          "3. Como foi a experiência durante o processo?",
          "4. Qual resultado você percebeu depois?",
        ].join("\n"),
      },
      { key: "broll", label: "Precisa de imagens de apoio?", kind: "select", options: ["Sim", "Não", "A definir"] },
    ],
  },
  other: {
    type: "other",
    title: "Outro",
    description: "Projetos personalizados.",
    sectionTitle: "Detalhes do projeto",
    fields: [
      { key: "description", label: "Descrição do projeto", kind: "textarea", full: true },
      { key: "deliverables", label: "Entregas esperadas", kind: "textarea", full: true },
      { key: "technical", label: "Requisitos técnicos", kind: "textarea", full: true, placeholder: "Formato, resolução, idioma, legendas..." },
      { key: "extra", label: "Informações adicionais", kind: "textarea", full: true },
    ],
  },
};

export const BRIEFING_TYPES = Object.keys(BRIEFING_TEMPLATES) as BriefingType[];

export const DELIVERY_FORMATS = ["Vertical 9:16", "Horizontal 16:9", "Quadrado 1:1", "Formatos variados"];
export const REVISION_OPTIONS = ["1", "2", "3", "A definir"];
export const PUBLISH_CHANNELS = ["Instagram", "Instagram + TikTok", "YouTube", "Site/institucional", "Outro"];

/** Valores iniciais de cada tipo (selects começam vazios, para o contador refletir o que foi respondido). */
export function defaultSpecific(type: BriefingType): Record<string, string> {
  return Object.fromEntries(
    BRIEFING_TEMPLATES[type].fields.map((field) => [field.key, field.defaultValue ?? ""]),
  );
}
