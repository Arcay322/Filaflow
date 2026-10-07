import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, History } from "lucide-react";
import { inventoryRepository } from "../lib/repository";
import { grams, money, type Spool, type Movement } from "../lib/inventory";
import { friendlyError } from "../lib/errors";
import { Modal } from "./Modal";

export function HistoryPanel({
  spool,
  repo,
  onClose,
}: {
  spool: Spool;
  repo: ReturnType<typeof inventoryRepository>;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(
    () =>
      repo.watchHistory(
        spool.id,
        (events) => {
          setEvents(events);
          setLoading(false);
        },
        (err) => {
          setError(friendlyError(err));
          setLoading(false);
        },
      ),
    [spool.id, repo],
  );
  return (
    <Modal title="Historial de consumo" onClose={onClose}>
      <div className="form-body">
        <div className="spool-reference">
          <span className="color-dot" style={{ background: spool.colorHex }} />
          <div>
            <strong>{spool.name}</strong>
            <span>Últimos 50 movimientos</span>
          </div>
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="muted">Cargando movimientos…</p>
        ) : events.length === 0 ? (
          <div className="history-empty">
            <History size={30} />
            <p>Aquí aparecerán los consumos y las correcciones de peso.</p>
          </div>
        ) : (
          <ol className="history-list">
            {events.map((event) => (
              <li key={event.id}>
                <span className={`event-icon ${event.type}`}>
                  {event.type === "consume" ? (
                    <ArrowDownRight size={19} />
                  ) : (
                    <ArrowUpRight size={19} />
                  )}
                </span>
                <div className="event-copy">
                  <strong>
                    {event.type === "consume"
                      ? "Consumo registrado"
                      : "Peso corregido"}
                  </strong>
                  <p>{event.note || "Sin nota"}</p>
                  <small>
                    {new Intl.DateTimeFormat("es-PE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(event.createdAt)}
                  </small>
                </div>
                <div className="event-amount">
                  <strong>
                    {event.delta > 0 ? "+" : ""}
                    {grams(event.delta)} g
                  </strong>
                  <span>{grams(event.after)} g restantes</span>
                  {event.type === "consume" && (
                    <small>{money(event.cost)}</small>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
