import { Archive, Boxes, LogOut, TriangleAlert } from "lucide-react";
import { SpoolGraphic } from "./SpoolGraphic";
import { Brand } from "./Brand";

export type InventoryView = "inventory" | "low" | "archived";
export function Sidebar({
  view,
  counts,
  email,
  navigate,
  onSignOut,
}: {
  view: InventoryView;
  counts: Record<InventoryView, number>;
  email: string | null;
  navigate: (view: InventoryView) => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="sidebar">
      <Brand />
      <span className="workspace-label">Tu espacio de impresión</span>
      <nav aria-label="Inventario">
        <button
          aria-current={view === "inventory" ? "page" : undefined}
          onClick={() => navigate("inventory")}
        >
          <Boxes size={19} />
          Inventario<span>{counts.inventory}</span>
        </button>
        <button
          aria-current={view === "low" ? "page" : undefined}
          onClick={() => navigate("low")}
        >
          <TriangleAlert size={19} />
          Por reponer
          <span className={counts.low ? "warning-count" : ""}>
            {counts.low}
          </span>
        </button>
        <button
          aria-current={view === "archived" ? "page" : undefined}
          onClick={() => navigate("archived")}
        >
          <Archive size={19} />
          Archivadas<span>{counts.archived}</span>
        </button>
      </nav>
      <div className="sidebar-note">
        <span className="mini-coil">
          <SpoolGraphic color="#91b5ed" small />
        </span>
        <strong>Un inventario al día.</strong>
        <p>Registra cada tanda y corrige el peso cuando uses la balanza.</p>
      </div>
      <div className="profile">
        <span className="avatar">
          {email?.slice(0, 1).toUpperCase() || "F"}
        </span>
        <div>
          <strong>Mi cuenta</strong>
          <span>{email || "Demo local"}</span>
        </div>
        <button
          className="icon-button"
          aria-label="Cerrar sesión"
          onClick={() => onSignOut()}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
