import type { FollowupChannel, FollowupForm, FollowupSituation, FollowupTiming } from "./options";
import { clean, firstName, lowerFirst, paragraphs, sentence } from "./text";

/* -------------------------------------------------------------------------- */
/* Tipos do resultado                                                          */
/* -------------------------------------------------------------------------- */

export type MessageVariant = "direct" | "light" | "closing";
export type RecommendationTone = "now" | "wait" | "last";

export interface FollowupMessage {
  id: MessageVariant;
  label: string;
  hint: string;
  /** Só para e-mail. */
  subject?: string;
  text: string;
}

export interface FollowupRecommendation {
  title: string;
  text: string;
  tone: RecommendationTone;
  timingLabel: string;
  /** Mensagem mais indicada para o momento. */
  highlight: MessageVariant;
}

export interface SequenceStep {
  when: string;
  title: string;
  text: string;
}

export interface FollowupResult {
  recommendation: FollowupRecommendation;
  messages: FollowupMessage[];
  sequence: SequenceStep[];
}

/* -------------------------------------------------------------------------- */
/* Contexto preenchido                                                         */
/* -------------------------------------------------------------------------- */

interface Ctx {
  name: string;
  company: string;
  /** "a proposta de vídeo institucional" | "a proposta que te enviei" */
  proposal: string;
  /** "o projeto de vídeo institucional" | "o nosso projeto" */
  project: string;
  /** " para Padaria Aurora" | "" */
  forCompany: string;
  service: string;
  agreed: string;
  since: string;
  sender: string;
}

const SINCE: Record<FollowupTiming, string> = {
  "2-3": "há alguns dias",
  "5-7": "há cerca de uma semana",
  "10-14": "há umas duas semanas",
  "15+": "há algumas semanas",
};

function buildCtx(form: FollowupForm, sender: string): Ctx {
  const service = lowerFirst(form.service);
  const company = clean(form.company);
  return {
    name: firstName(form.clientName),
    company,
    service,
    proposal: service ? `a proposta de ${service}` : "a proposta que te enviei",
    project: service ? `o projeto de ${service}` : "o nosso projeto",
    forCompany: company ? ` para ${company}` : "",
    agreed: sentence(form.agreed),
    since: SINCE[form.timing],
    sender: clean(sender),
  };
}

/* -------------------------------------------------------------------------- */
/* Modelos por situação                                                        */
/* -------------------------------------------------------------------------- */

interface Draft {
  subject: string;
  body: Array<string | false | null | undefined>;
}

type SituationTemplates = (c: Ctx) => Record<MessageVariant, Draft>;

