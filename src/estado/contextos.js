import { createContext, useContext } from "react";

export const SesionCtx = createContext(null);
export const DatosCtx = createContext(null);

export const useSesion = () => useContext(SesionCtx);
export const useDatos = () => useContext(DatosCtx);
