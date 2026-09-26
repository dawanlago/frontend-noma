/**
 * Reduz a imagem no navegador antes de enviar. PNG/WEBP mantêm a
 * transparência (saem em PNG); o resto vira JPEG.
 */
export function resizeImage(file: File, maxWidth = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const keepAlpha = file.type === "image/png" || file.type === "image/webp";
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem."))),
          keepAlpha ? "image/png" : "image/jpeg",
          quality,
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
