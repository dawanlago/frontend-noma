import { useState } from "react";
import { copyText } from "@/utils/document";

interface CopyButtonProps {
  text: string | (() => string);
  label?: string;
  className?: string;
}

export default function CopyButton({ text, label = "Copiar mensagem", className = "btn-secondary" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyText(typeof text === "function" ? text() : text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" className={className} onClick={() => void handleCopy()}>
      {copied ? "Copiado!" : label}
    </button>
  );
}
