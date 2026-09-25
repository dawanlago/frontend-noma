import { clean, firstName, paragraphs, sentence } from "@/lib/followup/text";
import {
  CHANNEL_LABELS,
  GOAL_OPTIONS,
  OPPORTUNITY_OPTIONS,
  labelOf,
  type ProspectChannel,
  type ProspectForm,
  type ProspectGoal,
  type ProspectOpportunity,
  type ProspectSegment,
  type ProspectSource,
} from "./options";

/* -------------------------------------------------------------------------- */
/* Tipos do resultado                                                          */
/* -------------------------------------------------------------------------- */

export type ProspectStyle = "natural" | "direct" | "consultive";
export type BaseQuality = "missing" | "generic" | "good";

export interface ProspectMessage {
  id: ProspectStyle;
  label: string;
  hint: string;
  subject?: string;
  text: string;
}

export interface QualityChip {
  label: string;
  tone: "sage" | "gold" | "burgundy" | "tan";
}

export interface ProspectAssessment {
  quality: BaseQuality;
  title: string;
  text: string;
  chips: QualityChip[];
}

export interface ProspectStep {
  when: string;
  title: string;
  text: string;
}

export interface ProspectResult {
  assessment: ProspectAssessment;
  messages: ProspectMessage[];
  avoid: string[];
  next: string;
  sequence: ProspectStep[];
}

/* -------------------------------------------------------------------------- */
/* Avaliação da observação                                                     */
/* -------------------------------------------------------------------------- */

const GENERIC_PATTERNS = [
  /gostei (muito )?(d[oae]s?|de) ?(seu|teu|sua|vosso)? ?(perfil|trabalho|conte[uú]do|feed|p[aá]gina|instagram|site)/i,
  /\bmuito (bom|boa|legal|lindo|linda|bonito|bonita|top)\b/i,
  /\b(perfil|feed|trabalho|conte[uú]do) (lindo|bonito|incr[ií]vel|top|maravilhoso|show)\b/i,
  /\bparab[eé]ns\b/i,
  /\b(adorei|amei|curti)\b/i,
  /\b(incr[ií]vel|sensacional|maravilhoso|show de bola|top demais)\b/i,
];

/** Classifica a observação: vazia, genérica ou específica (função pura). */
export function assessObservation(observation: string): BaseQuality {
  const text = clean(observation);
  if (!text) return "missing";
  const words = text.split(" ").filter(Boolean).length;
  if (words < 3) return "generic";
  if (words <= 8 && GENERIC_PATTERNS.some((pattern) => pattern.test(text))) return "generic";
  return "good";
}

/* -------------------------------------------------------------------------- */
/* Conteúdo por segmento                                                       */
/* -------------------------------------------------------------------------- */

interface SegmentCopy {
  /** O que o vídeo pode mostrar desse negócio. */
  angle: string;
  /** Frase de abertura quando não há observação específica. */
  hook: string;
  /** Pergunta de diagnóstico (versão consultiva). */
  question: string;
  /** Argumento de negócio (LinkedIn). */
  business: string;
}