const TEMPLATES: Record<FollowupSituation, SituationTemplates> = {
  proposal_silent: (c) => ({
    direct: {
      subject: c.company ? `Proposta para ${c.company}: conseguiu avaliar?` : "Conseguiu avaliar a proposta?",
      body: [
        `Te enviei ${c.service ? `a proposta de ${c.service}` : "a proposta"}${c.forCompany} ${c.since} e queria saber se você conseguiu dar uma olhada.`,
        c.agreed && `Retomando o que combinamos: ${c.agreed}`,
        "Se estiver tudo certo, já consigo reservar as datas na agenda. Se ficou alguma dúvida sobre valores ou escopo, me fala que eu explico.",
      ],
    },
    light: {
      subject: "Ficou alguma dúvida?",
      body: [
        `Passando só para saber se ficou alguma dúvida sobre ${c.proposal}.`,
        c.agreed && `Lembrando da nossa última conversa: ${c.agreed}`,
        "Sei que a rotina é corrida, então responde quando der. Se preferir, a gente resolve tudo numa ligação rápida.",
      ],
    },
    closing: {
      subject: "Posso encerrar por aqui?",
      body: [
        `Como não tive retorno sobre ${c.proposal}, imagino que talvez não seja o momento — e está tudo bem.`,
        "Vou considerar a proposta encerrada por enquanto para não ficar te enchendo de mensagem. Se quiser retomar mais para frente, é só me chamar que eu atualizo valores e agenda.",
      ],
    },
  }),

  analyzing: (c) => ({
    direct: {
      subject: "Conseguiu analisar a proposta?",
      body: [
        `Você tinha comentado que ia analisar ${c.proposal}${c.forCompany}. Já conseguiu chegar a alguma conclusão?`,
        c.agreed && `Retomando o que combinamos: ${c.agreed}`,
        "Se ajudar na decisão, posso ajustar o escopo ou esclarecer qualquer ponto que tenha ficado em aberto.",
      ],
    },
    light: {
      subject: "Alguma dúvida durante a análise?",
      body: [
        `Imagino que você ainda esteja avaliando ${c.proposal}, então não quero apressar nada.`,
        c.agreed && `Só lembrando do que ficou combinado: ${c.agreed}`,
        "Queria apenas me colocar à disposição caso tenha surgido alguma dúvida no meio do caminho.",
      ],
    },
    closing: {
      subject: "Fico no aguardo da sua decisão",
      body: [
        `Não quero ficar insistindo enquanto você avalia, então essa é minha última mensagem sobre ${c.proposal}.`,
        "Quando decidir, é só me chamar. E se o projeto ficar para outro momento, continuo à disposição.",
      ],
    },
  }),

  internal_approval: (c) => ({
    direct: {
      subject: "Posso ajudar na aprovação interna?",
      body: [
        `Queria saber se ${c.proposal} já passou pela aprovação interna.`,
        c.agreed && `Retomando o que combinamos: ${c.agreed}`,
        "Se for útil, preparo um resumo de uma página com escopo, prazo e investimento para você encaminhar a quem precisa aprovar.",
      ],
    },
    light: {
      subject: "Como está a aprovação?",
      body: [
        "Sei que depender da agenda de outras pessoas às vezes leva um tempo, então só passando para saber como está.",
        c.agreed && `Lembrando da nossa última conversa: ${c.agreed}`,
        "Se alguém tiver dúvida sobre o projeto, posso participar de uma conversa rápida e explicar direto.",
      ],
    },
    closing: {
      subject: "Fico no aguardo da definição",
      body: [
        "Imagino que a aprovação ainda esteja andando, ou que o projeto tenha perdido prioridade por agora.",
        "Vou parar de te chamar sobre isso. Quando tiverem uma definição, me avisa que eu confirmo agenda e condições.",
      ],
    },
  }),

  price_objection: (c) => ({
    direct: {
      subject: "Uma opção que cabe melhor no orçamento",
      body: [
        `Fiquei pensando no que você comentou sobre o valor ${c.service ? `da proposta de ${c.service}` : "da proposta"}.`,
        c.agreed && `Retomando o que combinamos: ${c.agreed}`,
        "Consigo montar uma versão mais enxuta — com menos vídeos ou uma diária a menos, por exemplo — sem abrir mão da qualidade. Quer que eu te envie essa alternativa?",
      ],
    },
    light: {
      subject: "Vamos ajustar a proposta?",
      body: [
        "Entendo totalmente a questão do investimento, e prefiro ajustar a proposta do que você ficar com algo que não cabe agora.",
        c.agreed && `Lembrando da nossa última conversa: ${c.agreed}`,
        "Me conta: qual valor faria sentido para vocês? A partir disso eu vejo o que dá para entregar.",
      ],
    },
    closing: {
      subject: "Fico à disposição",
      body: [
        "Revisei tudo com calma e esse é o formato que consigo entregar mantendo a qualidade que o projeto pede.",
        "Se em algum momento o investimento fizer sentido, vou gostar muito de retomar. Agradeço pela conversa até aqui!",
      ],
    },
  }),

  later: (c) => ({
    direct: {
      subject: "Retomando nossa conversa",
      body: [
        `Você tinha me pedido para retomar o contato mais para frente sobre ${c.project}, então estou passando aqui.`,
        c.agreed && `Da última vez, ficou assim: ${c.agreed}`,
        "Esse momento já chegou para vocês? Se sim, atualizo a proposta e vejo as datas disponíveis.",
      ],
    },
    light: {
      subject: "Como estão os planos por aí?",
      body: [
        `Lembrei de você e d${c.service ? `o projeto de ${c.service}` : "a nossa conversa"}. Como estão as coisas?`,
        c.agreed && `Só para registrar o que tínhamos falado: ${c.agreed}`,
        "Sem pressa nenhuma: quando o projeto voltar para os planos, é só me chamar.",
      ],
    },
    closing: {
      subject: "Deixo nosso contato em aberto",
      body: [
        "Para não te chamar num momento ruim, vou deixar nossa conversa em pausa por aqui.",
        `Quando fizer sentido retomar ${c.project}, me avisa que eu organizo tudo rapidinho.`,
      ],
    },
  }),

  no_reply_again: (c) => ({
    direct: {
      subject: "Uma pergunta rápida",
      body: [
        `Tentei falar com você algumas vezes sobre ${c.proposal} e ainda não tive retorno.`,
        c.agreed && `Retomando o que combinamos: ${c.agreed}`,
        "Pode me responder só com “sim”, “não” ou “mais para frente”? Assim eu me organizo sem ficar te incomodando.",
      ],
    },
    light: {
      subject: "Ainda faz sentido?",
      body: [
        "Sei que as mensagens se acumulam, então vou ser breve.",
        `Ainda faz sentido conversarmos sobre ${c.project}? Qualquer resposta já me ajuda.`,
      ],
    },
    closing: {
      subject: "Encerrando por aqui",
      body: [
        `Como não consegui retorno, essa é minha última mensagem sobre ${c.proposal}.`,
        "Vou encerrar por aqui para não ficar insistindo. Se o projeto voltar a fazer sentido, pode me chamar quando quiser — vai ser um prazer retomar.",
      ],
    },
  }),

  reactivate: (c) => ({
    direct: {
      subject: c.company ? `Planos de vídeo para ${c.company}` : "Faz tempo! Como estão os planos?",
      body: [
        "Faz um tempo que não conversamos e queria saber como estão os planos de vídeo por aí.",
        c.agreed && `Da última vez, ficou assim: ${c.agreed}`,
        "Estou organizando a agenda dos próximos meses e lembrei de vocês. Faz sentido marcarmos uma conversa rápida?",
      ],
    },
    light: {
      subject: "Passando para dar um oi",
      body: [
        "Lembrei de você esses dias e resolvi mandar um oi.",
        c.service
          ? `Ainda penso naquela ideia de ${c.service} — acho que continua fazendo muito sentido para vocês.`
          : "Como estão as coisas por aí?",
        c.agreed && `Tinha anotado da nossa última conversa: ${c.agreed}`,
        "Se estiverem pensando em conteúdo para os próximos meses, conta comigo.",
      ],
    },
    closing: {
      subject: "Continuo à disposição",
      body: [
        `Não quero tomar seu tempo: só queria deixar registrado que continuo disponível caso vocês precisem de vídeo${c.forCompany}.`,
        "Se não for o momento, sem problema nenhum. Desejo sucesso nos próximos projetos!",
      ],
    },
  }),
};

