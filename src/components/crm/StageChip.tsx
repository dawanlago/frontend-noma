import type { LeadStage } from "@/types";

const tones: Record<LeadStage, string> = {
  new: "bg-charcoal/[0.06] text-charcoal/65",
  first_contact: "bg-tan/10 text-tan",
  meeting: "bg-tan/10 text-tan",
  proposal_sent: "bg-gold/10 text-gold",
  awaiting: "bg-gold/10 text-gold",
  negotiation: "bg-burgundy/10 text-burgundy",
  won: "bg-sage/15 text-sage",
};

export default function StageChip({ stage, label }: { stage: LeadStage; label: string }) {
  return <span className={`chip whitespace-nowrap ${tones[stage]}`}>{label}</span>;
}
