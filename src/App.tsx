import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Download,
  Droplets,
  LoaderCircle,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { auth, db, usingEmulators } from "./lib/firebase";
import { inventoryRepository } from "./lib/repository";
import {
  grams,
  money,
  materials,
  materialCost,
  toCsv,
  type Spool,
} from "./lib/inventory";
import { friendlyError } from "./lib/errors";
import { AuthScreen } from "./components/AuthScreen";
import { Modal } from "./components/Modal";
import { SpoolForm } from "./components/SpoolForm";
import { SpoolGraphic } from "./components/SpoolGraphic";
import { WeightForm } from "./components/WeightForm";
import { HistoryPanel } from "./components/HistoryPanel";
import { SpoolCard } from "./components/SpoolCard";
import { Sidebar, type InventoryView } from "./components/Sidebar";

type Dialog =
  | { kind: "create" }
  | { kind: "edit" | "weight" | "history" | "archive"; spool: Spool }
  | null;
type View = InventoryView;

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [spools, setSpools] = useState<Spool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("inventory");
  const [search, setSearch] = useState("");
  const [material, setMaterial] = useState("all");
  const [sort, setSort] = useState("newest");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState("");
  const [busyArchive, setBusyArchive] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const repo = useMemo(
    () => (user ? inventoryRepository(db, user.uid) : null),
    [user],
  );

  useEffect(
    () =>
      onAuthStateChanged(
        auth,
        (next) => {
          setSpools([]);
          setLoading(true);
          setError("");
          setDialog(null);
          setUser(next);
          setAuthReady(true);
        },
        () => {
          setAuthReady(true);
          setError("No se pudo recuperar la sesión.");
        },
      ),
    [],
  );
  useEffect(() => {
    if (!repo) return;
    return repo.watchSpools(
      (next) => {
        setSpools(next);
        setLoading(false);
        setError("");
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      },
    );
  }, [repo]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!authReady)
    return (
      <div className="app-loading">
        <LoaderCircle className="spin" />
        <p>Abriendo FilaFlow…</p>
      </div>
    );
  if (!user || !repo) return <AuthScreen />;
  const active = spools.filter((s) => !s.archived);
  const low = active.filter((s) => s.remainingWeight <= s.lowStockThreshold);
  const totalWeight = active.reduce((sum, s) => sum + s.remainingWeight, 0);
  const value = active.reduce(
    (sum, s) => sum + materialCost(s, s.remainingWeight),
    0,
  );
  const colors = new Set(active.map((s) => s.colorHex.toLowerCase())).size;
  const visible = spools
    .filter((s) =>
      view === "archived"
        ? s.archived
        : !s.archived &&
          (view !== "low" || s.remainingWeight <= s.lowStockThreshold),
    )
    .filter((s) => material === "all" || s.material === material)
    .filter((s) =>
      `${s.name} ${s.colorName} ${s.brand} ${s.material} ${s.location}`
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "es")
        : sort === "weight"
          ? a.remainingWeight - b.remainingWeight
          : (b.createdAt || 0) - (a.createdAt || 0),
    );
  const heading =
    view === "low"
      ? "Por reponer"
      : view === "archived"
        ? "Bobinas archivadas"
        : "Tus filamentos";
  function finished(message: string) {
    setDialog(null);
    setToast(message);
  }
  function navigate(next: View) {
    setView(next);
    setSearch("");
    setMaterial("all");
  }
  function exportCsv() {
    const link = document.createElement("a");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + toCsv(spools)], { type: "text/csv;charset=utf-8;" }),
    );
    link.href = url;
    link.download = "filaflow-inventario.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Inventario exportado.");
  }
  async function archive(spool: Spool) {
    if (!repo) return;
    setBusyArchive(true);
    setArchiveError("");
    try {
      await repo.archive(spool.id, !spool.archived);
      finished(spool.archived ? "Bobina restaurada." : "Bobina archivada.");
    } catch (err) {
      setArchiveError(friendlyError(err));
    } finally {
      setBusyArchive(false);
    }
  }
  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        counts={{
          inventory: active.length,
          low: low.length,
          archived: spools.length - active.length,
        }}
        email={user.email}
        navigate={navigate}
        onSignOut={() =>
          signOut(auth).catch((err) => setToast(friendlyError(err)))
        }
      />
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Mi espacio
            <ChevronRight size={14} />
            <strong>{view === "inventory" ? "Inventario" : heading}</strong>
          </div>
          <span className="private-badge">
            <span />
            Inventario privado
          </span>
        </header>
        <div className="workspace-content">
          {usingEmulators && (
            <div className="emulator-banner">
              Prueba local · Estos datos están en los emuladores, no en tu
              proyecto real.
            </div>
          )}
          <section className="page-heading">
            <div>
              <span className="eyebrow">
                Material listo para tu próxima idea
              </span>
              <h1>
                {heading}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {view === "low"
                  ? "Los colores que necesitan una nueva bobina."
                  : view === "archived"
                    ? "Conserva el historial y restaura una bobina cuando la necesites."
                    : "Organiza tus bobinas y conoce cuánto queda en cada una."}
              </p>
            </div>
            <button
              className="button primary"
              onClick={() => setDialog({ kind: "create" })}
            >
              <Plus size={18} />
              Nueva bobina
            </button>
          </section>
          <section
            className="summary-strip"
            aria-label="Resumen del inventario activo"
          >
            <div>
              <span>Filamento disponible</span>
              <strong>
                {grams(totalWeight / 1000)}
                <small> kg</small>
              </strong>
            </div>
            <div>
              <span>Bobinas activas</span>
              <strong>
                {active.length}
                <small> bobinas</small>
              </strong>
            </div>
            <div>
              <span>Tu paleta</span>
              <strong>
                {colors}
                <small> colores</small>
              </strong>
            </div>
            <div>
              <span>Valor del material restante</span>
              <strong className="summary-money">{money(value)}</strong>
            </div>
          </section>
          {low.length > 0 && view === "inventory" && (
            <button
              className="low-stock-banner"
              onClick={() => navigate("low")}
            >
              <TriangleAlert size={18} />
              <span>
                <strong>
                  {low.length === 1
                    ? "Una bobina tiene"
                    : `${low.length} bobinas tienen`}{" "}
                  poco filamento.
                </strong>{" "}
                Revisa qué colores necesitas reponer.
              </span>
              <ArrowUpRight size={18} />
            </button>
          )}
          <section className="inventory-section" aria-label="Lista de bobinas">
            <div className="inventory-toolbar">
              <label className="search-field">
                <Search size={18} />
                <input
                  aria-label="Buscar bobinas"
                  placeholder="Buscar nombre, color o marca…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="icon-button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setSearch("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <div className="toolbar-controls">
                <select
                  aria-label="Filtrar por material"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                >
                  <option value="all">Todos los materiales</option>
                  {materials.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <select
                  aria-label="Ordenar bobinas"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="newest">Más recientes</option>
                  <option value="name">Nombre A–Z</option>
                  <option value="weight">Menor cantidad</option>
                </select>
                <button
                  className="button secondary export-button"
                  disabled={spools.length === 0}
                  onClick={exportCsv}
                >
                  <Download size={17} />
                  <span>Exportar</span>
                </button>
              </div>
            </div>
            <div className="list-caption">
              <span>
                {loading
                  ? "Cargando tu inventario…"
                  : `${visible.length} ${visible.length === 1 ? "bobina" : "bobinas"}`}
              </span>
              <span>Cantidades en gramos</span>
            </div>
            {error && (
              <p className="error-message inventory-error" role="alert">
                {error}
              </p>
            )}
            {loading ? (
              <div className="inventory-loading">
                <LoaderCircle className="spin" size={26} />
                <p>Cargando bobinas…</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="empty-state">
                <SpoolGraphic color="#a4bbdc" />
                <h2>
                  {search || material !== "all"
                    ? "No encontramos esas bobinas."
                    : view === "low"
                      ? "Tus materiales tienen buen stock."
                      : view === "archived"
                        ? "Todavía no hay bobinas archivadas."
                        : "Todo empieza con una bobina."}
                </h2>
                <p>
                  {search || material !== "all"
                    ? "Prueba con otro nombre o cambia el filtro."
                    : view === "inventory"
                      ? "Añade el material, el color y los gramos disponibles de tu primera bobina."
                      : view === "low"
                        ? "Aquí aparecerán las que alcancen el límite que hayas definido."
                        : "Al archivar una bobina, su historial se conserva aquí."}
                </p>
                {view === "inventory" && !search && material === "all" && (
                  <button
                    className="button primary"
                    onClick={() => setDialog({ kind: "create" })}
                  >
                    <Plus size={17} />
                    Añadir mi primera bobina
                  </button>
                )}
              </div>
            ) : (
              <div className="spool-grid">
                {visible.map((spool) => (
                  <SpoolCard
                    key={spool.id}
                    spool={spool}
                    onAction={(kind, spool) => {
                      setArchiveError("");
                      setDialog({ kind, spool });
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          <footer className="workspace-footer">
            <span>
              <Droplets size={14} />
              Cada cambio de peso queda en el historial.
            </span>
            <span>FilaFlow · v0.1</span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Cerrar aviso"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {dialog?.kind === "create" && (
        <SpoolForm
          onClose={() => setDialog(null)}
          onSave={async (input) => {
            await repo.create(input);
            finished("Bobina guardada.");
          }}
        />
      )}
      {dialog?.kind === "edit" && (
        <SpoolForm
          spool={dialog.spool}
          onClose={() => setDialog(null)}
          onSave={async (input) => {
            await repo.edit(dialog.spool.id, input);
            finished("Bobina actualizada.");
          }}
        />
      )}
      {dialog?.kind === "weight" && (
        <WeightForm
          spool={dialog.spool}
          onClose={() => setDialog(null)}
          onSave={async (input, note) => {
            await repo.change(dialog.spool.id, input, note);
            finished(
              input.type === "consume"
                ? "Consumo guardado."
                : "Peso corregido.",
            );
          }}
        />
      )}
      {dialog?.kind === "history" && (
        <HistoryPanel
          spool={dialog.spool}
          repo={repo}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "archive" && (
        <Modal
          title={dialog.spool.archived ? "Restaurar bobina" : "Archivar bobina"}
          busy={busyArchive}
          onClose={() => setDialog(null)}
        >
          <div className="form-body">
            <p className="archive-copy">
              {dialog.spool.archived
                ? `«${dialog.spool.name}» volverá a tu inventario activo.`
                : `«${dialog.spool.name}» pasará a Archivadas. Su historial se conserva y puedes restaurarla cuando quieras.`}
            </p>
            {archiveError && (
              <p className="error-message" role="alert">
                {archiveError}
              </p>
            )}
            <footer className="modal-footer">
              <button
                className="button secondary"
                disabled={busyArchive}
                onClick={() => setDialog(null)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={busyArchive}
                onClick={() => archive(dialog.spool)}
              >
                {busyArchive
                  ? "Guardando…"
                  : dialog.spool.archived
                    ? "Restaurar bobina"
                    : "Archivar bobina"}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </div>
  );
}
