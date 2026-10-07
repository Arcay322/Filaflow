import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Modal } from "./Modal";
import { OfflineScreen } from "./OfflineScreen";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
function subscribeConnection(next: () => void) {
  window.addEventListener("online", next);
  window.addEventListener("offline", next);
  return () => {
    window.removeEventListener("online", next);
    window.removeEventListener("offline", next);
  };
}
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaControls() {
  const online = useSyncExternalStore(
    subscribeConnection,
    () => navigator.onLine,
  );
  const [installed, setInstalled] = useState(isStandalone);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [help, setHelp] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Checking on focus also covers installed apps left open for several days.
      window.addEventListener("focus", () => {
        if (navigator.onLine) void registration.update().catch(() => {});
      });
    },
    onRegisterError() {
      setError(
        "No se pudo preparar la instalación. Vuelve a abrir FilaFlow con conexión.",
      );
    },
  });

  useEffect(() => {
    function available(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    }
    function installed() {
      setInstalled(true);
      setInstallPrompt(null);
      setHelp(false);
    }
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      setHelp(true);
      return;
    }
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {
      setInstallPrompt(null);
      setHelp(true);
    }
  }
  async function update() {
    setUpdating(true);
    setError("");
    try {
      await updateServiceWorker(true);
    } catch {
      setUpdating(false);
      setError(
        "No se pudo actualizar. Comprueba tu conexión y vuelve a intentarlo.",
      );
    }
  }

  return (
    <>
      <aside
        className="pwa-controls"
        aria-label="Aplicación FilaFlow"
        data-offline-ready={offlineReady}
        data-install-available={!!installPrompt}
      >
        {needRefresh && online && (
          <div className="pwa-update" role="status">
            <strong>Hay una nueva versión</strong>
            <p>Actualiza cuando termines de guardar tus cambios.</p>
            <div className="pwa-update-actions">
              <button
                className="button primary"
                onClick={() => setConfirmUpdate(true)}
              >
                <RefreshCw size={16} />
                Actualizar ahora
              </button>
              <button
                className="text-button"
                onClick={() => setNeedRefresh(false)}
              >
                Más tarde
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {!installed && online && (
          <button
            className="button secondary pwa-install"
            aria-label="Instalar FilaFlow"
            onClick={install}
          >
            <Download size={16} />
            Instalar app
          </button>
        )}
      </aside>
      {help && (
        <Modal title="Instalar FilaFlow" onClose={() => setHelp(false)}>
          <div className="form-body pwa-help">
            <p>
              Ten FilaFlow en tu pantalla de inicio y ábrelo como una
              aplicación.
            </p>
            <ul>
              <li>
                <strong>Android:</strong> abre esta web en Chrome y elige
                «Instalar aplicación» o «Añadir a pantalla de inicio» en el
                menú.
              </li>
              <li>
                <strong>iPhone o iPad:</strong> abre esta web en Safari, pulsa
                Compartir y elige «Añadir a pantalla de inicio».
              </li>
              <li>
                <strong>Computadora:</strong> abre esta web en Chrome o Edge y
                busca la opción de instalar en la barra de direcciones o el
                menú.
              </li>
            </ul>
            <p className="field-helper">
              Guardar bobinas y consumos requiere conexión a internet.
            </p>
            <footer className="modal-footer">
              <button className="button primary" onClick={() => setHelp(false)}>
                Entendido
              </button>
            </footer>
          </div>
        </Modal>
      )}
      {confirmUpdate && (
        <Modal
          title="Actualizar FilaFlow"
          busy={updating}
          onClose={() => setConfirmUpdate(false)}
        >
          <div className="form-body">
            <p>
              La aplicación se reiniciará. Los cambios que todavía no hayas
              guardado se perderán.
            </p>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <footer className="modal-footer">
              <button
                className="button secondary"
                disabled={updating}
                onClick={() => setConfirmUpdate(false)}
              >
                Volver
              </button>
              <button
                className="button primary"
                disabled={updating}
                onClick={update}
              >
                {updating ? "Actualizando…" : "Reiniciar y actualizar"}
              </button>
            </footer>
          </div>
        </Modal>
      )}
      <OfflineScreen online={online} />
    </>
  );
}
