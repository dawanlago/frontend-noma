import { useRef, useState } from "react";
import { resizeImage } from "@/utils/image";
import { getInitials } from "@/utils/format";

interface ImageInputProps {
  value: string;
  onChange: (dataUrl: string) => void;
  name: string;
  label: string;
  rounded?: boolean;
}

/** Foto do contato ou logomarca da empresa, reduzida no navegador. */
export default function ImageInput({ value, onChange, name, label, rounded = true }: ImageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem (PNG, JPG ou WEBP).");
      return;
    }
    setError("");
    try {
      onChange(await resizeImage(file, 240, 0.82));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a imagem.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-charcoal/10 bg-tan/10 text-lg font-semibold text-tan ${
          rounded ? "rounded-full" : "rounded-xl"
        }`}
        aria-label={label}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`h-full w-full ${rounded ? "object-cover" : "object-contain"}`} />
        ) : (
          getInitials(name)
        )}
      </button>
      <div className="text-sm">
        <button type="button" className="font-semibold text-tan hover:underline" onClick={() => inputRef.current?.click()}>
          {value ? `Trocar ${label.toLowerCase()}` : `Enviar ${label.toLowerCase()}`}
        </button>
        {value ? (
          <button type="button" className="ml-3 font-semibold text-burgundy hover:underline" onClick={() => onChange("")}>
            Remover
          </button>
        ) : null}
        {error ? <p className="mt-1 text-xs text-burgundy">{error}</p> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