/* -------------------------------------------------------------------------- */
/* Formatação por canal                                                        */
/* -------------------------------------------------------------------------- */

function greeting(channel: FollowupChannel, name: string) {
  if (channel === "email") return name ? `Olá, ${name}, tudo bem?` : "Olá, tudo bem?";
  if (channel === "instagram") return name ? `Oi, ${name}! Tudo bem?` : "Oi! Tudo bem?";
  return name ? `Oi, ${name}, tudo bem?` : "Oi, tudo bem?";
}

function signOff(variant: MessageVariant, sender: string) {
  const close = variant === "closing" ? "Agradeço a atenção. Um abraço," : "Um abraço,";
  return `${close}\n${sender || "[seu nome]"}`;
}

function formatDraft(draft: Draft, channel: FollowupChannel, variant: MessageVariant, c: Ctx) {
  const body = draft.body.filter((item): item is string => Boolean(item));
  if (channel === "email") {
    return paragraphs([greeting(channel, c.name), ...body, signOff(variant, c.sender)]);
  }
  // Chat: cumprimento na mesma linha do primeiro trecho, texto curto.
  const [first, ...rest] = body;
  return paragraphs([`${greeting(channel, c.name)} ${first}`, ...rest]);
}

/* -------------------------------------------------------------------------- */
/* Recomendação (situação × tempo)                                             */
/* -------------------------------------------------------------------------- */

