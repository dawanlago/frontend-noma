/** Listas de opções configuráveis (os itens ficam no servidor, em /options). */
export interface OptionListInfo {
  key: string;
  title: string;
  description: string;
  area: string;
}

export const OPTION_LISTS: OptionListInfo[] = [
  { key: "leadService", area: "CRM", title: "Serviços de interesse", description: "Serviço escolhido na negociação e nos filtros do CRM." },
  { key: "leadSource", area: "CRM", title: "Origens do lead", description: "Como o cliente chegou (Instagram, indicação...)." },
  { key: "relationship", area: "Base de dados", title: "Tipos de relação", description: "Cliente, lead, fornecedor, parceiro... Usado para filtrar a base." },
  { key: "niche", area: "Base de dados", title: "Nichos", description: "Segmento de atuação de contatos e empresas." },
  { key: "jobRole", area: "Base de dados", title: "Cargos", description: "Cargo do contato na empresa." },
  { key: "supplierCategory", area: "Base de dados", title: "Categorias de fornecedor/parceiro", description: "Editor, filmmaker, locação de equipamento..." },
  { key: "taskType", area: "Rotina", title: "Tipos de atividade", description: "Reunião, ligação, e-mail, follow-up... escolhido ao criar uma atividade ou compromisso." },
  { key: "incomeCategory", area: "Financeiro", title: "Tipos de receita", description: "Categorias das entradas." },
  { key: "expenseCategory", area: "Financeiro", title: "Categorias de despesa", description: "Categorias das despesas." },
  { key: "paymentMethod", area: "Financeiro", title: "Formas de pagamento", description: "Pix, cartão, boleto..." },
  { key: "financeCashbox", area: "Financeiro", title: "Caixas", description: "Financeiros separados (ex.: Noma e Brava). Cada caixa tem seus números e metas." },
  { key: "bankAccount", area: "Financeiro", title: "Bancos e contas", description: "De qual banco saiu ou para qual entrou cada lançamento." },
  { key: "budgetProjectType", area: "Orçamento", title: "Tipos de projeto", description: "Tipo de trabalho na Calculadora de Orçamento." },
  { key: "budgetItem", area: "Orçamento", title: "Itens de orçamento", description: "Profissionais e custos (assistente, fotógrafa, storymaker...) com unidade e valor padrão, para adicionar rápido na calculadora." },
  { key: "briefingFormat", area: "Briefing", title: "Formatos de entrega", description: "Vertical 9:16, horizontal 16:9..." },
  { key: "briefingChannel", area: "Briefing", title: "Canais de publicação", description: "Onde o conteúdo vai ser publicado." },
  { key: "briefingRevisions", area: "Briefing", title: "Número de revisões", description: "Opções do campo de revisões." },
  { key: "briefingStyle", area: "Briefing", title: "Estilos de produto", description: "Estilo desejado no briefing de produto." },
  { key: "prospectSegment", area: "Prospecção", title: "Segmentos", description: "Segmento da empresa abordada." },
  { key: "prospectSource", area: "Prospecção", title: "Como encontrou", description: "Onde você encontrou a empresa." },
  { key: "prospectOpportunity", area: "Prospecção", title: "Oportunidades", description: "Oportunidades e as mensagens prontas de cada uma." },
  { key: "prospectGoal", area: "Prospecção", title: "Objetivos da mensagem", description: "Objetivo e a frase final (chamada) de cada um." },
];

export function listInfo(key: string): OptionListInfo {
  if (key.startsWith("field:")) {
    return { key, area: "Campos personalizados", title: "Opções do campo", description: "Opções deste campo personalizado." };
  }
  return OPTION_LISTS.find((item) => item.key === key) || { key, area: "", title: key, description: "" };
}

/** Listas cujas opções têm mensagens editáveis na tela de configurações da prospecção. */
export const MESSAGE_LISTS = ["prospectOpportunity", "prospectGoal"];
