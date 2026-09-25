import { escapeHtml } from "@/utils/document";
import { formatCurrencyBRL, parseCurrencyBRL } from "@/utils/format";
import { currencyToWords } from "./numberToWords";
import { partyRoles, ruleOn, type ContractData, type ContractParty } from "./model";

export const BLANK = "________";

export interface ContractSection {
  heading: string;
  paragraphs: string[];
}

export interface ContractSigner {
  role: string;
  name: string;
  document: string;
}

export interface ContractDocument {
  title: string;
  preamble: string[];
  sections: ContractSection[];
  closing: string;
  placeDate: string;
  signers: ContractSigner[];
  witnesses: boolean;
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function v(value: string | undefined) {
  const text = (value || "").trim();
  return text || BLANK;
}

/** Remove o ponto final para encaixar o texto do usuário no meio da frase. */
function inline(value: string | undefined) {
  const text = (value || "").trim().replace(/\s*\n+\s*/g, "; ").replace(/[.;]+$/, "");
  return text || BLANK;
}

function shortDate(iso: string) {
  const [year, month, day] = (iso || "").slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : BLANK;
}

function longDate(iso: string) {
  const [year, month, day] = (iso || "").slice(0, 10).split("-");
  if (!year || !month || !day) return `${BLANK} de ${BLANK} de ${BLANK}`;
  return `${Number(day)} de ${MONTHS[Number(month) - 1] || BLANK} de ${year}`;
}

function money(amount: string) {
  const value = parseCurrencyBRL(amount || "");
  if (!value) return `R$ ${BLANK}`;
  return `${formatCurrencyBRL(value)} (${currencyToWords(value)})`;
}

function plural(value: string, singular: string, pluralForm: string) {
  return `${v(value)} ${Number(value) === 1 ? singular : pluralForm}`;
}

function cityState(city: string, state: string) {
  if (!city.trim() && !state.trim()) return BLANK;
  return `${v(city)}/${v(state)}`;
}

function qualify(party: ContractParty, role: string) {
  const parts = [
    `<b>${v(party.name).toUpperCase()}</b>`,
    `inscrito(a) no CPF/CNPJ sob o nº ${v(party.document)}`,
    `com endereço em ${v(party.address)}, ${cityState(party.city, party.state)}`,
  ];
  if (party.representative.trim()) parts.push(`neste ato representado(a) por ${party.representative.trim()}`);
  parts.push(`e-mail ${v(party.email)}`);
  return `${parts.join(", ")}, doravante denominado(a) simplesmente <b>${role}</b>;`;
}

function paymentParagraphs(data: ContractData, payer: string, receiver: string): string[] {
  const { payment } = data;
  const total = parseCurrencyBRL(payment.amount || "");
  const due = shortDate(payment.firstDueDate);
  if (payment.condition === "cash") {
    return [`O pagamento será feito à vista, em parcela única, com vencimento em ${due}.`];
  }
  if (payment.condition === "split") {
    const half = total ? formatCurrencyBRL(total / 2) : `R$ ${BLANK}`;
    return [
      `O pagamento será feito em duas parcelas iguais: 50% (cinquenta por cento), no valor de ${half}, na contratação, com vencimento em ${due}; e os 50% (cinquenta por cento) restantes, no valor de ${half}, na entrega do material finalizado.`,
      `A primeira parcela garante a reserva da data e da agenda da ${receiver} e é condição para o início dos trabalhos.`,
    ];
  }
  return [
    `O pagamento será parcelado conforme combinado entre as partes, com a primeira parcela vencendo em ${due}. A quantidade, os valores e as datas das demais parcelas constarão da cobrança aceita por escrito pela ${payer}.`,
  ];
}

/* ------------------------------------------------------------------ */
/* Cláusulas por tema                                                   */
/* ------------------------------------------------------------------ */

function objectSection(data: ContractData, client: string, provider: string): ContractSection {
  const { scope } = data;
  if (data.type === "recurring") {
    return {
      heading: "DO OBJETO",
      paragraphs: [
        `O presente contrato tem por objeto a prestação continuada, pela ${provider} à ${client}, dos seguintes serviços audiovisuais: ${inline(scope.description)}.`,
        `Em cada mês de vigência serão entregues ${plural(scope.deliveriesPerMonth, "conteúdo", "conteúdos")}, observado o seguinte padrão de entrega: ${inline(scope.deliverables)}.`,
        `Entregas não utilizadas em um mês por iniciativa da ${client} não se acumulam para os meses seguintes, salvo quando o atraso tiver sido causado pela ${provider}.`,
      ],
    };
  }
  if (data.type === "outsourcing") {
    const paragraphs = [
      `O presente contrato tem por objeto a prestação, pela ${provider} à ${client}, dos seguintes serviços: ${inline(scope.description)}.`,
      `A ${provider} deverá entregar: ${inline(scope.deliverables)}.`,
    ];
    if (scope.endClient.trim()) {
      paragraphs.push(
        `Os serviços integram projeto que a ${client} executa para o cliente final ${scope.endClient.trim()}, com quem a ${provider} não mantém relação contratual em razão deste instrumento.`,
      );
    }
    paragraphs.push(
      `A ${provider} executará os serviços com autonomia técnica, utilizando equipamentos próprios, salvo quando o contrário for combinado por escrito, e seguindo as orientações criativas e o padrão de qualidade indicados pela ${client}.`,
    );
    return { heading: "DO OBJETO", paragraphs };
  }
  return {
    heading: "DO OBJETO",
    paragraphs: [
      `O presente contrato tem por objeto a prestação, pela ${provider} à ${client}, dos seguintes serviços audiovisuais: ${inline(scope.description)}.`,
      `Integram o objeto deste contrato os seguintes entregáveis: ${inline(scope.deliverables)}.`,
    ],
  };
}

function scheduleSection(data: ContractData, client: string, provider: string): ContractSection {
  const { scope } = data;
  const paragraphs: string[] = [];
  if (data.type === "recurring") {
    paragraphs.push(
      `As captações serão agendadas mensalmente entre as partes, com a primeira prevista para ${shortDate(scope.captureDate)}, no seguinte local: ${inline(scope.captureLocation)}.`,
      `Cada conteúdo será entregue em até ${plural(scope.deliveryDays, "dia corrido", "dias corridos")} após a respectiva captação, seguindo o calendário editorial definido em conjunto.`,
    );
  } else {
    paragraphs.push(
      `A ${data.type === "outsourcing" ? "execução/captação" : "captação"} será realizada em ${shortDate(scope.captureDate)}, no seguinte local: ${inline(scope.captureLocation)}, em horário a ser confirmado entre as partes.`,
      `A ${provider} entregará o material finalizado em até ${plural(scope.deliveryDays, "dia corrido", "dias corridos")} após a captação.`,
    );
  }
  if (!ruleOn(data, "approval")) {
    paragraphs.push(`Estão incluídas ${plural(scope.revisions, "rodada", "rodadas")} de revisão sobre cada entregável.`);
  }
  paragraphs.push(
    `Os prazos de entrega ficam suspensos enquanto a ${client} não fornecer informações, materiais, acessos ou aprovações que dependam dela, voltando a correr a partir do seu recebimento.`,
  );
  if (data.type === "outsourcing") {
    paragraphs.push(
      `A entrega será feita em meio digital, incluindo os arquivos finalizados, os arquivos brutos e os projetos abertos de edição, organizados de forma que permitam a continuidade do trabalho pela ${client}.`,
    );
  } else {
    paragraphs.push(
      `A entrega será feita em meio digital, por link de download ou plataforma de compartilhamento, cabendo à ${client} baixar e armazenar os arquivos em até 30 (trinta) dias após o envio.`,
    );
  }
  return { heading: data.type === "recurring" ? "DA EXECUÇÃO MENSAL E DOS PRAZOS" : "DA EXECUÇÃO E DOS PRAZOS", paragraphs };
}

function priceSection(data: ContractData, client: string, provider: string): ContractSection {
  const { payment, scope } = data;
  if (data.type === "recurring") {
    const monthly = parseCurrencyBRL(payment.amount || "");
    const months = Number(scope.termMonths) || 0;
    const paragraphs = [
      `Pelos serviços, a ${client} pagará à ${provider} o valor mensal de ${money(payment.amount)}.`,
      `A mensalidade vencerá todo dia ${v(scope.dueDay)} de cada mês, sendo a primeira com vencimento em ${shortDate(payment.firstDueDate)}.`,
    ];
    if (monthly && months) {
      paragraphs.push(
        `O valor estimado do contrato no período de vigência inicial é de ${formatCurrencyBRL(monthly * months)}, correspondente a ${months} ${months === 1 ? "mensalidade" : "mensalidades"}.`,
      );
    }
    paragraphs.push(
      `Em caso de renovação, o valor mensal poderá ser reajustado pela variação acumulada do IPCA/IBGE nos últimos 12 (doze) meses, ou por outro valor acordado por escrito.`,
      `Despesas extraordinárias, como deslocamentos fora da cidade, hospedagem, locação de espaços, cachês de terceiros e impulsionamento de publicações, não estão incluídas na mensalidade e serão previamente aprovadas e reembolsadas pela ${client}.`,
    );
    return { heading: "DO VALOR E DO PAGAMENTO", paragraphs };
  }
  const paragraphs = [
    `Pelos serviços, a ${client} pagará à ${provider} o valor total de ${money(payment.amount)}.`,
    ...paymentParagraphs(data, client, provider),
  ];
  if (data.type === "outsourcing") {
    paragraphs.push(
      `A ${provider} emitirá nota fiscal ou recibo correspondente a cada pagamento, sendo responsável pelos tributos incidentes sobre a sua remuneração.`,
      `O valor acima inclui todos os custos da ${provider} com equipamentos, deslocamento na cidade de execução e softwares, salvo despesas extraordinárias aprovadas previamente por escrito pela ${client}.`,
    );
  } else {
    paragraphs.push(
      `A ${provider} emitirá nota fiscal ou recibo correspondente a cada pagamento recebido.`,
      `Despesas extraordinárias, como deslocamentos fora da cidade, hospedagem, locação de espaços e cachês de terceiros, não estão incluídas no valor acima e serão previamente aprovadas e reembolsadas pela ${client}.`,
    );
  }
  return { heading: "DO VALOR E DO PAGAMENTO", paragraphs };
}

function lateFeeSection(data: ContractData, client: string, provider: string): ContractSection {
  return {
    heading: "DA INADIMPLÊNCIA",
    paragraphs: [
      `O atraso no pagamento de qualquer valor previsto neste contrato sujeitará a ${client} ao pagamento de multa de 2% (dois por cento) sobre o valor em atraso, acrescido de juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso.`,
      data.type === "outsourcing"
        ? `Em caso de atraso superior a 5 (cinco) dias, a ${provider} poderá suspender a execução dos serviços até a regularização, sem que isso configure descumprimento contratual, ficando os prazos de entrega prorrogados pelo mesmo período.`
        : `Em caso de atraso superior a 5 (cinco) dias, a ${provider} poderá suspender a execução dos serviços, as captações agendadas e a liberação de arquivos até a regularização, sem que isso configure descumprimento contratual, ficando os prazos de entrega prorrogados pelo mesmo período.`,
    ],
  };
}

function scopeSection(data: ContractData, client: string, provider: string): ContractSection {
  return {
    heading: "DO ESCOPO E DOS SERVIÇOS ADICIONAIS",
    paragraphs: [
      `Os serviços contratados limitam-se ao descrito na cláusula do objeto. Qualquer entrega, formato, diária, versão ou atividade não prevista expressamente não está incluída no valor deste contrato.`,
      `Pedidos de novas peças, mudanças de roteiro ou de conceito após a sua aprovação, captações adicionais ou alterações que ultrapassem as revisões incluídas serão tratados como serviços adicionais, orçados à parte e executados somente após aprovação por escrito da ${client}, admitida a aprovação por e-mail ou aplicativo de mensagens.`,
      `Os prazos dos serviços adicionais serão definidos no respectivo orçamento e não alteram os prazos já pactuados para o escopo original, salvo acordo entre as partes. ${data.type === "outsourcing" ? `A ${provider} não executará serviços adicionais sem essa aprovação, sob pena de não serem remunerados.` : ""}`.trim(),
    ],
  };
}

function approvalSection(data: ContractData, client: string, provider: string): ContractSection {
  const { scope, rules } = data;
  return {
    heading: "DA APROVAÇÃO E DAS REVISÕES",
    paragraphs: [
      `Estão incluídas ${plural(scope.revisions, "rodada", "rodadas")} de revisão por entregável. Considera-se rodada de revisão o envio, de uma só vez e de forma consolidada, de todos os ajustes desejados pela ${client} sobre uma versão apresentada.`,
      `A ${client} terá ${plural(rules.approvalDays, "dia corrido", "dias corridos")}, contados do envio de cada versão, para aprová-la ou solicitar ajustes. Sem manifestação nesse prazo, a versão será considerada aprovada para todos os fins.`,
      `Não configuram revisão, e seguem a regra de serviços adicionais, os pedidos que alterem o conceito, o roteiro aprovado ou exijam nova captação.`,
      data.type === "outsourcing"
        ? `A ${provider} realizará os ajustes solicitados em até 2 (dois) dias úteis a cada rodada, salvo prazo diverso combinado por escrito.`
        : `A aprovação da versão final encerra a etapa de edição, e alterações posteriores serão orçadas à parte pela ${provider}.`,
    ],
  };
}

function rescheduleSection(data: ContractData, client: string, provider: string): ContractSection {
  const hours = plural(data.rules.rescheduleHours, "hora", "horas");
  if (data.type === "outsourcing") {
    return {
      heading: "DO REAGENDAMENTO E DO NÃO COMPARECIMENTO",
      paragraphs: [
        `A ${client} poderá reagendar a execução dos serviços mediante aviso com pelo menos ${hours} de antecedência, sem qualquer custo, respeitada a disponibilidade de agenda da ${provider}.`,
        `Cancelamentos pela ${client} com antecedência inferior a ${hours} garantirão à ${provider} o recebimento de 30% (trinta por cento) do valor da diária ou do serviço cancelado.`,
        `A ${provider} compromete-se a comparecer no local e horário combinados. A ausência injustificada, ou o aviso com antecedência inferior a ${hours}, autoriza a ${client} a contratar outro profissional e a descontar dos valores devidos, ou exigir a devolução dos valores adiantados, sem prejuízo de reparação pelos prejuízos comprovados.`,
      ],
    };
  }
  return {
    heading: "DO REAGENDAMENTO E DO NÃO COMPARECIMENTO",
    paragraphs: [
      `A ${client} poderá reagendar ${data.type === "recurring" ? "cada captação" : "a captação"} uma única vez, sem custo, mediante aviso com pelo menos ${hours} de antecedência, sujeito à disponibilidade de agenda da ${provider}.`,
      `Reagendamentos com aviso inferior a ${hours}, bem como a ausência das pessoas, produtos ou acessos necessários no local e horário combinados, autorizam a cobrança de taxa de mobilização de 30% (trinta por cento) do valor ${data.type === "recurring" ? "mensal" : "total"}, além do reembolso de despesas já realizadas.`,
      `Será tolerado atraso de até 30 (trinta) minutos para o início da captação. Após esse período, o tempo perdido será descontado do tempo de gravação previsto.`,
      `Chuvas, condições climáticas adversas que inviabilizem captação externa ou outros motivos de força maior permitem a remarcação sem custo para ambas as partes.`,
    ],
  };
}

function editableFilesSection(data: ContractData, client: string, provider: string): ContractSection {
  return {
    heading: "DOS ARQUIVOS BRUTOS E EDITÁVEIS",
    paragraphs: [
      `O valor contratado contempla somente os arquivos finalizados descritos nos entregáveis. Arquivos brutos, projetos de edição, arquivos de cor, trilhas separadas e demais editáveis não integram a entrega.`,
      `Caso a ${client} deseje receber esses arquivos, a cessão poderá ser negociada à parte, mediante orçamento específico.`,
      `A ${provider} manterá cópia de segurança do material por 90 (noventa) dias após a entrega final, não sendo responsável pela guarda após esse prazo.`,
    ],
  };
}

function rightsSection(data: ContractData, client: string, provider: string): ContractSection {
  if (data.type === "outsourcing") {
    return {
      heading: "DA CESSÃO DE DIREITOS",
      paragraphs: [
        `Com o pagamento, a ${provider} cede à ${client}, em caráter total, definitivo, sem limite de território ou de prazo, todos os direitos patrimoniais sobre o material produzido em razão deste contrato, nos termos da Lei nº 9.610/1998.`,
        `A ${client} poderá utilizar, editar, adaptar e repassar o material ao seu cliente final, em qualquer mídia, sem necessidade de nova autorização ou pagamento adicional.`,
        `O crédito de autoria da ${provider} só será exibido se houver acordo nesse sentido entre as partes.`,
      ],
    };
  }
  return {
    heading: "DOS DIREITOS DE USO",
    paragraphs: [
      `Após a quitação integral dos valores devidos, a ${client} poderá utilizar o material finalizado em seus canais próprios, físicos e digitais, para fins institucionais e publicitários, por prazo indeterminado.`,
      `Os direitos morais de autor permanecem com a ${provider}, na forma da Lei nº 9.610/1998, e a revenda ou o licenciamento do material a terceiros dependem de autorização prévia e por escrito.`,
      `A ${client} declara possuir autorização para o uso de marcas, logotipos, músicas, imagens e pessoas que ela própria indicar ou fornecer, respondendo por eventuais reclamações de terceiros. A ${provider} utilizará apenas trilhas e elementos gráficos licenciados ou de uso livre.`,
    ],
  };
}

function nonSolicitationSection(client: string, provider: string): ContractSection {
  return {
    heading: "DA NÃO ABORDAGEM DO CLIENTE FINAL",
    paragraphs: [
      `Durante a vigência deste contrato e por 12 (doze) meses após o seu término, a ${provider} não oferecerá, direta ou indiretamente, serviços ao cliente final apresentado pela ${client}, salvo autorização prévia e por escrito.`,
      `Em contato com o cliente final, a ${provider} se apresentará como parte da equipe da ${client}, sem divulgar preços, dados de contato próprios para fins comerciais ou informações internas.`,
    ],
  };
}

function portfolioSection(data: ContractData, client: string, provider: string): ContractSection {
  if (data.type === "outsourcing") {
    return {
      heading: "DO USO EM PORTFÓLIO",
      paragraphs: [
        `A ${provider} somente poderá exibir o material em seu portfólio, site ou redes sociais após a publicação oficial pelo cliente final e mediante autorização prévia e por escrito da ${client}.`,
        `Na divulgação autorizada, a ${provider} não poderá mencionar valores, bastidores comerciais ou informações confidenciais do projeto.`,
      ],
    };
  }
  if (data.type === "image") {
    return {
      heading: "DO USO EM PORTFÓLIO",
      paragraphs: [
        `A ${client} autoriza ainda que as imagens sejam exibidas no portfólio, site, redes sociais e apresentações comerciais da ${provider}, como demonstração do seu trabalho, nas mesmas condições de território e prazo deste termo.`,
      ],
    };
  }
  return {
    heading: "DO USO EM PORTFÓLIO",
    paragraphs: [
      `A ${client} autoriza a ${provider} a exibir o material produzido, no todo ou em trechos, em seu portfólio, site, redes sociais e apresentações comerciais, sem qualquer remuneração, respeitadas as informações confidenciais.`,
      `Se houver necessidade de restringir ou adiar a divulgação, a ${client} deverá informar a ${provider} por escrito antes da entrega final.`,
    ],
  };
}

function confidentialitySection(data: ContractData, client: string, provider: string): ContractSection {
  const paragraphs = [
    `As partes manterão sigilo sobre as informações estratégicas, comerciais, financeiras e técnicas a que tiverem acesso em razão deste ${data.type === "image" ? "termo" : "contrato"}, inclusive sobre os valores aqui pactuados, durante a sua vigência e por 2 (dois) anos após o seu término.`,
    `Não são confidenciais as informações que já sejam públicas ou cuja divulgação seja exigida por lei ou ordem judicial.`,
  ];
  if (data.type === "outsourcing") {
    paragraphs.push(
      `A ${provider} não divulgará o nome do cliente final, roteiros, materiais brutos ou qualquer conteúdo do projeto antes da publicação oficial e sem autorização da ${client}.`,
    );
  }
  if (data.type === "image") {
    paragraphs.push(`O conteúdo captado só será divulgado pela ${provider} nas finalidades descritas neste termo.`);
  }
  return { heading: "DA CONFIDENCIALIDADE", paragraphs };
}

function dataProtectionSection(data: ContractData, client: string, provider: string): ContractSection {
  if (data.type === "image") {
    return {
      heading: "DA PROTEÇÃO DE DADOS PESSOAIS",
      paragraphs: [
        `A imagem, a voz e o nome da ${client} constituem dados pessoais e serão tratados pela ${provider} exclusivamente para as finalidades descritas neste termo, com base no consentimento aqui manifestado, nos termos da Lei nº 13.709/2018 (LGPD).`,
        `A ${client} poderá solicitar informações sobre o tratamento dos seus dados pelo e-mail ${v(data.me.email)}.`,
        `Os dados cadastrais informados neste termo serão mantidos apenas pelo tempo necessário ao cumprimento de obrigações legais e à comprovação da autorização concedida.`,
      ],
    };
  }
  return {
    heading: "DA PROTEÇÃO DE DADOS PESSOAIS",
    paragraphs: [
      `As partes tratarão os dados pessoais recebidos em razão deste contrato exclusivamente para a sua execução, em conformidade com a Lei nº 13.709/2018 (LGPD), adotando medidas razoáveis de segurança para protegê-los contra acessos não autorizados.`,
      `Imagens e vozes de pessoas captadas serão utilizadas apenas nas finalidades do projeto. Cabe à ${client} obter as autorizações de uso de imagem das pessoas que ela indicar para participar das gravações, salvo acordo diverso.`,
      `Encerrado o contrato, os dados pessoais serão eliminados ou mantidos somente pelo prazo necessário ao cumprimento de obrigações legais ou ao exercício regular de direitos.${data.type === "outsourcing" ? ` A ${provider} não poderá compartilhar dados do cliente final com terceiros.` : ""}`,
    ],
  };
}

function terminationSection(data: ContractData, client: string, provider: string): ContractSection {
  const { scope } = data;
  if (data.type === "recurring") {
    return {
      heading: "DA VIGÊNCIA E DA RESCISÃO",
      paragraphs: [
        `Este contrato vigorará por ${plural(scope.termMonths, "mês", "meses")}, a contar da data de sua assinatura, e será renovado automaticamente por períodos iguais caso nenhuma das partes manifeste o contrário.`,
        `Qualquer das partes poderá rescindir este contrato, sem justa causa, mediante aviso prévio por escrito de ${plural(scope.noticeDays, "dia", "dias")}. Durante o aviso prévio, os serviços e os pagamentos seguem normalmente.`,
        `A rescisão sem o cumprimento do aviso prévio obriga a parte que a solicitou ao pagamento de valor equivalente a 1 (uma) mensalidade, a título de compensação.`,
        `O descumprimento de qualquer obrigação, não sanado em até 5 (cinco) dias após notificação, autoriza a rescisão imediata pela parte prejudicada, sem prejuízo da cobrança dos valores devidos.`,
      ],
    };
  }
  if (data.type === "outsourcing") {
    return {
      heading: "DA RESCISÃO",
      paragraphs: [
        `A ${client} poderá rescindir este contrato a qualquer tempo, mediante aviso por escrito, pagando à ${provider} apenas os serviços já executados e entregues até a data do aviso.`,
        `O descumprimento de prazos ou do padrão de qualidade combinado, não sanado em até 2 (dois) dias úteis após notificação, autoriza a rescisão imediata pela ${client}, com a devolução dos valores adiantados por serviços não entregues.`,
        `Se a ${provider} ficar impossibilitada de executar os serviços, deverá comunicar a ${client} imediatamente, podendo indicar profissional substituto de mesma qualificação, sujeito à aprovação da ${client}.`,
      ],
    };
  }
  return {
    heading: "DA RESCISÃO",
    paragraphs: [
      `Qualquer das partes poderá rescindir este contrato em caso de descumprimento de suas cláusulas não sanado em até 5 (cinco) dias após notificação por escrito.`,
      `Em caso de desistência da ${client} após a contratação, os valores pagos a título de reserva de data não serão devolvidos, sendo devidos ainda os serviços já executados até a data do aviso.`,
      `Se a ${provider} ficar impossibilitada de executar os serviços por motivo de força maior, deverá indicar profissional substituto de mesma qualificação, com a concordância da ${client}, ou devolver integralmente os valores recebidos pelos serviços não prestados.`,
    ],
  };
}

function generalSection(data: ContractData): ContractSection {
  const doc = data.type === "image" ? "termo" : "contrato";
  const paragraphs = [
    data.type === "image"
      ? `Este termo não gera vínculo empregatício, societário ou de exclusividade entre as partes.`
      : `Este contrato não gera vínculo empregatício, societário ou de exclusividade entre as partes, sendo cada uma responsável por seus próprios tributos, encargos e equipes.`,
    `As comunicações, aprovações e notificações trocadas por e-mail ou aplicativo de mensagens entre os contatos indicados neste ${doc} são válidas para todos os fins.`,
    `A tolerância de uma parte quanto ao descumprimento de qualquer obrigação não significa renúncia ou alteração do que foi pactuado.`,
    `As partes admitem a assinatura deste ${doc} por meio eletrônico, com a mesma validade da assinatura física.`,
  ];
  return { heading: "DAS DISPOSIÇÕES GERAIS", paragraphs };
}

function forumSection(data: ContractData): ContractSection {
  return {
    heading: "DO FORO",
    paragraphs: [
      `As partes buscarão resolver de forma amigável qualquer divergência sobre este ${data.type === "image" ? "termo" : "contrato"}. Não havendo acordo, fica eleito o foro da Comarca de ${v(data.signature.forum)} para dirimir as questões dele decorrentes, com renúncia a qualquer outro, por mais privilegiado que seja.`,
    ],
  };
}

/* ---- Uso de imagem ---- */

function imageSections(data: ContractData, grantor: string, grantee: string): ContractSection[] {
  const { scope, payment } = data;
  const sections: ContractSection[] = [
    {
      heading: "DO OBJETO",
      paragraphs: [
        `Pelo presente termo, a ${grantor} autoriza a ${grantee} a captar e utilizar a sua imagem, voz, nome e eventuais depoimentos em fotografias e vídeos produzidos em ${shortDate(scope.captureDate)}, no seguinte local: ${inline(scope.captureLocation)}, relativos a: ${inline(scope.description)}.`,
        `A autorização abrange o material bruto e o material editado, incluindo cortes, legendas, trilhas, tratamento de cor e adaptações de formato, desde que não deturpem a imagem ou o contexto em que a ${grantor} foi captada.`,
      ],
    },
    {
      heading: "DA FINALIDADE E DAS MÍDIAS",
      paragraphs: [
        `O material poderá ser utilizado nas seguintes finalidades e mídias: ${inline(scope.imagePurpose)}.`,
        `É vedado qualquer uso que atente contra a honra, a boa fama ou a respeitabilidade da ${grantor}, ou que associe a sua imagem a conteúdos ilícitos, discriminatórios, político-partidários ou ofensivos, nos termos do art. 20 do Código Civil.`,
      ],
    },
    {
      heading: "DO TERRITÓRIO E DO PRAZO",
      paragraphs: [
        `A autorização é válida para o seguinte território: ${inline(scope.imageTerritory)}.`,
        `O prazo de uso é de ${plural(scope.imageTermMonths, "mês", "meses")}, contados da data de assinatura deste termo. Encerrado o prazo, a ${grantee} não fará novas veiculações, podendo permanecer disponíveis as publicações já realizadas em redes sociais e arquivos históricos, sem impulsionamento.`,
      ],
    },
  ];

  if (payment.imagePaid) {
    sections.push({
      heading: "DA REMUNERAÇÃO",
      paragraphs: [
        `Pela presente autorização, a ${grantee} pagará à ${grantor} o valor total de ${money(payment.amount)}.`,
        ...paymentParagraphs(data, grantee, grantor).map((text) =>
          text.replace("na entrega do material finalizado", "na data da captação").replace(/A primeira parcela garante[^.]*\./, "").trim(),
        ).filter(Boolean),
        `O valor acima quita integralmente o uso da imagem nas condições deste termo, nada mais sendo devido a esse título.`,
      ],
    });
  } else {
    sections.push({
      heading: "DA GRATUIDADE",
      paragraphs: [
        `A presente autorização é concedida a título gratuito, nada sendo devido à ${grantor}, a qualquer tempo, a título de direito de imagem, voz ou direitos conexos, nas condições deste termo.`,
      ],
    });
  }

  sections.push({
    heading: "DAS DECLARAÇÕES",
    paragraphs: [
      `A ${grantor} declara ser maior de idade e plenamente capaz ou, caso contrário, estar representada por seu responsável legal, que também assina este termo.`,
      `A ${grantor} declara não possuir contrato de exclusividade de imagem com terceiros que impeça a presente autorização.`,
    ],
  });
  return sections;
}

function imageRevocationSection(data: ContractData, grantor: string, grantee: string): ContractSection {
  return {
    heading: "DA REVOGAÇÃO",
    paragraphs: [
      `A ${grantor} poderá solicitar por escrito a interrupção de novos usos da sua imagem. Nesse caso, a ${grantee} terá 30 (trinta) dias para retirar o material dos canais sob o seu controle.`,
      `A revogação não obriga a ${grantee} a recolher materiais já impressos, veiculados ou entregues a terceiros antes da solicitação, nem gera direito a indenização${data.payment.imagePaid ? `, e implicará a devolução proporcional do valor recebido, considerado o prazo de uso restante` : ""}.`,
    ],
  };
}

/* ------------------------------------------------------------------ */

const TITLES = {
  custom: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS",
  project: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS",
  recurring: "CONTRATO DE PRESTAÇÃO CONTINUADA DE SERVIÇOS AUDIOVISUAIS",
  outsourcing: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS TERCEIRIZADOS",
  image: "TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ",
} as const;

/** Monta o contrato completo, numerado, a partir dos dados do formulário. */
export function buildContract(data: ContractData): ContractDocument {
  const roles = partyRoles(data.type);
  const isImage = data.type === "image";
  const client = data.type === "outsourcing" ? roles.me : roles.other;
  const provider = data.type === "outsourcing" ? roles.other : roles.me;

  const raw: ContractSection[] = [];
  if (isImage) {
    const grantor = roles.other;
    const grantee = roles.me;
    raw.push(...imageSections(data, grantor, grantee));
    if (ruleOn(data, "portfolio")) raw.push(portfolioSection(data, grantor, grantee));
    if (ruleOn(data, "confidentiality")) raw.push(confidentialitySection(data, grantor, grantee));
    if (ruleOn(data, "dataProtection")) raw.push(dataProtectionSection(data, grantor, grantee));
    raw.push(imageRevocationSection(data, grantor, grantee));
  } else {
    raw.push(objectSection(data, client, provider));
    raw.push(scheduleSection(data, client, provider));
    raw.push(priceSection(data, client, provider));
    if (ruleOn(data, "lateFee")) raw.push(lateFeeSection(data, client, provider));
    if (ruleOn(data, "scopeControl")) raw.push(scopeSection(data, client, provider));
    if (ruleOn(data, "approval")) raw.push(approvalSection(data, client, provider));
    if (ruleOn(data, "reschedule")) raw.push(rescheduleSection(data, client, provider));
    if (ruleOn(data, "editableFiles")) raw.push(editableFilesSection(data, client, provider));
    raw.push(rightsSection(data, client, provider));
    if (data.type === "outsourcing") raw.push(nonSolicitationSection(client, provider));
    if (ruleOn(data, "portfolio")) raw.push(portfolioSection(data, client, provider));
    if (ruleOn(data, "confidentiality")) raw.push(confidentialitySection(data, client, provider));
    if (ruleOn(data, "dataProtection")) raw.push(dataProtectionSection(data, client, provider));
    raw.push(terminationSection(data, client, provider));
  }
  raw.push(generalSection(data));
  if (data.signature.forumEnabled) raw.push(forumSection(data));

  const sections = raw.map((section, index) => ({
    heading: `${index + 1}. ${section.heading}`,
    paragraphs: section.paragraphs.map((text, pIndex) => `${index + 1}.${pIndex + 1}. ${text}`),
  }));

  const first = isImage ? data.other : data.type === "outsourcing" ? data.me : data.other;
  const second = isImage ? data.me : data.type === "outsourcing" ? data.other : data.me;
  const firstRole = isImage ? roles.other : client;
  const secondRole = isImage ? roles.me : provider;

  const preamble = [
    `Pelo presente instrumento particular, de um lado, ${qualify(first, firstRole)} e, de outro lado, ${qualify(second, secondRole).replace(/;$/, ".")}`,
    isImage
      ? `As partes acima identificadas têm entre si justo e acordado o presente termo, que se regerá pelas cláusulas e condições a seguir.`
      : `As partes acima identificadas têm entre si justo e contratado o presente contrato, que se regerá pelas cláusulas e condições a seguir.`,
  ];

  const witnesses = data.rules.signatures;
  const doc = isImage ? "termo" : "contrato";
  const closing = witnesses
    ? `E, por estarem de acordo, as partes assinam o presente ${doc} em 2 (duas) vias de igual teor e forma, ou eletronicamente, na presença das 2 (duas) testemunhas abaixo, para que produza os seus efeitos jurídicos.`
    : `E, por estarem de acordo, as partes assinam o presente ${doc} em 2 (duas) vias de igual teor e forma, ou eletronicamente, para que produza os seus efeitos jurídicos.`;

  return {
    title: TITLES[data.type],
    preamble,
    sections,
    closing,
    placeDate: `${cityState(data.signature.city, data.signature.state)}, ${longDate(data.signature.date)}.`,
    signers: [
      { role: firstRole, name: first.name.trim(), document: first.document.trim() },
      { role: secondRole, name: second.name.trim(), document: second.document.trim() },
    ],
    witnesses,
  };
}

const stripTags = (value: string) => value.replace(/<\/?b>/g, "");

export function contractToText(doc: ContractDocument): string {
  const lines: string[] = [doc.title, ""];
  doc.preamble.forEach((p) => lines.push(stripTags(p), ""));
  doc.sections.forEach((section) => {
    lines.push(section.heading, "");
    section.paragraphs.forEach((p) => lines.push(stripTags(p), ""));
  });
  lines.push(doc.closing, "", doc.placeDate, "");
  doc.signers.forEach((signer) => {
    lines.push("", "_______________________________________", signer.name || signer.role, `${signer.role}${signer.document ? ` — CPF/CNPJ ${signer.document}` : ""}`);
  });
  if (doc.witnesses) {
    [1, 2].forEach((n) => {
      lines.push("", "_______________________________________", `Testemunha ${n}`, "Nome:", "CPF:");
    });
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** HTML seguro: escapa o conteúdo e só então reaplica o negrito das partes. */
function safe(value: string) {
  return escapeHtml(value).replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>");
}

function paragraphHtml(text: string) {
  const match = text.match(/^(\d+\.\d+\.)\s([\s\S]*)$/);
  if (!match) return `<p>${safe(text)}</p>`;
  return `<p><b>${match[1]}</b> ${safe(match[2])}</p>`;
}

export function contractToHtml(doc: ContractDocument, logo?: string): string {
  const signature = (name: string, role: string, extra: string) =>
    `<div class="sig"><div class="line"></div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(role)}</span>${extra}</div>`;

  return `
    ${logo ? `<div class="logo"><img src="${escapeHtml(logo)}" alt="" /></div>` : ""}
    <h1>${escapeHtml(doc.title)}</h1>
    ${doc.preamble.map((p) => `<p>${safe(p)}</p>`).join("")}
    ${doc.sections
      .map((section) => `<section><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map(paragraphHtml).join("")}</section>`)
      .join("")}
    <p class="closing">${escapeHtml(doc.closing)}</p>
    <p class="place">${escapeHtml(doc.placeDate)}</p>
    <div class="signatures">
      ${doc.signers
        .map((s) => signature(s.name || BLANK, s.role, s.document ? `<span>CPF/CNPJ: ${escapeHtml(s.document)}</span>` : ""))
        .join("")}
    </div>
    ${
      doc.witnesses
        ? `<div class="signatures witnesses">${[1, 2]
            .map((n) => signature(`Testemunha ${n}`, "Nome:", "<span>CPF:</span>"))
            .join("")}</div>`
        : ""
    }`;
}

export const CONTRACT_PRINT_CSS = `
  body { font-family: Georgia, "Times New Roman", serif; font-size: 12px; line-height: 1.65; }
  .logo { text-align: center; margin-bottom: 18px; }
  .logo img { max-height: 64px; max-width: 220px; object-fit: contain; }
  h1 { font-size: 15px; letter-spacing: .03em; margin-bottom: 22px; }
  h2 { font-size: 12px; margin-top: 16px; break-after: avoid; }
  section { break-inside: auto; }
  .closing { margin-top: 18px; }
  .place { text-align: right; margin: 18px 0 8px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 44px; break-inside: avoid; }
  .witnesses { margin-top: 36px; }
  .sig { display: flex; flex-direction: column; font-size: 11px; }
  .sig .line { border-top: 1px solid #111; margin-bottom: 6px; }
  .sig strong { font-size: 12px; }
  .sig span { color: #444; }
`;
