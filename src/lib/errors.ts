import { FirebaseError } from "firebase/app";

export function friendlyError(error: unknown): string {
  if (error instanceof FirebaseError) {
    const messages: Record<string, string> = {
      "auth/invalid-credential": "El correo o la contraseña no son correctos.",
      "auth/email-already-in-use":
        "Ya existe una cuenta con ese correo. Inicia sesión.",
      "auth/invalid-email": "Introduce un correo válido.",
      "auth/weak-password": "Usa una contraseña de al menos 8 caracteres.",
      "auth/password-does-not-meet-requirements":
        "La contraseña no cumple los requisitos de seguridad.",
      "auth/too-many-requests":
        "Hubo demasiados intentos. Inténtalo de nuevo más tarde.",
      "auth/network-request-failed": "Revisa tu conexión e inténtalo de nuevo.",
      "auth/operation-not-allowed":
        "El acceso todavía no está habilitado. Contacta al administrador.",
      "auth/configuration-not-found":
        "El acceso todavía no está habilitado. Contacta al administrador.",
      "permission-denied":
        "No tienes acceso a estos datos. Comprueba tu sesión.",
      unavailable:
        "No hay conexión con el inventario. Inténtalo de nuevo cuando tengas internet.",
      "resource-exhausted": "Se alcanzó el límite de uso. Inténtalo más tarde.",
    };
    return (
      messages[error.code] ||
      "No se pudo completar la operación. Inténtalo de nuevo."
    );
  }
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}