const SEGMENTS: Record<ProspectSegment, SegmentCopy> = {
  restaurant: {
    angle: "os pratos e o clima da casa",
    hook: "Em gastronomia, muita gente decide onde comer pelo que vê nas redes antes de sair de casa.",
    question: "Hoje vocês conseguem mostrar os pratos em vídeo com frequência, ou o conteúdo fica mais em foto?",
    business: "Para restaurantes, vídeo costuma influenciar direto a decisão de visita e de pedido no delivery.",
  },
  fitness: {
    angle: "a rotina de treinos e a energia do espaço",
    hook: "Em academia, o que mais convence um aluno novo é ver o ambiente e as pessoas treinando de verdade.",
    question: "Vocês usam vídeo hoje mais para captar alunos novos ou para engajar quem já treina aí?",
    business: "No mercado fitness, vídeo ajuda tanto na captação de alunos quanto na retenção de quem já está na casa.",
  },
  health: {
    angle: "a estrutura e o cuidado no atendimento",
    hook: "Na área da saúde, confiança é tudo — e vídeo ajuda o paciente a conhecer o lugar e os profissionais antes da consulta.",
    question: "Hoje os pacientes chegam até vocês mais por indicação ou pelas redes e pelo Google?",
    business: "Em saúde, conteúdo em vídeo bem feito aumenta a confiança antes do primeiro agendamento.",
  },
  industry: {
    angle: "o processo produtivo e a escala da operação",
    hook: "Em indústria, muitas vezes o cliente não faz ideia do tamanho e do cuidado que existem por trás do produto.",
    question: "Vocês já têm algum material em vídeo para apresentar a empresa em reuniões comerciais ou feiras?",
    business: "Na indústria, um bom vídeo encurta a apresentação comercial e ajuda o time de vendas a mostrar capacidade produtiva.",
  },
  architecture: {
    angle: "os projetos e as obras entregues",
    hook: "Em arquitetura e construção, um antes e depois bem filmado explica mais do que qualquer descrição.",
    question: "Hoje vocês registram as obras em vídeo durante o processo, ou só no final?",
    business: "Em arquitetura e construção, registrar as entregas em vídeo valoriza o portfólio e ajuda a fechar novos projetos.",
  },
  retail: {
    angle: "os produtos e as novidades da loja",
    hook: "No varejo, vídeo curto de produto costuma levar mais gente para a loja do que foto parada.",
    question: "Os lançamentos de vocês hoje ganham conteúdo em vídeo, ou ficam mais na foto?",
    business: "No varejo, vídeo de produto costuma aumentar o interesse e a conversão, tanto na loja física quanto no online.",
  },
  services: {
    angle: "como o serviço funciona na prática",
    hook: "Em serviços, o cliente compra confiança — e mostrar o trabalho acontecendo ajuda muito nisso.",
    question: "Hoje fica claro, para quem chega nas redes de vocês, como o serviço funciona na prática?",
    business: "Para prestadores de serviço, vídeo mostra o processo e reduz a insegurança de quem ainda não contratou.",
  },
  other: {
    angle: "o que vocês fazem de melhor",
    hook: "Vídeo costuma ser a forma mais rápida de alguém entender o que uma empresa faz e por que confiar nela.",
    question: "Vídeo hoje já faz parte da comunicação de vocês, ou ainda está nos planos?",
    business: "Vídeo costuma ser o formato que mais gera atenção e lembrança de marca nos canais digitais.",
  },
};

/* -------------------------------------------------------------------------- */
/* Oportunidade × estilo                                                       */
/* -------------------------------------------------------------------------- */

const OPPORTUNITY: Record<ProspectOpportunity, (a: string) => Record<ProspectStyle, string>> = {
  recurring_content: (a) => ({
    natural: `Fiquei pensando que um conteúdo em vídeo mais constante mostraria muito bem ${a}.`,
    direct: `Trabalho com conteúdo recorrente em vídeo para redes sociais e vejo espaço para mostrar mais ${a}.`,
    consultive: `Um calendário de vídeos recorrentes poderia dar mais constância ao perfil e destacar ${a}.`,
  }),
  institutional: (a) => ({
    natural: `Fiquei imaginando um vídeo institucional contando a história de vocês e mostrando ${a}.`,
    direct: `Produzo vídeos institucionais, e um vídeo apresentando ${a} funcionaria muito bem para vocês.`,
    consultive: `Um vídeo institucional bem construído ajudaria a apresentar ${a} para quem ainda não conhece vocês — no site, nas redes e em reuniões.`,
  }),
  event_coverage: () => ({
    natural: "Fiquei pensando em como uma cobertura em vídeo dos eventos de vocês renderia conteúdo por muito tempo.",
    direct: "Faço cobertura de eventos em vídeo, e os próximos eventos de vocês renderiam um material muito bom.",
    consultive: "Um evento bem registrado vira conteúdo para semanas: aftermovie, cortes para as redes e material para divulgar a próxima edição.",
  }),
  product: (a) => ({
    natural: `Fiquei imaginando vídeos curtos mostrando ${a} de um jeito mais vivo do que a foto.`,
    direct: `Produzo conteúdo de produto em vídeo e dá para valorizar muito ${a}.`,
    consultive: `Vídeo de produto costuma converter melhor do que foto parada, principalmente quando mostra detalhe, uso e textura — e isso combina com ${a}.`,
  }),
  testimonials: (a) => ({
    natural: `Fiquei pensando que depoimentos em vídeo de clientes de vocês seriam uma forma muito verdadeira de mostrar ${a}.`,
    direct: `Produzo vídeos de depoimento de clientes, e esse formato funcionaria muito bem para mostrar ${a}.`,
    consultive: `Depoimento em vídeo é um dos formatos que mais geram confiança, porque quem fala é o cliente — seria uma forma forte de mostrar ${a}.`,
  }),
  photo_video: (a) => ({
    natural: `Fiquei imaginando uma produção de foto e vídeo juntos, mostrando ${a}, que já resolvesse o conteúdo de algumas semanas.`,
    direct: `Trabalho com foto e vídeo na mesma produção, e dá para registrar ${a} de uma vez só.`,
    consultive: `Uma diária de foto e vídeo costuma render material para vários meses — seria uma boa forma de registrar ${a}.`,
  }),
  unsure: () => ({
    natural: "Fiquei com vontade de saber como vocês pensam o vídeo na comunicação da empresa.",
    direct: "Queria entender se vídeo faz parte dos planos de vocês para os próximos meses.",
    consultive: "Antes de sugerir qualquer coisa, queria entender melhor como vocês usam vídeo hoje.",
  }),
};

