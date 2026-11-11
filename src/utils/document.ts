import { alertDialog } from "@/components/ui/DialogHost";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/**
 * Abre o documento numa janela limpa e chama a impressão do navegador,
 * onde a pessoa escolhe "Salvar como PDF".
 */
export function printDocument(title: string, bodyHtml: string, extraCss = "") {
  const win = window.open("", "_blank");
  if (!win) {
    void alertDialog({ title: "Pop-up bloqueado", message: "Permita pop-ups para este site no navegador para gerar o PDF." });
    return;
  }
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: Inter, Arial, sans-serif; color: #111; font-size: 12.5px; line-height: 1.6; margin: 0; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 18px; }
  h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .04em; }
  p { margin: 0 0 8px; text-align: justify; }
  ${extraCss}
</style></head><body>${bodyHtml}<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`);
  win.document.close();
}

/**
 * Imprime um documento HTML completo por um iframe escondido (não depende de pop-up),
 * onde a pessoa escolhe "Salvar como PDF".
 */
export function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // Remove depois que a janela de impressão fecha (ou após 1 min, se o navegador não avisar).
    const cleanup = () => frame.remove();
    frame.contentWindow?.addEventListener("afterprint", cleanup);
    window.setTimeout(cleanup, 60_000);
  };
  // Espera imagens (logo) carregarem antes de imprimir.
  const pending = Array.from(doc.images)
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve());
          img.addEventListener("error", () => resolve());
        }),
    );
  void Promise.all(pending).then(() => window.setTimeout(run, 150));
}

export function downloadFile(fileName: string, content: string, type = "text/html;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(value: string, fallback = "documento") {
  return (
    (value || fallback)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || fallback
  );
}
