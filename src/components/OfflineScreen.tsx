import { useEffect, useRef } from "react";
import { WifiOff } from "lucide-react";

export function OfflineScreen({ online }: { online: boolean }) {
  const offlineDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = offlineDialog.current;
    if (!dialog) return;
    if (!online && !dialog.open) dialog.showModal();
    if (online && dialog.open) dialog.close();
  }, [online]);
  return (
    <dialog
      className="offline-screen"
      ref={offlineDialog}
      aria-labelledby="offline-title"
      aria-describedby="offline-description"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="offline-content">
        <div className="brand">
          <img
            src="/brand/filaflow-logo-v1.png"
            alt="FilaFlow"
            width={2172}
            height={724}
          />
        </div>
        <WifiOff size={40} className="offline-icon" aria-hidden="true" />
        <h1 id="offline-title">Sin conexión a internet</h1>
        <p id="offline-description">
          Conéctate para consultar tu inventario y guardar bobinas o consumos.
        </p>
        <p className="offline-hint">
          Volverás automáticamente cuando se recupere la conexión. Si estabas
          llenando un formulario, sigue aquí mientras mantengas la aplicación
          abierta.
        </p>
      </div>
    </dialog>
  );
}
