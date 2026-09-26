import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Logo da produtora para documentos (propostas, contratos): a enviada em Configurações
 * ou, sem ela, a logo da Noma servida pelo próprio sistema (endereço completo, para o PDF).
 */
export function useBrandLogo() {
  const uploaded = useWorkspace().settings?.brand?.logo || "";
  const [fallback, setFallback] = useState("");
  useEffect(() => setFallback(`${window.location.origin}/brand/noma-vermelho.png`), []);
  return uploaded || fallback;
}
