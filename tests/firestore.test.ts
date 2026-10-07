import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  deleteDoc,
  type Firestore,
} from "firebase/firestore";
import { inventoryRepository } from "../src/lib/repository";
import { readSpool } from "../src/lib/repository";
import { spoolSchema } from "../src/lib/inventory";

let env: RulesTestEnvironment;
const input = {
  name: "Azul",
  brand: "Flashforge",
  material: "PLA",
  colorName: "Azul",
  colorHex: "#2557d6",
  initialWeight: 1000,
  remainingWeight: 350,
  tareWeight: 220,
  purchasePrice: 65,
  lowStockThreshold: 100,
  location: "Estante A",
  notes: "",
  archived: false,
  lastMovementId: null,
};
const path = "users/alice/spools/blue";
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-filaflow",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
}, 30000);
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), {
      ...input,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
});
afterAll(async () => {
  await env?.cleanup();
});

describe("reglas de inventario", () => {
  it("permite leer y crear bobinas propias", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(
      setDoc(doc(db, "users/alice/spools/new"), {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("bloquea lecturas y escrituras entre cuentas", async () => {
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, path)));
    await assertFails(
      updateDoc(doc(db, path), { name: "Ajena", updatedAt: serverTimestamp() }),
    );
  });
  it("bloquea visitantes sin sesión", async () => {
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), path)),
    );
  });
  it("rechaza saldo negativo, campos extra y capacidad inválida", async () => {
    const db = env.authenticatedContext("alice").firestore();
    for (const changes of [
      { remainingWeight: -1 },
      { remainingWeight: 1001 },
      { initialWeight: 0 },
      { admin: true },
      { colorHex: "red" },
    ]) {
      await assertFails(
        setDoc(doc(db, "users/alice/spools/invalid"), {
          ...input,
          ...changes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    }
  });
  it("permite editar datos y archivar sin borrar el historial", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(
      updateDoc(doc(db, path), {
        name: "Azul nuevo",
        archived: true,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(deleteDoc(doc(db, path)));
  });
  it("rechaza cambios de peso que no incluyen un movimiento", async () => {
    await assertFails(
      updateDoc(doc(env.authenticatedContext("alice").firestore(), path), {
        remainingWeight: 300,
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("registra saldo e historial juntos", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, path), {
      remainingWeight: 300,
      lastMovementId: "m1",
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, `${path}/movements/m1`), {
      type: "consume",
      before: 350,
      after: 300,
      delta: -50,
      cost: 3.25,
      note: "Tanda de llaveros",
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
    expect((await getDoc(doc(db, path))).data()?.remainingWeight).toBe(300);
  });
  it("rechaza historial huérfano o con cantidades inconsistentes", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, `${path}/movements/orphan`), {
        type: "consume",
        before: 350,
        after: 300,
        delta: -50,
        cost: 3.25,
        note: "",
        createdAt: serverTimestamp(),
      }),
    );
    const batch = writeBatch(db);
    batch.update(doc(db, path), {
      remainingWeight: 300,
      lastMovementId: "bad",
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, `${path}/movements/bad`), {
      type: "consume",
      before: 350,
      after: 290,
      delta: -50,
      cost: 3.25,
      note: "",
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  });
  it("permite corregir el saldo mediante pesaje, dejando constancia", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, path), {
      remainingWeight: 400,
      lastMovementId: "weigh",
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, `${path}/movements/weigh`), {
      type: "adjust",
      before: 350,
      after: 400,
      delta: 50,
      cost: 0,
      note: "Pesaje real",
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });
  it("conserva los movimientos anteriores y bloquea su modificación", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${path}/movements/old`), {
        type: "consume",
        before: 400,
        after: 350,
        delta: -50,
        cost: 3.25,
        note: "",
        createdAt: Timestamp.now(),
      });
    });
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      updateDoc(doc(db, `${path}/movements/old`), { note: "Reescrito" }),
    );
    await assertFails(deleteDoc(doc(db, `${path}/movements/old`)));
    await assertFails(
      updateDoc(doc(db, path), {
        remainingWeight: 300,
        lastMovementId: "old",
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("acumula dos consumos simultáneos sin perder saldo ni duplicar movimientos", async () => {
    const db = env
      .authenticatedContext("alice")
      .firestore() as unknown as Firestore;
    const repo = inventoryRepository(db, "alice");
    await Promise.all([
      repo.change("blue", { type: "consume", grams: 30 }, "Primera tanda"),
      repo.change("blue", { type: "consume", grams: 20 }, "Segunda tanda"),
    ]);
    expect((await getDoc(doc(db, path))).data()?.remainingWeight).toBe(300);
    const events = (
      await getDocs(collection(db, `${path}/movements`))
    ).docs.map((d) => d.data());
    expect(events).toHaveLength(2);
    expect(events.reduce((sum, m) => sum + m.delta, 0)).toBe(-50);
  });
  it("impide consumir de más y conserva el último saldo al editar un formulario antiguo", async () => {
    const db = env
      .authenticatedContext("alice")
      .firestore() as unknown as Firestore;
    const repo = inventoryRepository(db, "alice");
    const old = readSpool("blue", (await getDoc(doc(db, path))).data()!);
    await repo.change("blue", { type: "consume", grams: 300 }, "");
    await expect(
      repo.change("blue", { type: "consume", grams: 60 }, ""),
    ).rejects.toThrow("No hay suficiente");
    await repo.edit("blue", {
      ...spoolSchema.parse(
        Object.fromEntries(
          Object.keys(spoolSchema.shape).map((k) => [
            k,
            old[k as keyof typeof old],
          ]),
        ),
      ),
      name: "Nombre editado",
    });
    const current = (await getDoc(doc(db, path))).data()!;
    expect(current.remainingWeight).toBe(50);
    expect(current.name).toBe("Nombre editado");
    expect((await getDocs(collection(db, `${path}/movements`))).size).toBe(1);
  });
  it("rechaza movimientos sobre una bobina archivada, incluso fuera de la interfaz", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await updateDoc(doc(db, path), {
      archived: true,
      updatedAt: serverTimestamp(),
    });
    const batch = writeBatch(db);
    batch.update(doc(db, path), {
      remainingWeight: 300,
      lastMovementId: "archived",
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, `${path}/movements/archived`), {
      type: "consume",
      before: 350,
      after: 300,
      delta: -50,
      cost: 3.25,
      note: "",
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  });
});