type Rec = [RecommendationTone, string, string];

const RECOMMENDATIONS: Record<FollowupSituation, Record<FollowupTiming, Rec>> = {
  proposal_silent: {
    "2-3": ["wait", "Ainda é cedo para cobrar", "Dois ou três dias é pouco para quem está comparando orçamentos ou conversando com outras pessoas. Se quiser marcar presença, use a versão leve, sem pedir resposta."],
    "5-7": ["now", "Bom momento para retomar", "Uma semana é o intervalo ideal para o primeiro follow-up. Seja direto e ofereça ajuda com dúvidas — isso facilita a resposta."],
    "10-14": ["now", "Retome com uma pergunta simples", "O assunto já começou a esfriar. Faça uma pergunta objetiva, que possa ser respondida em uma linha."],
    "15+": ["last", "Feche o ciclo com elegância", "Depois de duas semanas sem retorno, uma mensagem de encerramento costuma gerar mais resposta do que uma nova cobrança."],
  },
  analyzing: {
    "2-3": ["wait", "Respeite o tempo de análise", "O cliente pediu um tempo. Mandar mensagem agora pode soar como pressão — espere mais alguns dias ou use a versão leve."],
    "5-7": ["now", "Pergunte se surgiu alguma dúvida", "Depois de uma semana, é natural perguntar como está a análise. Ofereça ajuda em vez de cobrar uma decisão."],
    "10-14": ["now", "Ajude o cliente a decidir", "Análises longas costumam travar em uma dúvida específica. Ofereça ajustar o escopo ou explicar algum ponto."],
    "15+": ["last", "Peça uma definição com leveza", "Se a análise passou de duas semanas, peça uma posição de forma gentil. O encerramento tira a pressão dos dois lados."],
  },
  internal_approval: {
    "2-3": ["wait", "Dê tempo para a conversa interna", "Aprovações dependem da agenda de outras pessoas. Aguarde alguns dias antes de retomar."],
    "5-7": ["now", "Ofereça material para a aprovação", "Um resumo curto com escopo, prazo e valor facilita a vida de quem precisa defender o projeto internamente."],
    "10-14": ["now", "Proponha falar com quem decide", "Se está demorando, ofereça participar de uma conversa rápida com o sócio, a diretoria ou o financeiro."],
    "15+": ["last", "Deixe a porta aberta", "Sem definição depois de duas semanas, o projeto provavelmente perdeu prioridade. Encerre com leveza e deixe claro que dá para retomar."],
  },
  price_objection: {
    "2-3": ["now", "Responda enquanto o assunto está quente", "Objeção de preço é uma abertura para negociar. Ofereça uma alternativa de escopo logo, antes que o cliente procure outra opção."],
    "5-7": ["now", "Apresente uma versão alternativa", "Mostre uma opção mais enxuta em vez de simplesmente dar desconto — assim você protege o valor do seu trabalho."],
    "10-14": ["now", "Descubra quanto cabe no orçamento", "Pergunte qual valor faria sentido. Com um número na mesa, fica mais fácil montar uma proposta que funcione."],
    "15+": ["last", "Mantenha seu valor e encerre", "Depois de tanto tempo, insistir em desconto enfraquece sua posição. Agradeça e deixe o convite em aberto."],
  },
  later: {
    "2-3": ["wait", "Ainda não é o momento", "O cliente pediu para falar mais para frente. Anote um lembrete no CRM e retome perto da data combinada."],
    "5-7": ["wait", "Aguarde o prazo combinado", "Se o combinado foi conversar daqui a algumas semanas, espere. Retomar antes pode passar a impressão de que você não ouviu."],
    "10-14": ["now", "Faça um contato leve", "Um oi sem cobrança mantém você na memória do cliente até o momento certo chegar."],
    "15+": ["now", "Retome a conversa", "Já passou um bom tempo. Pergunte se o momento chegou e ofereça atualizar a proposta."],
  },
  no_reply_again: {
    "2-3": ["wait", "Espere antes da próxima tentativa", "Mensagens muito próximas passam a impressão de insistência. Dê pelo menos mais alguns dias de intervalo."],
    "5-7": ["now", "Facilite a resposta", "Peça uma resposta simples: sim, não ou mais para frente. Isso reduz o esforço do cliente para responder."],
    "10-14": ["last", "Prepare o encerramento", "Depois de várias tentativas, a mensagem de último contato costuma ser a mais respondida."],
    "15+": ["last", "Encerre e siga em frente", "Envie a mensagem de encerramento e atualize o lead no CRM. Se o cliente voltar depois, ótimo."],
  },
  reactivate: {
    "2-3": ["wait", "Esse contato ainda é recente", "Se a última conversa foi há poucos dias, ele ainda não é um contato antigo. Prefira um follow-up comum sobre o que ficou pendente."],
    "5-7": ["now", "Retome com naturalidade", "Pouco tempo se passou, então dá para retomar como continuação da última conversa, sem cerimônia."],
    "10-14": ["now", "Traga um motivo para voltar", "Uma novidade, um trabalho recente ou uma ideia nova tornam a retomada mais natural."],
    "15+": ["now", "Reative com uma novidade", "Contatos antigos respondem melhor quando você traz algo novo: um trabalho recente, uma ideia para a próxima campanha ou uma agenda disponível."],
  },
};

