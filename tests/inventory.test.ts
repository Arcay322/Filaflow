import { describe, expect, it } from "vitest";
import {
  spoolSchema,
  changeWeight,
  netWeight,
  materialCost,
  toCsv,
  type SpoolInput,
} from "../src/lib/inventory";

const spool: SpoolInput = {
  name: "PLA azul",
  brand: "Flashforge",
  material: "PLA",
  colorName: "Azul",
  colorHex: "#2557d6",
  initialWeight: 1000,
  remainingWeight: 350,
  tareWeight: 220,
  purchasePrice: 65,
  lowStockThreshold: 100,
  location: "Estante A",
  notes: "",
  archived: false,
};

describe("inventario de bobinas", () => {
  it("rechaza una cantidad restante mayor que la capacidad", () => {
    expect(
      spoolSchema.safeParse({ ...spool, remainingWeight: 1001 }).success,
    ).toBe(false);
  });
  it("rechaza números no finitos y nombres vacíos", () => {
    expect(
      spoolSchema.safeParse({ ...spool, remainingWeight: NaN }).success,
    ).toBe(false);
    expect(spoolSchema.safeParse({ ...spool, name: "  " }).success).toBe(false);
  });
  it("descuenta el consumo y calcula su costo con el peso inicial", () => {
    expect(changeWeight(spool, { type: "consume", grams: 50 })).toEqual({
      before: 350,
      after: 300,
      delta: -50,
      cost: 3.25,
    });
  });
  it("impide consumir más material del disponible o cantidades negativas", () => {
    expect(() =>
      changeWeight(spool, { type: "consume", grams: 351 }),
    ).toThrow();
    expect(() =>
      changeWeight(spool, { type: "consume", grams: -10 }),
    ).toThrow();
  });
  it("permite corregir el peso en ambas direcciones, conservando el cambio", () => {
    expect(changeWeight(spool, { type: "adjust", grams: 400 }).delta).toBe(50);
    expect(changeWeight(spool, { type: "adjust", grams: 0 }).after).toBe(0);
  });
  it("impide superar la capacidad y registrar ajustes que no cambian el peso", () => {
    expect(() =>
      changeWeight(spool, { type: "adjust", grams: 1001 }),
    ).toThrow();
    expect(() => changeWeight(spool, { type: "adjust", grams: 350 })).toThrow();
  });
  it("resta la tara del pesaje y rechaza pesajes menores que la bobina vacía", () => {
    expect(netWeight(620, 220)).toBe(400);
    expect(() => netWeight(200, 220)).toThrow();
  });
  it("calcula el valor del material restante y conserva decimales", () => {
    expect(materialCost(spool, 350)).toBe(22.75);
    expect(changeWeight(spool, { type: "consume", grams: 0.1 }).after).toBe(
      349.9,
    );
  });
  it("exporta texto con comillas y neutraliza fórmulas de hojas de cálculo", () => {
    const csv = toCsv([{ id: "a", ...spool, name: '=HYPERLINK("x")' }]);
    expect(csv).toContain("' =".replace(" ", ""));
    expect(csv).toContain('""x""');
  });
});
