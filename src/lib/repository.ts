import {
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  limit,
  type Firestore,
  type DocumentData,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import {
  spoolSchema,
  changeWeight,
  type SpoolInput,
  type Spool,
  type WeightChange,
  type Movement,
} from "./inventory";

export function readSpool(id: string, data: DocumentData): Spool {
  const input = Object.fromEntries(
    Object.keys(spoolSchema.shape).map((key) => [key, data[key]]),
  );
  return {
    ...spoolSchema.parse(input),
    id,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : undefined,
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : undefined,
    lastMovementId: data.lastMovementId,
  };
}

function requireConnection() {
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    throw new Error("Necesitas conexión a internet para guardar los cambios.");
}

export function inventoryRepository(db: Firestore, uid: string) {
  const root = collection(db, "users", uid, "spools");
  return {
    watchSpools(next: (spools: Spool[]) => void, error: (err: Error) => void) {
      return onSnapshot(
        query(root, orderBy("createdAt", "desc")),
        (snapshot) => {
          try {
            next(snapshot.docs.map((d) => readSpool(d.id, d.data())));
          } catch {
            error(new Error("No se pudieron leer algunas bobinas."));
          }
        },
        error,
      );
    },
    async create(input: SpoolInput) {
      requireConnection();
      const ref = doc(root);
      const data = spoolSchema.parse(input);
      // A transaction cannot enqueue an offline write, including if connectivity
      // drops after the initial check. Keep the form open until the server confirms.
      await runTransaction(db, async (tx) => {
        tx.set(ref, {
          ...data,
          lastMovementId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      return ref;
    },
    async edit(id: string, input: SpoolInput) {
      requireConnection();
      await runTransaction(db, async (tx) => {
        const ref = doc(root, id);
        const snapshot = await tx.get(ref);
        if (!snapshot.exists())
          throw new Error("La bobina ya no está disponible.");
        const current = readSpool(id, snapshot.data());
        const metadata = spoolSchema.parse({
          ...input,
          remainingWeight: current.remainingWeight,
          archived: current.archived,
        });
        tx.update(ref, { ...metadata, updatedAt: serverTimestamp() });
      });
    },
    async archive(id: string, archived: boolean) {
      requireConnection();
      await runTransaction(db, async (tx) => {
        const ref = doc(root, id);
        if (!(await tx.get(ref)).exists())
          throw new Error("La bobina ya no está disponible.");
        tx.update(ref, { archived, updatedAt: serverTimestamp() });
      });
    },
    async change(id: string, input: WeightChange, note: string) {
      requireConnection();
      if (note.length > 200)
        throw new Error("La nota admite hasta 200 caracteres.");
      const ref = doc(root, id);
      // Create the ID once; retries must not produce multiple history entries.
      const event = doc(collection(ref, "movements"));
      for (let attempt = 0; attempt < 3; attempt++) {
        const observed: { read: boolean; movementId?: string | null } = {
          read: false,
        };
        try {
          await runTransaction(db, async (tx) => {
            const snapshot = await tx.get(ref);
            if (!snapshot.exists())
              throw new Error("La bobina ya no está disponible.");
            const current = readSpool(id, snapshot.data());
            observed.read = true;
            observed.movementId = current.lastMovementId;
            if (current.archived)
              throw new Error("Restaura la bobina antes de registrar consumo.");
            const result = changeWeight(current, input);
            tx.update(ref, {
              remainingWeight: result.after,
              lastMovementId: event.id,
              updatedAt: serverTimestamp(),
            });
            tx.set(event, {
              ...result,
              type: input.type,
              note: note.trim(),
              createdAt: serverTimestamp(),
            });
          });
          return;
        } catch (err) {
          // Rules can reject a stale balance before the transaction conflict is reported.
          // Retry only when a server read proves another movement changed that balance.
          if (
            attempt === 2 ||
            !observed.read ||
            !(err instanceof FirebaseError) ||
            err.code !== "permission-denied"
          )
            throw err;
          const latest = await getDocFromServer(ref);
          if (
            !latest.exists() ||
            latest.data().lastMovementId === observed.movementId
          )
            throw err;
        }
      }
    },
    watchHistory(
      id: string,
      next: (history: Movement[]) => void,
      error: (err: Error) => void,
    ) {
      return onSnapshot(
        query(
          collection(doc(root, id), "movements"),
          orderBy("createdAt", "desc"),
          limit(50),
        ),
        (snapshot) => {
          next(
            snapshot.docs.map(
              (d) =>
                ({
                  ...d.data(),
                  id: d.id,
                  createdAt:
                    d.data().createdAt instanceof Timestamp
                      ? d.data().createdAt.toMillis()
                      : Date.now(),
                }) as Movement,
            ),
          );
        },
        error,
      );
    },
  };
}