const TONE_LABEL: Record<RecommendationTone, string> = {
  now: "Enviar agora",
  wait: "Aguarde mais alguns dias",
  last: "Hora do último contato",
};

function highlightFor(tone: RecommendationTone, situation: FollowupSituation): MessageVariant {
  if (tone === "last") return "closing";
  if (tone === "wait" || situation === "reactivate" || situation === "later") return "light";
  return "direct";
}

/* -------------------------------------------------------------------------- */
/* Sequência sugerida                                                          */
/* -------------------------------------------------------------------------- */

const SEQUENCES: Record<FollowupSituation, SequenceStep[]> = {
  proposal_silent: [
    { when: "5 a 7 dias após a proposta", title: "Primeiro follow-up", text: "Mensagem direta perguntando se ficou alguma dúvida." },
    { when: "3 a 4 dias depois", title: "Contato leve", text: "Mensagem natural, sem cobrar resposta, oferecendo uma ligação rápida." },
    { when: "1 semana depois", title: "Último contato", text: "Mensagem de encerramento, deixando a porta aberta." },
    { when: "Sem resposta", title: "Atualize o CRM", text: "Marque como perdido ou agende uma reativação para daqui a 2 ou 3 meses." },
  ],
  analyzing: [
    { when: "Após o prazo combinado", title: "Pergunte como está a análise", text: "Ofereça ajuda com dúvidas, sem pedir decisão." },
    { when: "4 a 5 dias depois", title: "Ofereça um ajuste", text: "Sugira uma alternativa de escopo ou uma conversa rápida." },
    { when: "1 semana depois", title: "Peça uma definição", text: "Mensagem de encerramento gentil, tirando a pressão." },
  ],
  internal_approval: [
    { when: "5 a 7 dias", title: "Envie um resumo", text: "Uma página com escopo, prazo e investimento para facilitar a aprovação." },
    { when: "1 semana depois", title: "Ofereça conversar com quem decide", text: "Proponha uma call curta com o sócio, a diretoria ou o financeiro." },
    { when: "10 dias depois", title: "Último contato", text: "Deixe claro que pode retomar quando houver definição." },
  ],
  price_objection: [
    { when: "Hoje", title: "Responda à objeção", text: "Mostre uma versão mais enxuta em vez de dar desconto direto." },
    { when: "3 a 5 dias depois", title: "Pergunte o valor possível", text: "Descubra quanto cabe no orçamento e monte uma nova proposta." },
    { when: "1 semana depois", title: "Encerramento", text: "Mantenha seu valor, agradeça e deixe o convite em aberto." },
    { when: "Se houver retorno", title: "Nova proposta", text: "Use o Gerador de Propostas para enviar a versão ajustada." },
  ],
  later: [
    { when: "Hoje", title: "Anote o prazo", text: "Registre no CRM quando o cliente pediu para retomar." },
    { when: "Perto da data combinada", title: "Retome a conversa", text: "Pergunte se o momento chegou e ofereça atualizar a proposta." },
    { when: "1 semana depois", title: "Contato leve", text: "Um oi sem cobrança, com uma novidade ou trabalho recente." },
    { when: "Sem resposta", title: "Encerramento", text: "Deixe o contato em pausa e reative em alguns meses." },
  ],
  no_reply_again: [
    { when: "Agora", title: "Pergunta de resposta fácil", text: "Peça só um “sim”, “não” ou “mais para frente”." },
    { when: "5 a 7 dias depois", title: "Último contato", text: "Mensagem de encerramento, sem cobrança." },
    { when: "Em seguida", title: "Atualize o CRM", text: "Marque o lead como perdido e siga para os próximos." },
    { when: "Em 2 a 3 meses", title: "Reativação", text: "Volte com uma novidade, como um contato novo." },
  ],
  reactivate: [
    { when: "Hoje", title: "Mensagem de reativação", text: "Traga uma novidade, um trabalho recente ou uma ideia." },
    { when: "5 a 7 dias depois", title: "Contato leve", text: "Se não houver resposta, um oi curto, sem pressão." },
    { when: "2 semanas depois", title: "Último contato", text: "Deixe registrado que continua disponível." },
    { when: "Se houver interesse", title: "Marque uma conversa", text: "Entenda o momento e prepare uma nova proposta." },
  ],
};

