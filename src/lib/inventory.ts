import { z } from 'zod';

export const materials = ['PLA', 'PLA+', 'PLA Silk', 'PETG', 'TPU', 'ABS', 'ASA', 'Otro'] as const;
const weight = z.number().finite().min(0).max(10000);
export const spoolSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre.').max(80),
  brand: z.string().trim().max(60),
  material: z.enum(materials),
  colorName: z.string().trim().min(1, 'Escribe el nombre del color.').max(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  initialWeight: weight.min(1), remainingWeight: weight,
  tareWeight: weight, purchasePrice: z.number().finite().min(0).max(100000),
  lowStockThreshold: weight, location: z.string().trim().max(80),
  notes: z.string().trim().max(500), archived: z.boolean(),
}).strict().superRefine((s, ctx) => {
  if (s.remainingWeight > s.initialWeight) ctx.addIssue({ code: 'custom', path: ['remainingWeight'], message: 'La cantidad restante supera el peso inicial.' });
  if (s.lowStockThreshold > s.initialWeight) ctx.addIssue({ code: 'custom', path: ['lowStockThreshold'], message: 'El aviso debe ser menor o igual al peso inicial.' });
});

export type SpoolInput = z.infer<typeof spoolSchema>;
export type Spool = SpoolInput & { id: string; createdAt?: number; updatedAt?: number; lastMovementId?: string | null };
export type WeightChange = { type: 'consume' | 'adjust'; grams: number };
export type Movement = { id: string; type: 'consume' | 'adjust'; before: number; after: number; delta: number; cost: number; note: string; createdAt: number };

export function materialCost(spool: Pick<SpoolInput, 'purchasePrice' | 'initialWeight'>, grams: number) {
  if (spool.initialWeight <= 0 || !Number.isFinite(grams)) throw new Error('El peso no es válido.');
  return Math.round((spool.purchasePrice / spool.initialWeight) * grams * 100) / 100;
}

export function changeWeight(spool: SpoolInput, change: WeightChange) {
  const grams = change.grams;
  if (!Number.isFinite(grams) || grams < 0 || (change.type === 'consume' && grams === 0)) throw new Error('Introduce una cantidad válida.');
  const before = spool.remainingWeight;
  const after = Math.round((change.type === 'consume' ? before - grams : grams) * 1000) / 1000;
  if (after < 0) throw new Error('No hay suficiente filamento para registrar ese consumo.');
  if (after > spool.initialWeight) throw new Error('La cantidad restante supera el peso inicial.');
  if (after === before) throw new Error('La cantidad coincide con el peso actual.');
  return { before, after, delta: after - before, cost: change.type === 'consume' ? materialCost(spool, before - after) : 0 };
}

export function netWeight(gross: number, tare: number) {
  if (!Number.isFinite(gross) || !Number.isFinite(tare) || gross < tare || tare < 0) throw new Error('El peso total debe ser mayor o igual al de la bobina vacía.');
  return Math.round((gross - tare) * 1000) / 1000;
}

const csvCell = (value: string | number) => {
  const raw = String(value);
  const safe = typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};
export function toCsv(spools: Spool[]) {
  const rows: (string | number)[][] = [['Bobina', 'Marca', 'Material', 'Color', 'Color HEX', 'Peso inicial (g)', 'Restante (g)', 'Tara (g)', 'Precio de compra (PEN)', 'Aviso (g)', 'Ubicación', 'Archivada', 'Notas']];
  spools.forEach(s => rows.push([s.name, s.brand, s.material, s.colorName, s.colorHex, s.initialWeight, s.remainingWeight, s.tareWeight, s.purchasePrice, s.lowStockThreshold, s.location, s.archived ? 'Sí' : 'No', s.notes]));
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export const grams = (value: number) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(value);
export const money = (value: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
