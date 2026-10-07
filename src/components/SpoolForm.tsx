import { useState, type FormEvent } from "react";
import {
  materials,
  spoolSchema,
  type Spool,
  type SpoolInput,
} from "../lib/inventory";
import { friendlyError } from "../lib/errors";
import { Modal } from "./Modal";

const colors = [
  ["Azul", "#2457d6"],
  ["Rojo", "#df5256"],
  ["Amarillo", "#e7b82f"],
  ["Verde", "#30a486"],
  ["Morado", "#9663cf"],
  ["Rosa", "#e795b4"],
  ["Blanco", "#e9edf1"],
  ["Negro", "#252d3c"],
];
const defaults: SpoolInput = {
  name: "",
  brand: "",
  material: "PLA",
  colorName: "Azul",
  colorHex: "#2457d6",
  initialWeight: 1000,
  remainingWeight: 1000,
  tareWeight: 0,
  purchasePrice: 0,
  lowStockThreshold: 100,
  location: "",
  notes: "",
  archived: false,
};
const numericFields = [
  "initialWeight",
  "remainingWeight",
  "tareWeight",
  "purchasePrice",
  "lowStockThreshold",
] as const;
type SpoolFormValues = {
  [K in keyof SpoolInput]: SpoolInput[K] extends number ? string : SpoolInput[K];
};

export function SpoolForm({
  spool,
  onSave,
  onClose,
}: {
  spool?: Spool;
  onSave: (input: SpoolInput) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<SpoolFormValues>(() => {
    const source = spool ?? defaults;
    return Object.fromEntries(
      Object.keys(defaults).map((key) => {
        const value = source[key as keyof SpoolInput];
        return [key, typeof value === "number" ? String(value) : value];
      }),
    ) as SpoolFormValues;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = <K extends keyof SpoolFormValues>(key: K, value: SpoolFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (numericFields.some((key) => values[key].trim() === "")) {
      setError("Completa los campos numéricos; puedes escribir 0 cuando corresponda.");
      return;
    }
    const parsed = spoolSchema.safeParse({
      ...values,
      ...Object.fromEntries(numericFields.map((key) => [key, Number(values[key])])),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSave(parsed.data);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }
  return (
    <Modal
      title={spool ? "Editar bobina" : "Nueva bobina"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="form-body">
        <label>
          Nombre de la bobina
          <input
            autoFocus
            required
            maxLength={80}
            placeholder="Ej. PLA azul para llaveros"
            value={values.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Material
            <select
              value={values.material}
              onChange={(e) =>
                field("material", e.target.value as SpoolInput["material"])
              }
            >
              {materials.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <input
              maxLength={60}
              placeholder="Ej. Flashforge"
              value={values.brand}
              onChange={(e) => field("brand", e.target.value)}
            />
          </label>
        </div>
        <div className="form-row color-row">
          <label>
            Nombre del color
            <input
              required
              maxLength={40}
              value={values.colorName}
              onChange={(e) => field("colorName", e.target.value)}
            />
          </label>
          <label>
            Muestra de color
            <input
              type="color"
              value={values.colorHex}
              onChange={(e) => field("colorHex", e.target.value)}
            />
          </label>
        </div>
        <div className="color-presets" aria-label="Colores rápidos">
          {colors.map(([name, color]) => (
            <button
              type="button"
              key={color}
              aria-label={`Usar color ${name}`}
              aria-pressed={values.colorHex === color}
              style={{ background: color }}
              onClick={() =>
                setValues((v) => ({ ...v, colorHex: color, colorName: name }))
              }
            />
          ))}
        </div>
        <div className="form-row">
          <label>
            Peso inicial de filamento (g)
            <input
              required
              type="number"
              min="1"
              max="10000"
              step="0.001"
              value={values.initialWeight}
              onChange={(e) => field("initialWeight", e.target.value)}
            />
          </label>
          <label>
            Cantidad restante (g)
            <input
              required
              disabled={!!spool}
              type="number"
              min="0"
              max={values.initialWeight || undefined}
              step="0.001"
              value={values.remainingWeight}
              onChange={(e) => field("remainingWeight", e.target.value)}
            />
          </label>
        </div>
        {spool && (
          <p className="field-help">
            Para cambiar la cantidad, usa «Registrar consumo» o «Corregir peso».
          </p>
        )}
        <div className="form-row">
          <label>
            Precio de la bobina (S/)
            <input
              required
              type="number"
              min="0"
              max="100000"
              step="0.01"
              value={values.purchasePrice}
              onChange={(e) => field("purchasePrice", e.target.value)}
            />
          </label>
          <label>
            Avisar cuando queden (g)
            <input
              required
              type="number"
              min="0"
              max={values.initialWeight || undefined}
              step="1"
              value={values.lowStockThreshold}
              onChange={(e) =>
                field("lowStockThreshold", e.target.value)
              }
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Peso de bobina vacía (g)
            <input
              required
              type="number"
              min="0"
              max="10000"
              step="0.001"
              value={values.tareWeight}
              onChange={(e) => field("tareWeight", e.target.value)}
            />
            <span className="field-help">
              Tara para descontar al pesarla completa.
            </span>
          </label>
          <label>
            Ubicación
            <input
              maxLength={80}
              placeholder="Ej. IFS · canal 1"
              value={values.location}
              onChange={(e) => field("location", e.target.value)}
            />
          </label>
        </div>
        <label>
          <span>Notas <span className="optional">opcional</span></span>
          <textarea
            maxLength={500}
            rows={2}
            placeholder="Acabado, ajustes o información útil…"
            value={values.notes}
            onChange={(e) => field("notes", e.target.value)}
          />
        </label>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar bobina"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
