// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpoolForm } from "../src/components/SpoolForm";
import type { Spool } from "../src/lib/inventory";

// jsdom has no native dialog lifecycle; keep the real form and inputs mounted.
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() { this.setAttribute("open", ""); } },
    close: { configurable: true, value() { this.removeAttribute("open"); } },
  });
});
afterEach(cleanup);

const numericLabels = [
  "Peso inicial de filamento (g)",
  "Cantidad restante (g)",
  "Precio de la bobina (S/)",
  "Avisar cuando queden (g)",
  "Peso de bobina vacía (g)",
];

describe("edición de cantidades en el formulario de bobina", () => {
  it.each(numericLabels)("permite borrar y reemplazar %s", (label) => {
    render(<SpoolForm onSave={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByLabelText(label, { exact: false }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "25" } });
    expect(input.value).toBe("25");
  });

  it("impide guardar un precio vacío sin tratarlo como cero", () => {
    const save = vi.fn();
    render(<SpoolForm onSave={save} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nombre de la bobina"), {
      target: { value: "PLA azul" },
    });
    fireEvent.change(screen.getByLabelText("Precio de la bobina (S/)"), {
      target: { value: "" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar bobina" }).closest("form")!);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/numéricos/i);
  });

  it("guarda números, ceros y decimales después de reescribirlos", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<SpoolForm onSave={save} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nombre de la bobina"), {
      target: { value: "PLA azul" },
    });
    const price = screen.getByLabelText("Precio de la bobina (S/)");
    fireEvent.change(price, { target: { value: "" } });
    fireEvent.change(price, { target: { value: "65.50" } });
    fireEvent.change(screen.getByLabelText("Cantidad restante (g)"), {
      target: { value: "720.125" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar bobina" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({
      initialWeight: 1000,
      remainingWeight: 720.125,
      purchasePrice: 65.5,
      tareWeight: 0,
      lowStockThreshold: 100,
    });
  });

  it("permite reescribir una bobina existente conservando su saldo", async () => {
    const spool: Spool = {
      id: "existing", name: "PLA azul", brand: "Flashforge", material: "PLA",
      colorName: "Azul", colorHex: "#2457d6", initialWeight: 1000,
      remainingWeight: 350.125, tareWeight: 220, purchasePrice: 65,
      lowStockThreshold: 100, location: "Estante A", notes: "", archived: false,
    };
    const save = vi.fn().mockResolvedValue(undefined);
    render(<SpoolForm spool={spool} onSave={save} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Peso de bobina vacía (g)", { exact: false }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "215.5" } });
    expect((screen.getByLabelText("Cantidad restante (g)") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Guardar bobina" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ remainingWeight: 350.125, tareWeight: 215.5 });
  });
});
