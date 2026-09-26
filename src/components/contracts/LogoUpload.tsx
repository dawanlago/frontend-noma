import { useRef, useState } from "react";
import Link from "next/link";
import { useBrandLogo } from "@/hooks/useBrandLogo";
import { uploadImage, type UploadFolder } from "@/lib/upload";

interface LogoUploadProps {
  value: string;
  onChange: (url: string) => void;
  /** Pasta no Cloudinary. */
  folder?: UploadFolder;
}

/** Envio opcional do logo que aparece no topo do PDF (PNG transparente é preservado; fica no Cloudinary). */
export default function LogoUpload({ value, onChange, folder = "contratos" }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // No próprio cadastro da marca não faz sentido oferecer "usar a logo da marca".
  const workspaceLogo = useBrandLogo();
  const brandLogo = folder === "marca" ? "" : workspaceLogo;

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem (PNG, JPG ou WEBP).");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      onChange(await uploadImage(file, folder, 800, 0.9));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a imagem.");
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-charcoal/15 p-4">
      <div
        className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-lg border border-charcoal/10"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#f1f1f1 25%,transparent 25%),linear-gradient(-45deg,#f1f1f1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f1f1f1 75%),linear-gradient(-45deg,transparent 75%,#f1f1f1 75%)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Logo" className="max-h-14 max-w-[7.5rem] object-contain" />
        ) : (
          <span className="text-xs text-charcoal/40">Sem logo</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-charcoal">Logo (opcional)</p>
        <p className="text-xs text-charcoal/50">Aparece no topo do PDF. PNG com fundo transparente é mantido.</p>
        {error ? <p className="mt-1 text-xs text-burgundy">{error}</p> : null}
        {folder !== "marca" && !brandLogo ? (
          <p className="mt-1 text-xs text-charcoal/45">
            Cadastre a logo da produtora em{" "}
            <Link href="/configuracoes/geral" className="font-semibold text-charcoal/70 underline">
              Configurações → Geral
            </Link>{" "}
            para usá-la com um clique.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {brandLogo && value !== brandLogo ? (
          <button type="button" className="btn-secondary !py-1.5" onClick={() => onChange(brandLogo)}>
            Usar logo da Noma
          </button>
        ) : null}
        <button type="button" className="btn-secondary !py-1.5" disabled={isLoading} onClick={() => inputRef.current?.click()}>
          {isLoading ? "Carregando…" : value ? "Trocar" : "Enviar logo"}
        </button>
        {value ? (
          <button type="button" className="text-sm font-semibold text-burgundy" onClick={() => onChange("")}>
            Remover
          </button>
        ) : null}
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
