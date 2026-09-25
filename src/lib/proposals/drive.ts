/** Extrai o fileId de um link do Google Drive (/file/d/<id>/ ou ?id=<id>). */
export function extractDriveId(url: string): string | null {
  const value = (url || "").trim();
  if (!/drive\.google\.com|docs\.google\.com/i.test(value)) return null;
  const byPath = value.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (byPath) return byPath[1];
  const byQuery = value.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (byQuery) return byQuery[1];
  return null;
}

export function driveThumbnail(id: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`;
}

export function drivePlayer(id: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
}

/** Separa um texto colado (um link por linha) em links válidos e inválidos. */
export function parseDriveLinks(text: string) {
  const lines = text
    .split(/[\n\r]+|\s{2,}|,\s*(?=https?:)/)
    .map((line) => line.trim())
    .filter(Boolean);
  const valid: { url: string; id: string }[] = [];
  const invalid: string[] = [];
  for (const line of lines) {
    const id = extractDriveId(line);
    if (id) valid.push({ url: line, id });
    else invalid.push(line);
  }
  return { valid, invalid };
}
