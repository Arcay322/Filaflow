import { useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";
import { ArrowRight, CircleCheck, Layers3, LockKeyhole } from "lucide-react";
import { auth, db, usingEmulators } from "../lib/firebase";
import { inventoryRepository } from "../lib/repository";
import { friendlyError } from "../lib/errors";
import { SpoolGraphic } from "./SpoolGraphic";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function switchMode(next: typeof mode) {
    setMode(next);
    setError("");
    setMessage("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup")
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      else if (mode === "login")
        await signInWithEmailAndPassword(auth, email.trim(), password);
      else {
        await sendPasswordResetEmail(auth, email.trim());
        setMessage(
          "Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso.",
        );
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    setBusy(true);
    setError("");
    try {
      const { user } = await signInAnonymously(auth);
      const repo = inventoryRepository(db, user.uid);
      const base = {
        brand: "Flashforge",
        material: "PLA" as const,
        initialWeight: 1000,
        tareWeight: 220,
        purchasePrice: 65,
        lowStockThreshold: 100,
        notes: "Bobina de ejemplo para pruebas locales.",
        archived: false,
      };
      await Promise.all([
        repo.create({
          ...base,
          name: "PLA azul",
          colorName: "Azul",
          colorHex: "#2457d6",
          remainingWeight: 720,
          location: "IFS · canal 1",
        }),
        repo.create({
          ...base,
          name: "PLA amarillo",
          colorName: "Amarillo",
          colorHex: "#edbe39",
          remainingWeight: 85,
          location: "IFS · canal 2",
        }),
        repo.create({
          ...base,
          name: "PLA coral",
          colorName: "Coral",
          colorHex: "#df6065",
          remainingWeight: 460,
          location: "Estante A",
        }),
        repo.create({
          ...base,
          name: "PETG verde",
          material: "PETG",
          colorName: "Verde",
          colorHex: "#3ba690",
          remainingWeight: 1000,
          location: "Estante A",
        }),
      ]);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <a className="brand" href="/" aria-label="FilaFlow, inicio">
          <span className="brand-mark">
            <Layers3 size={24} />
          </span>
          Fila<span>Flow</span>
        </a>
        <div className="auth-intro">
          <span className="eyebrow">Tu mesa de impresión, en orden</span>
          <h1>
            Cada color.
            <br />
            Cada bobina.
            <br />
            <span>Cada gramo.</span>
          </h1>
          <p>
            Ten a mano lo que tienes y lo que queda. Un inventario simple para
            seguir creando.
          </p>
        </div>
        <div className="auth-spools" aria-hidden="true">
          <SpoolGraphic color="#2457d6" />
          <SpoolGraphic color="#df6065" />
          <SpoolGraphic color="#edbe39" />
        </div>
        <p className="auth-caption">
          <CircleCheck size={17} />
          Menos cálculos sueltos. Más tiempo para imprimir.
        </p>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">Tu inventario de filamentos</span>
          <h2>
            {mode === "login"
              ? "Qué bueno verte."
              : mode === "signup"
                ? "Empieza con tu primera bobina."
                : "Recupera tu acceso."}
          </h2>
          <p>
            {mode === "login"
              ? "Entra para consultar y actualizar tus materiales."
              : mode === "signup"
                ? "Crea una cuenta gratuita para guardar tu inventario."
                : "Te enviaremos un enlace por correo."}
          </p>
          <form onSubmit={submit} className="auth-form">
            <label>
              Correo electrónico
              <input
                autoFocus
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {mode !== "reset" && (
              <label>
                Contraseña
                <input
                  type="password"
                  required
                  minLength={mode === "signup" ? 8 : 1}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  placeholder={
                    mode === "signup"
                      ? "Al menos 8 caracteres"
                      : "Tu contraseña"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            {mode === "login" && (
              <button
                type="button"
                className="text-button password-reset"
                onClick={() => switchMode("reset")}
              >
                Olvidé mi contraseña
              </button>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="success-message" role="status">
                {message}
              </p>
            )}
            <button className="button primary auth-submit" disabled={busy}>
              {busy
                ? "Un momento…"
                : mode === "login"
                  ? "Entrar a mi inventario"
                  : mode === "signup"
                    ? "Crear cuenta gratis"
                    : "Enviar enlace"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {mode === "login" ? "¿Primera vez aquí?" : "¿Ya tienes una cuenta?"}{" "}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </p>
          <p className="privacy-note">
            <LockKeyhole size={15} />
            Tu inventario es privado y está vinculado a tu cuenta.
          </p>
          {usingEmulators && (
            <button
              className="button secondary demo-button"
              onClick={demo}
              disabled={busy}
            >
              Abrir demo local con bobinas de ejemplo
            </button>
          )}
        </div>
        <span className="auth-footer">
          FilaFlow · Hecho para quienes imprimen
        </span>
      </section>
    </main>
  );
}
