// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { inventoryRepository } from "../src/lib/repository";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { PwaControls } from "../src/components/PwaControls";

const sw = vi.hoisted(() => ({ update: vi.fn(), refresh: false }));
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    offlineReady: [true, vi.fn()],
    needRefresh: [sw.refresh, vi.fn()],
    updateServiceWorker: sw.update,
  }),
}));
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value() {
        this.removeAttribute("open");
      },
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sw.refresh = false;
  sw.update.mockReset();
});

function connection(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  fireEvent(window, new Event(online ? "online" : "offline"));
}

describe("PWA y conectividad", () => {
  it("conserva el formulario al perder y recuperar conexión", async () => {
    render(
      <>
        <input aria-label="Borrador" defaultValue="PLA azul" />
        <PwaControls />
      </>,
    );
    connection(false);
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "Sin conexión a internet" }),
      ).toBeTruthy(),
    );
    expect((screen.getByLabelText("Borrador") as HTMLInputElement).value).toBe(
      "PLA azul",
    );
    connection(true);
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Sin conexión a internet" }),
      ).toBeNull(),
    );
    expect((screen.getByLabelText("Borrador") as HTMLInputElement).value).toBe(
      "PLA azul",
    );
  });

  it("explica la instalación cuando el navegador no ofrece un diálogo nativo", () => {
    render(<PwaControls />);
    fireEvent.click(screen.getByRole("button", { name: "Instalar FilaFlow" }));
    expect(
      screen.getByRole("dialog", { name: "Instalar FilaFlow" }).textContent,
    ).toContain("Safari");
  });

  it("usa la instalación nativa cuando está disponible y oculta el botón al instalar", async () => {
    render(<PwaControls />);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    fireEvent(window, event);
    fireEvent.click(screen.getByRole("button", { name: "Instalar FilaFlow" }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    fireEvent(window, new Event("appinstalled"));
    expect(
      screen.queryByRole("button", { name: "Instalar FilaFlow" }),
    ).toBeNull();
  });

  it("no recarga automáticamente al detectar una actualización", () => {
    sw.refresh = true;
    render(<PwaControls />);
    expect(screen.getByText("Hay una nueva versión")).toBeTruthy();
    expect(sw.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar ahora" }));
    expect(sw.update).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Reiniciar y actualizar" }),
    );
    expect(sw.update).toHaveBeenCalledOnce();
  });

  it("rechaza todas las escrituras sin conexión antes de contactar Firestore", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const repo = inventoryRepository(
      getFirestore(initializeApp({ projectId: "demo-filaflow" }, "pwa-test")),
      "local-test",
    );
    await expect(repo.create({} as never)).rejects.toThrow(/conexión/);
    await expect(repo.edit("id", {} as never)).rejects.toThrow(/conexión/);
    await expect(repo.archive("id", true)).rejects.toThrow(/conexión/);
    await expect(repo.change("id", {} as never, "")).rejects.toThrow(
      /conexión/,
    );
  });
});
