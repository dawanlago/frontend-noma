import type { BucketMovement, DistributionBucket } from "@/types";

/** O que a planilha das caixas mostra em cada mês. */
export type BucketSheetMode = "in" | "out" | "net";

export interface BucketSheetRow {
  key: string;
  name: string;
  color: string;
  /** Caixa que não existe mais (o histórico guarda o nome). */
  removed: boolean;
  months: number[];
  total: number;
}

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Planilha do ano: uma linha por caixa e uma coluna por mês com o que entrou (distribuído),
 * o que saiu (retiradas) ou o saldo do mês (entrou − saiu).
 */
export function bucketSheet(movements: BucketMovement[], buckets: DistributionBucket[], mode: BucketSheetMode) {
  const rows = new Map<string, BucketSheetRow>();
  buckets.forEach((bucket) =>
    rows.set(bucket._id, { key: bucket._id, name: bucket.name, color: bucket.color, removed: false, months: Array(12).fill(0), total: 0 }),
  );
  for (const movement of movements) {
    const month = Number(movement.date.slice(5, 7)) - 1;
    if (month < 0 || month > 11) continue;
    const sign = movement.kind === "in" ? 1 : -1;
    if ((mode === "in" && sign < 0) || (mode === "out" && sign > 0)) continue;
    const value = mode === "net" ? sign * movement.value : movement.value;
    const row =
      rows.get(movement.bucketId) ||
      rows.set(movement.bucketId, {
        key: movement.bucketId,
        name: movement.bucketName || "Caixa removida",
        color: "",
        removed: true,
        months: Array(12).fill(0),
        total: 0,
      }).get(movement.bucketId)!;
    row.months[month] = round(row.months[month] + value);
    row.total = round(row.total + value);
  }
  const list = [...rows.values()].filter((row) => !row.removed || row.total !== 0 || row.months.some(Boolean));
  const totals = {
    months: Array.from({ length: 12 }, (_, month) => round(list.reduce((sum, row) => sum + row.months[month], 0))),
    total: round(list.reduce((sum, row) => sum + row.total, 0)),
  };
  return { rows: list, totals };
}
