import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  History,
  MapPin,
  Pencil,
} from "lucide-react";
import { grams, money, type Spool } from "../lib/inventory";
import { SpoolGraphic } from "./SpoolGraphic";

export type SpoolAction = "edit" | "weight" | "history" | "archive";
export function SpoolCard({
  spool,
  onAction,
}: {
  spool: Spool;
  onAction: (kind: SpoolAction, spool: Spool) => void;
}) {
  const percentage = Math.max(
    0,
    Math.min(100, (spool.remainingWeight / spool.initialWeight) * 100),
  );
  const isLow = spool.remainingWeight <= spool.lowStockThreshold;
  return (
    <article
      className="spool-card"

      aria-label={spool.name}
    >
      <div className="card-visual">
        <span className="material-tag">{spool.material}</span>
        <span className={`stock-tag ${isLow ? "low" : ""}`}>
          {spool.archived
            ? "Archivada"
            : spool.remainingWeight === 0
              ? "Agotada"
              : isLow
                ? "Por reponer"
                : "Disponible"}
        </span>
        <SpoolGraphic color={spool.colorHex} />
      </div>
      <div className="card-body">
        <div className="card-title">
          <h2>{spool.name}</h2>
          <button
            className="icon-button"
            aria-label={`Editar ${spool.name}`}
            onClick={() => onAction("edit", spool)}
          >
            <Pencil size={16} />
          </button>
        </div>
        <p className="color-description">
          <span className="color-dot" style={{ background: spool.colorHex }} />
          {spool.colorName}
          <span className="separator-dot">·</span>
          {spool.brand || "Sin marca"}
        </p>
        <div className="weight-line">
          <strong>
            {grams(spool.remainingWeight)}
            <small> g</small>
          </strong>
          <span>de {grams(spool.initialWeight)} g</span>
        </div>
        <div
          className="weight-track"
          role="meter"
          aria-label={`Filamento restante de ${spool.name}`}
          aria-valuemin={0}
          aria-valuemax={spool.initialWeight}
          aria-valuenow={spool.remainingWeight}
        >
          <span
            style={{
              width: `${percentage}%`,
              background: spool.colorHex,
            }}
          />
        </div>
        <div className="card-meta">
          <span>
            <MapPin size={13} />
            {spool.location || "Sin ubicación"}
          </span>
          <span>
            {money((spool.purchasePrice / spool.initialWeight) * 1000)}
            /kg
          </span>
        </div>
        <div className="card-actions">
          {spool.archived ? (
            <button
              className="button secondary consume-button"
              onClick={() => {
                onAction("archive", spool);
              }}
            >
              <ArrowUpRight size={16} />
              Restaurar bobina
            </button>
          ) : (
            <button
              className="button secondary consume-button"
              onClick={() => onAction("weight", spool)}
            >
              <ArrowDownRight size={16} />
              Registrar consumo
            </button>
          )}
          <button
            className="icon-button"
            aria-label={`Ver historial de ${spool.name}`}
            onClick={() => onAction("history", spool)}
          >
            <History size={18} />
          </button>
          {!spool.archived && (
            <button
              className="icon-button"
              aria-label={`Archivar ${spool.name}`}
              onClick={() => {
                onAction("archive", spool);
              }}
            >
              <Archive size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
