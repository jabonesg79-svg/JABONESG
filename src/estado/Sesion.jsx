import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../lib/firebase.js";
import { SesionCtx } from "./contextos.js";

export function ProveedorSesion({ children }) {
  // undefined = todavía no sabemos; null = visitante; objeto = usuario del panel.
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, setUsuario), []);

  const valor = useMemo(
    () => ({
      usuario,
      cargando: usuario === undefined,
      entrar: (correo, clave) => signInWithEmailAndPassword(auth, correo, clave),
      salir: () => signOut(auth),
    }),
    [usuario],
  );

  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>;
}
