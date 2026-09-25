/** Opções e estado do Gerador de Follow-up (rascunho local, sem servidor). */

export type FollowupSituation =
  | "proposal_silent"
  | "analyzing"
  | "internal_approval"
  | "price_objection"
  | "later"
  | "no_reply_again"
  | "reactivate";

export type FollowupTiming = "2-3" | "5-7" | "10-14" | "15+";
export type FollowupChannel = "whatsapp" | "instagram" | "email";

export interface FollowupForm {
  situation: FollowupSituation;
  timing: FollowupTiming;
  channel: FollowupChannel;
  clientName: string;
  company: string;
  service: string;
  agreed: string;
}

export const DEFAULT_FOLLOWUP: FollowupForm = {
  situation: "proposal_silent",
  timing: "5-7",
  channel: "whatsapp",
  clientName: "",
  company: "",
  service: "",
  agreed: "",
};

export const SITUATION_OPTIONS: { value: FollowupSituation; title: string; description: string }[] = [
  {
    value: "proposal_silent",
    title: "Apresentei a proposta e o cliente sumiu",
    description: "Você apresentou os valores e não teve resposta.",
  },
  {
    value: "analyzing",
    title: "O cliente disse que iria analisar",
    description: "Ficou de avaliar com calma e dar um retorno.",
  },
  {
    value: "internal_approval",
    title: "Precisa de aprovação interna",
    description: "Depende de sócio, diretoria ou financeiro.",
  },
  {
    value: "price_objection",
    title: "O cliente achou o valor alto",
    description: "Gostou da proposta, mas travou no investimento.",
  },
  {
    value: "later",
    title: "O cliente pediu para falar mais pra frente",
    description: "O projeto existe, mas não é para agora.",
  },
  {
    value: "no_reply_again",
    title: "Já fiz follow-up e continuo sem resposta",
    description: "Você já tentou retomar e segue no silêncio.",
  },
  {
    value: "reactivate",
    title: "Quero reativar um contato antigo",
    description: "Um cliente ou lead com quem você não fala há tempo.",
  },
];

export const TIMING_OPTIONS: { value: FollowupTiming; label: string }[] = [
  { value: "2-3", label: "2 a 3 dias" },
  { value: "5-7", label: "5 a 7 dias" },
  { value: "10-14", label: "10 a 14 dias" },
  { value: "15+", label: "15 dias ou mais" },
];

export const CHANNEL_OPTIONS: { value: FollowupChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram / Direct" },
  { value: "email", label: "E-mail" },
];