/* -------------------------------------------------------------------------- */
/* API pública                                                                 */
/* -------------------------------------------------------------------------- */

const VARIANTS: { id: MessageVariant; label: string; hint: string }[] = [
  { id: "direct", label: "Mais direta / Objetiva", hint: "Vai ao ponto e facilita a resposta." },
  { id: "light", label: "Mais leve / Natural", hint: "Mantém o contato sem pressionar." },
  { id: "closing", label: "Encerramento / Último contato", hint: "Fecha o ciclo e deixa a porta aberta." },
];

/** Monta recomendação, mensagens e sequência a partir do formulário (função pura). */
export function generateFollowup(form: FollowupForm, senderName = ""): FollowupResult {
  const ctx = buildCtx(form, senderName);
  const drafts = TEMPLATES[form.situation](ctx);
  const [tone, title, text] = RECOMMENDATIONS[form.situation][form.timing];

  return {
    recommendation: {
      tone,
      title,
      text,
      timingLabel: TONE_LABEL[tone],
      highlight: highlightFor(tone, form.situation),
    },
    messages: VARIANTS.map((variant) => ({
      ...variant,
      subject: form.channel === "email" ? drafts[variant.id].subject : undefined,
      text: formatDraft(drafts[variant.id], form.channel, variant.id, ctx),
    })),
    sequence: SEQUENCES[form.situation],
  };
}

/** Texto completo para copiar (inclui a linha de assunto no e-mail). */
export function messageToClipboard(message: FollowupMessage) {
  return message.subject ? `Assunto: ${message.subject}\n\n${message.text}` : message.text;
}
