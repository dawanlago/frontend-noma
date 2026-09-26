import { useState } from "react";
import { HiOutlineClipboardDocument, HiOutlineCheck } from "react-icons/hi2";
import { copyText } from "@/utils/document";

/** Chave PIX com botão de copiar (para pagar fornecedores). */
export default function PixKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copiar chave PIX"
      className="inline-flex max-w-full items-center gap-1.5 text-right text-tan hover:underline"
      onClick={() => {
        void copyText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      <span className="truncate">{value}</span>
      {copied ? <HiOutlineCheck className="h-4 w-4 shrink-0 text-sage" /> : <HiOutlineClipboardDocument className="h-4 w-4 shrink-0" />}
    </button>
  );
}
