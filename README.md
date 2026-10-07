# FilaFlow

Inventario personal de filamentos para impresión 3D. React, TypeScript, Vite y Firebase. Interfaz en español y precios en soles peruanos.

## Qué puedes hacer

- Crear una cuenta, iniciar sesión y recuperar el acceso por correo.
- Registrar cada bobina: material, marca, nombre y muestra de color, capacidad, cantidad restante, precio, tara y ubicación.
- Descontar consumos de piezas, soportes, purgas y fallos.
- Corregir la cantidad mediante pesaje, descontando la bobina vacía si corresponde.
- Consultar los últimos 50 movimientos por bobina, con fecha, nota y costo histórico del consumo.
- Buscar, filtrar, ordenar, consultar avisos de poco filamento y exportar el inventario a CSV.
- Archivar y restaurar bobinas conservando su historial.

Cada cuenta tiene su propio inventario. Esta primera versión es gratuita; no incluye pagos ni funciones premium.

## Desarrollo local

Requisitos: Node.js 24 LTS o superior, npm y Java 21 para los emuladores.

```sh
npm ci
npm run emulators
```

En otra terminal:

```sh
VITE_USE_EMULATORS=true npm run dev
```

Abre `http://localhost:5173`. El botón de demo solo aparece en desarrollo cuando los emuladores están habilitados. Genera datos ficticios en `demo-filaflow`, separados del proyecto real. Los emuladores no conservan datos tras cerrarlos salvo que configures importación y exportación explícitamente.

Para usar Firebase real, ejecuta `npm run dev` sin esa variable. Los identificadores públicos del proyecto ya están configurados en `src/lib/firebase.ts`; `.env.example` muestra cómo cambiarlos para otro proyecto. No introduzcas credenciales de administrador o claves de cuentas de servicio en variables `VITE_*`.

## Validación

```sh
npm test
npm run test:rules
npm run lint
npm run build
```

Las pruebas cubren cálculos, pesos inválidos, exportación segura, aislamiento entre cuentas, movimientos atómicos, sobreconsumo, edición con saldo actualizado y consumos simultáneos. `test:rules` inicia y apaga su propio emulador de Firestore; detén cualquier emulador que ocupe el puerto 8080 antes de ejecutarlo.

## Publicar

Proyecto: `filaflow-a856b`. Hosting sirve los archivos estáticos de `dist`, Authentication usa correo y contraseña, y Firestore Standard usa la base `(default)` en `southamerica-west1` (Santiago).

```sh
npx firebase login
npm run deploy
```

La base debe existir en la región elegida **antes** de desplegar. La CLI puede crear automáticamente una base en otra región si falta. Para un proyecto nuevo, habilita Firestore desde la consola y elige explícitamente su ubicación. No uses reglas abiertas de modo de prueba.

## Datos y protección

Ruta de bobinas: `users/{uid}/spools/{spoolId}`; movimientos: `movements/{movementId}` bajo cada bobina. Las reglas solo permiten acceso al propietario y validan todos los campos. El saldo y su movimiento se guardan juntos mediante una transacción. El historial no se puede modificar ni eliminar desde el cliente, y las bobinas se archivan en lugar de borrarse.

La sesión dura la sesión del navegador. Las transacciones necesitan conexión; no hay cola de consumos offline. Las cantidades admiten tres decimales; las tarjetas muestran un decimal. Cambiar el precio de una bobina modifica el costo estimado de consumos futuros, mientras que el costo guardado de movimientos anteriores se conserva. El CSV exporta el inventario, incluidas las bobinas archivadas, pero no el historial.

## Alcance y costos

El proyecto mantiene el plan Spark. Las cuotas gratuitas se comparten entre todos sus usuarios; revisa el uso en la consola de Firebase al crecer. No se usan Functions, Cloud Storage ni Analytics. El inventario se sincroniza completo por cuenta, adecuado para la primera versión; antes de admitir inventarios muy grandes conviene añadir paginación y límites de lectura.

`npm audit --omit=dev` no reportó vulnerabilidades al validar esta versión. La CLI de Firebase tiene avisos transitivos de desarrollo en `braces`, `uuid` y OpenTelemetry; no forman parte de los archivos publicados. Se usan únicamente configuraciones y patrones locales de confianza. Evita ejecutar emuladores en una interfaz pública y revisa actualizaciones de la CLI antes de ampliar su uso.

Documentación: [Firebase Auth](https://firebase.google.com/docs/auth/web/password-auth), [transacciones](https://firebase.google.com/docs/firestore/manage-data/transactions), [reglas](https://firebase.google.com/docs/firestore/security/rules-conditions), [cuotas](https://firebase.google.com/docs/firestore/pricing).