/* -------------------------------------------------------------------------- */
/* Objetivo × estilo                                                           */
/* -------------------------------------------------------------------------- */

const CTA: Record<ProspectGoal, Record<ProspectStyle, string>> = {
  start_conversation: {
    natural: "Faz sentido para vocês pensar em algo assim?",
    direct: "Isso está nos planos de vocês para os próximos meses?",
    consultive: "Se fizer sentido, te conto como eu estruturaria isso.",
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
    natural: "Posso te mandar alguns trabalhos parecidos que já fiz?",
    direct: "Posso te enviar 2 ou 3 trabalhos parecidos para você ter uma referência?",
    consultive: "Posso te enviar alguns trabalhos feitos para negócios parecidos com o de vocês, para ver se o estilo combina?",
  },
  marketing_contact: {
    natural: "Você saberia me dizer quem cuida do marketing aí? Queria falar com a pessoa certa.",
    direct: "Quem é a pessoa responsável pelo marketing? Posso falar direto com ela.",
    consultive: "Para não tomar seu tempo, quem seria a melhor pessoa para conversar sobre a comunicação de vocês?",
  },
};

/* -------------------------------------------------------------------------- */
/* Montagem por canal                                                          */
/* -------------------------------------------------------------------------- */

interface Ctx {
  channel: ProspectChannel;
  person: string;
  company: string;
  senderFirst: string;
  senderFull: string;
  source: ProspectSource;
  quality: BaseQuality;
  observation: string;
  idea: string;
  segment: SegmentCopy;
  opportunity: Record<ProspectStyle, string>;
  opportunityKey: ProspectOpportunity;
  goal: ProspectGoal;
}

function greeting(c: Ctx) {
  const who = c.person || (c.company ? `equipe ${c.company}` : "");
  if (c.channel === "instagram") return who ? `Oi, ${who}! Tudo bem?` : "Oi! Tudo bem?";
  if (c.channel === "whatsapp") return who ? `Oi, ${who}, tudo bem?` : "Oi, tudo bem?";
  return who ? `Olá, ${who}, tudo bem?` : "Olá, tudo bem?";
}

function sourceSentence(c: Ctx) {
  switch (c.source) {
    case "referral":
      return c.person ? "Recebi seu contato por indicação." : "Recebi o contato de vocês por indicação.";
    case "instagram":
      return c.channel === "instagram" ? "Conheci o perfil de vocês por aqui." : "Conheci vocês pelo Instagram.";
    case "google":
      return "Encontrei vocês pesquisando no Google.";
    case "event":
      return "Conheci vocês em um evento recente.";
    case "local":
      return "Também trabalho aqui na região.";
    default:
      return "";
  }
}

function selfIntro(c: Ctx, style: ProspectStyle) {
  switch (c.channel) {
    case "instagram":
      // No Direct, a apresentação é mínima; na versão natural só aparece com indicação.
      return style === "natural" && c.source !== "referral" ? "" : "Sou videomaker.";
    case "whatsapp":
      return c.senderFirst ? `Aqui é ${c.senderFirst}, sou videomaker.` : "Sou videomaker.";
    case "email":
      return c.senderFull ? `Meu nome é ${c.senderFull} e sou videomaker.` : "Sou videomaker.";
    case "linkedin":
      return c.senderFull
        ? `Me chamo ${c.senderFull} e trabalho com produção de vídeo para empresas.`
        : "Trabalho com produção de vídeo para empresas.";
  }
}

function observationLine(c: Ctx, style: ProspectStyle) {
  if (c.quality !== "good") return c.segment.hook;
  const frames: Record<ProspectStyle, string> = {
    natural: "Uma coisa me chamou atenção:",
    direct: "Reparei o seguinte:",
    consultive: "Olhando a comunicação de vocês, anotei um ponto:",
  };
  return `${frames[style]} ${c.observation}`;
}

