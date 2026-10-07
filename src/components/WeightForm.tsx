import { useState, type FormEvent } from "react";
import { ArrowDownRight, Scale } from "lucide-react";
import {
  changeWeight,
  grams,
  money,
  netWeight,
  type Spool,
  type WeightChange,
} from "../lib/inventory";
import { friendlyError } from "../lib/errors";
import { Modal } from "./Modal";

export function WeightForm({
  spool,
  onSave,
  onClose,
}: {
  spool: Spool;
  onSave: (input: WeightChange, note: string) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<"consume" | "adjust">("consume");
  const [amount, setAmount] = useState("");
  const [gross, setGross] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  let result: ReturnType<typeof changeWeight> | undefined;
  let validation = "";
  const weight = () =>
    gross && type === "adjust"
      ? netWeight(Number(amount), spool.tareWeight)
      : Number(amount);
  if (amount !== "") {
    try {
      result = changeWeight(spool, { type, grams: weight() });
    } catch (err) {
      validation = friendlyError(err);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!result) return;
    setBusy(true);
    setError("");
    try {
      await onSave({ type, grams: weight() }, note);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }
  return (
    <Modal title="Actualizar cantidad" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="form-body">
        <div className="spool-reference">
          <span className="color-dot" style={{ background: spool.colorHex }} />
          <div>
            <strong>{spool.name}</strong>
            <span>
              {spool.material} · {grams(spool.remainingWeight)} g disponibles
            </span>
          </div>
        </div>
        <div className="segmented">
          <button
            type="button"
            aria-pressed={type === "consume"}
            onClick={() => {
              setType("consume");
              setAmount("");
            }}
          >
            <ArrowDownRight size={17} />
            Registrar consumo
          </button>
          <button
            type="button"
            aria-pressed={type === "adjust"}
            onClick={() => {
              setType("adjust");
              setAmount("");
            }}
          >
            <Scale size={17} />
            Corregir peso
          </button>
        </div>
        {type === "adjust" && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={gross}
              onChange={(e) => setGross(e.target.checked)}
            />
            Estoy pesando la bobina completa
          </label>
        )}
        <label>
          {type === "consume"
            ? "Filamento utilizado (g)"
            : gross
              ? "Peso total en la balanza (g)"
              : "Nueva cantidad de filamento (g)"}
          <input
            autoFocus
            type="number"
            required
            min={type === "consume" ? "0.001" : "0"}
            max={
              gross && type === "adjust"
                ? spool.initialWeight + spool.tareWeight
                : spool.initialWeight
            }
            step="0.001"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <p className="field-help">
          {type === "consume"
            ? "Incluye material de las piezas, soportes, purgas y fallos."
            : gross
              ? `Se descontarán ${grams(spool.tareWeight)} g de la bobina vacía.`
              : "Introduce el peso real de filamento disponible."}
        </p>
        {result && (
          <div className="weight-preview">
            <div>
              <span>Quedarán</span>
              <strong>
                {grams(result.after)} <small>g</small>
              </strong>
            </div>
            <div>
              <span>
                {type === "consume" ? "Costo del material" : "Corrección"}
              </span>
              <strong>
                {type === "consume"
                  ? money(result.cost)
                  : `${result.delta > 0 ? "+" : ""}${grams(result.delta)} g`}
              </strong>
            </div>
          </div>
        )}
        <label>
          <span>Nota <span className="optional">opcional</span></span>
          <input
            maxLength={200}
            placeholder={
              type === "consume"
                ? "Ej. Tanda de 12 llaveros"
                : "Ej. Pesaje con balanza"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {(error || validation) && (
          <p className="error-message" role="alert">
            {error || validation}
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
          <button className="button primary" disabled={busy || !result}>
            {busy
              ? "Guardando…"
              : type === "consume"
                ? "Guardar consumo"
                : "Guardar corrección"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
