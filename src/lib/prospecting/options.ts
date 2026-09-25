/** Opções e estado do Gerador de Prospecção (rascunho local, sem servidor). */

export type ProspectChannel = "instagram" | "whatsapp" | "email" | "linkedin";
export type ProspectSegment =
  | "restaurant"
  | "fitness"
  | "health"
  | "industry"
  | "architecture"
  | "retail"
  | "services"
  | "other";
export type ProspectSource = "instagram" | "referral" | "google" | "event" | "local" | "other";
export type ProspectOpportunity =
  | "recurring_content"
  | "institutional"
  | "event_coverage"
  | "product"
  | "testimonials"
  | "photo_video"
  | "unsure";
export type ProspectGoal = "start_conversation" | "meeting" | "present_idea" | "portfolio" | "marketing_contact";

export interface ProspectForm {
  channel: ProspectChannel;
  company: string;
  person: string;
  segment: ProspectSegment;
  source: ProspectSource;
  observation: string;
  opportunity: ProspectOpportunity;
  goal: ProspectGoal;
  idea: string;
}

export const DEFAULT_PROSPECT: ProspectForm = {
  channel: "instagram",
  company: "",
  person: "",
  segment: "restaurant",
  source: "instagram",
  observation: "",
  opportunity: "recurring_content",
  goal: "start_conversation",
  idea: "",
};

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

export const SEGMENT_OPTIONS: { value: ProspectSegment; label: string }[] = [
  { value: "restaurant", label: "Restaurante/Gastronomia" },
  { value: "fitness", label: "Academia/Fitness" },
  { value: "health", label: "Clínica/Saúde" },
  { value: "industry", label: "Indústria" },
  { value: "architecture", label: "Arquitetura/Construção" },
  { value: "retail", label: "Loja/Varejo" },
  { value: "services", label: "Prestador de serviços" },
  { value: "other", label: "Outro" },
];

export const SOURCE_OPTIONS: { value: ProspectSource; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "referral", label: "Indicação" },
  { value: "google", label: "Google" },
  { value: "event", label: "Evento/networking" },
  { value: "local", label: "Cliente da região" },
  { value: "other", label: "Outro" },
];

export const OPPORTUNITY_OPTIONS: { value: ProspectOpportunity; label: string }[] = [
  { value: "recurring_content", label: "Conteúdo recorrente para redes sociais" },
  { value: "institutional", label: "Vídeo institucional" },
  { value: "event_coverage", label: "Cobertura de evento" },
  { value: "product", label: "Conteúdo de produto" },
  { value: "testimonials", label: "Depoimentos de clientes" },
  { value: "photo_video", label: "Fotografia + vídeo" },
  { value: "unsure", label: "Ainda não sei" },
];

export const GOAL_OPTIONS: { value: ProspectGoal; label: string }[] = [
  { value: "start_conversation", label: "Iniciar uma conversa" },
  { value: "meeting", label: "Conseguir uma reunião" },
  { value: "present_idea", label: "Apresentar uma ideia" },
  { value: "portfolio", label: "Enviar portfólio" },
  { value: "marketing_contact", label: "Pedir contato do marketing" },
];

export function labelOf<T extends string>(options: { value: T; label: string }[], value: T) {
  return options.find((option) => option.value === value)?.label || "";
}
