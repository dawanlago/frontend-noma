/* Roteiro de gravação: cenas com ação, áudio/fala e duração (ferramenta "script"). */

export interface ScriptScene {
  id: string;
  /** Descrição da cena / ação em quadro. */
  description: string;
  /** Áudio, locução ou fala. */
  audio: string;
  /** Duração livre: "15s", "0:15", "1min"... */
  duration: string;
  notes: string;
}

export interface ScriptData {
  title: string;
  /** Briefing de origem (vazio = roteiro avulso). */
  briefingId: string;
  client: string;
  format: string;
  notes: string;
  scenes: ScriptScene[];
}

export function sceneId() {
  return Math.random().toString(36).slice(2, 10);
}

export function newScene(): ScriptScene {
  return { id: sceneId(), description: "", audio: "", duration: "", notes: "" };
}

export function defaultData(): ScriptData {
  return { title: "", briefingId: "", client: "", format: "", notes: "", scenes: [newScene()] };
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

export function normalize(partial: Partial<ScriptData>): ScriptData {
  const p = (partial && typeof partial === "object" ? partial : {}) as Record<string, unknown>;
  const scenes = Array.isArray(p.scenes)
    ? p.scenes
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          id: str(item.id) || sceneId(),
          description: str(item.description),
          audio: str(item.audio),
          duration: str(item.duration),
          notes: str(item.notes),
        }))
    : [];
  return {
    title: str(p.title),
    briefingId: /^[a-f0-9]{24}$/.test(str(p.briefingId)) ? str(p.briefingId) : "",
    client: str(p.client),
    format: str(p.format),
    notes: str(p.notes),
    scenes,
  };
}

export function titleOf(data: ScriptData) {
  return data.title.trim() || data.client.trim() || "Roteiro sem nome";
}

/** "15", "15s", "0:15", "1:30", "1min", "1min30s", "2 min" → segundos (null = não dá para somar). */
export function parseDuration(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return null;
  const clock = text.match(/^(\d+):([0-5]?\d)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const parts = text.match(/^(?:(\d+)(?:min|m))?(?:(\d+)(?:s|seg|segundos)?)?$/);
  if (parts && (parts[1] || parts[2])) return Number(parts[1] || 0) * 60 + Number(parts[2] || 0);
  return null;
}

/** Soma das durações que dá para entender ("1:05"). */
export function totalDuration(scenes: ScriptScene[]) {
  const seconds = scenes.reduce((total, scene) => total + (parseDuration(scene.duration) || 0), 0);
  return { seconds, label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` };
}