function ideaLine(c: Ctx, style: ProspectStyle) {
  if (!c.idea) return "";
  const frames: Record<ProspectStyle, string> = {
    natural: "Tive até uma ideia:",
    direct: "Uma ideia concreta:",
    consultive: "Uma hipótese que eu testaria:",
  };
  return `${frames[style]} ${c.idea}`;
}

function emailSubject(c: Ctx, style: ProspectStyle) {
  const opportunity = labelOf(OPPORTUNITY_OPTIONS, c.opportunityKey);
  if (style === "natural") return c.company ? `Uma ideia para ${c.company}` : "Uma ideia de vídeo para vocês";
  if (style === "direct") {
    const topic = c.opportunityKey === "unsure" ? "Produção de vídeo" : opportunity;
    return c.company ? `${topic} para ${c.company}` : topic;
  }
  return c.company ? `${c.company}: uma observação sobre o conteúdo em vídeo` : "Uma observação sobre o conteúdo de vocês";
}

function compose(c: Ctx, style: ProspectStyle): { subject?: string; text: string } {
  const intro = [selfIntro(c, style), sourceSentence(c)].filter(Boolean).join(" ");
  const obs = observationLine(c, style);
  const opp = c.opportunity[style];
  const idea = ideaLine(c, style);
  const question = style === "consultive" ? c.segment.question : "";
  const cta = CTA[c.goal][style];
  const hello = greeting(c);

  switch (c.channel) {
    case "instagram":
      return {
        text: paragraphs([
          intro ? `${hello} ${intro}` : hello,
          `${obs} ${opp}`,
          idea,
          question,
          cta,
        ]),
      };
    case "whatsapp":
      return {
        text: paragraphs([`${hello} ${intro}`, `${obs} ${opp}`, idea, question, cta]),
      };
    case "linkedin":
      return {
        text: paragraphs([
          `${hello} ${intro}`,
          style === "direct" ? (c.quality === "good" ? `${c.segment.business} ${obs}` : c.segment.business) : obs,
          opp,
          idea,
          question,
          cta,
        ]),
      };
    case "email": {
      const signature = c.senderFull || "[seu nome]";
      const portfolioLine = c.goal === "portfolio" ? "Portfólio: [link do seu portfólio]" : "";
      return {
        subject: emailSubject(c, style),
        text: paragraphs([
          hello,
          intro,
          `${obs} ${opp}`,
          style === "consultive" ? c.segment.business : "",
          idea,
          question,
          cta,
          paragraphs([`Um abraço,\n${signature}`, portfolioLine], "\n"),
        ]),
      };
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Dicas                                                                       */
/* -------------------------------------------------------------------------- */

const AVOID_BY_GOAL: Record<ProspectGoal, string> = {
  start_conversation:
    "Mandar tabela de preços ou pacote fechado logo de cara. O objetivo aqui é abrir conversa, não vender na primeira mensagem.",
  meeting: "Pedir uma reunião longa ou sem pauta. Ofereça 15 minutos e diga o que vai mostrar.",
  present_idea: "Descrever a ideia inteira num textão. Mostre o suficiente para gerar curiosidade e deixe o detalhe para depois.",
  portfolio: "Mandar o link do portfólio sem contexto. Escolha 2 ou 3 trabalhos parecidos com o que essa empresa precisa.",
  marketing_contact: "Fazer a oferta completa para quem não decide. Seja breve e peça só a indicação da pessoa certa.",
};

const AVOID_BY_CHANNEL: Record<ProspectChannel, string> = {
  instagram: "Mandar áudio ou várias mensagens seguidas no primeiro contato pelo Direct.",
  whatsapp: "Ligar sem avisar ou mandar áudio longo para um número que ainda não te conhece.",
  email: "Anexar arquivos pesados. Prefira um link e um assunto claro, sem letras maiúsculas ou “URGENTE”.",
  linkedin: "Enviar a proposta comercial junto com o pedido de conexão.",
};

const NEXT_BY_GOAL: Record<ProspectGoal, string> = {
  start_conversation:
    "Se responder, faça perguntas sobre o momento da empresa antes de falar de preço. Registre o lead no CRM para não perder o fio.",
  meeting:
    "Se aceitar, confirme dia e horário por escrito e separe 2 ou 3 referências parecidas. Use o Gerador de Briefing para conduzir a conversa.",
  present_idea: "Se houver interesse, envie a ideia em tópicos curtos ou num roteiro simples de uma página.",
  portfolio:
    "Depois de enviar, pergunte qual trabalho mais chamou atenção — isso revela o que o cliente valoriza e orienta a proposta.",
  marketing_contact:
    "Quando receber o contato, cite quem te indicou e adapte esta mesma mensagem para a pessoa de marketing.",
};

function sequenceFor(channel: ProspectChannel): ProspectStep[] {
  const channelName = CHANNEL_LABELS[channel];
  return [
    { when: "Hoje", title: "Primeira abordagem", text: `Envie uma das mensagens acima pelo ${channelName}.` },
    {
      when: "3 a 5 dias",
      title: "Nova tentativa com outro ângulo",
      text: "Traga algo diferente: uma referência, um trabalho parecido ou outra ideia — nunca só “viu minha mensagem?”.",
    },
    {
      when: "7 a 10 dias",
      title: "Último contato leve",
      text: "Uma mensagem curta, deixando a porta aberta para quando fizer sentido.",
    },
    {
      when: "Se houver interesse",
      title: "Avançar",
      text: "Marque uma reunião, entenda a necessidade e monte a proposta no Gerador de Propostas.",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* API pública                                                                 */
/* -------------------------------------------------------------------------- */

const STYLES: { id: ProspectStyle; label: string; hint: string }[] = [
  { id: "natural", label: "Mais natural / Conversa", hint: "Soa como uma conversa, sem cara de venda." },
  { id: "direct", label: "Mais direta / Objetiva", hint: "Diz logo o que você faz e o que propõe." },
  { id: "consultive", label: "Mais consultiva / Diagnóstico", hint: "Mostra repertório e abre com uma pergunta." },
];

/** Gera avaliação, mensagens e dicas a partir do formulário (função pura). */
export function generateProspecting(form: ProspectForm, senderName = ""): ProspectResult {
  const quality = assessObservation(form.observation);
  const segment = SEGMENTS[form.segment];

  const ctx: Ctx = {
    channel: form.channel,
    person: firstName(form.person),
    company: clean(form.company),
    senderFirst: firstName(senderName),
    senderFull: clean(senderName),
    source: form.source,
    quality,
    observation: sentence(form.observation),
    idea: sentence(form.idea),
    segment,
    opportunity: OPPORTUNITY[form.opportunity](segment.angle),
    opportunityKey: form.opportunity,
    goal: form.goal,
  };

  const assessmentCopy: Record<BaseQuality, { title: string; text: string }> = {
    missing: {
      title: "Falta um motivo específico",
      text: "Sem uma observação real, a mensagem vira mais uma oferta genérica. Olhe o perfil, o site ou o espaço da empresa e anote algo concreto: um lançamento, um tipo de post, algo que falta. Por enquanto, usamos um argumento do segmento.",
    },
    generic: {
      title: "Falta um motivo específico",
      text: "Essa observação poderia ser dita para qualquer empresa. Cite algo concreto que você viu — um produto, um post, uma mudança recente — para mostrar que olhou de verdade. Por enquanto, usamos um argumento do segmento.",
    },
    good: {
      title: "Boa base para abordar",
      text: "Sua observação é específica: mostra que você olhou para o negócio antes de oferecer seu trabalho, e isso aumenta muito a chance de resposta.",
    },
  };

  const chips: QualityChip[] = [
    quality === "good"
      ? { label: "Observação específica", tone: "sage" }
      : quality === "generic"
        ? { label: "Observação genérica", tone: "gold" }
        : { label: "Sem observação", tone: "burgundy" },
    { label: labelOf(GOAL_OPTIONS, form.goal), tone: "tan" },
    { label: CHANNEL_LABELS[form.channel], tone: "tan" },
  ];
  if (form.source === "referral") chips.push({ label: "Menciona a indicação", tone: "sage" });
  if (clean(form.idea)) chips.push({ label: "Com ideia própria", tone: "sage" });

  return {
    assessment: { quality, ...assessmentCopy[quality], chips },
    messages: STYLES.map((style) => ({ ...style, ...compose(ctx, style.id) })),
    avoid: [AVOID_BY_GOAL[form.goal], AVOID_BY_CHANNEL[form.channel], "Começar com “gostei do perfil” ou elogios que servem para qualquer empresa."],
    next: NEXT_BY_GOAL[form.goal],
    sequence: sequenceFor(form.channel),
  };
}

/** Texto completo para copiar (inclui a linha de assunto no e-mail). */
export function prospectToClipboard(message: ProspectMessage) {
  return message.subject ? `Assunto: ${message.subject}\n\n${message.text}` : message.text;
}
