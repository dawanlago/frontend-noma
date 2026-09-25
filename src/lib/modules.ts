import type { ModuleKey } from "@/types";

export interface ModuleInfo {
  key: ModuleKey;
  label: string;
  description: string;
  /** Rotas que dependem deste acesso. */
  paths: string[];
}

/** Áreas que o admin libera por usuário (Usuários → Acessos). */
export const MODULES: ModuleInfo[] = [
  { key: "crm", label: "CRM Comercial", description: "Funis e negociações.", paths: ["/crm"] },
  { key: "atividades", label: "Atividades", description: "Checklist de atividades.", paths: ["/atividades"] },
  { key: "anotacoes", label: "Anotações", description: "Quadro pessoal de anotações.", paths: ["/anotacoes"] },
  { key: "formularios", label: "Formulários", description: "Formulários com link para clientes.", paths: ["/formularios"] },
  { key: "prospeccao", label: "Gerador de Prospecção", description: "Mensagens de primeira abordagem.", paths: ["/prospeccao"] },
  { key: "followup", label: "Gerador de Follow-up", description: "Mensagens para retomar contato.", paths: ["/follow-up"] },
  { key: "propostas", label: "Gerador de Propostas", description: "Propostas comerciais.", paths: ["/propostas"] },
  { key: "orcamento", label: "Calculadora de Orçamento", description: "Precificação de projetos.", paths: ["/orcamento"] },
  { key: "contratos", label: "Contratos", description: "Gerador e contratos importados.", paths: ["/contratos"] },
  { key: "briefing", label: "Gerador de Briefing", description: "Briefings de produção.", paths: ["/briefing"] },
  { key: "financeiro", label: "Financeiro", description: "Entradas, despesas, metas e planilha.", paths: ["/financeiro"] },
  { key: "biblioteca", label: "Biblioteca audiovisual", description: "Links de músicas, LUTs, presets...", paths: ["/biblioteca"] },
  {
    key: "base",
    label: "Base de dados",
    description: "Contatos, empresas, fornecedores e parceiros.",
    paths: ["/contatos", "/empresas", "/fornecedores"],
  },
  { key: "produtos", label: "Produtos", description: "Catálogo de produtos e preços.", paths: ["/produtos"] },
  { key: "configuracoes", label: "Configurações", description: "Listas, campos, funis, modelos e identidade.", paths: ["/configuracoes"] },
];

export const ALL_MODULE_KEYS = MODULES.map((item) => item.key);

function matches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Módulo exigido pela rota (ou null se a rota é livre para quem está logado). */
export function moduleForPath(pathname: string): ModuleKey | null {
  return MODULES.find((item) => item.paths.some((path) => matches(pathname, path)))?.key || null;
}
