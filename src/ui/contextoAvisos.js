import { createContext, useContext } from "react";

/** El proveedor vive en ui/index.jsx; aquí solo el canal y su hook,
    para que los archivos de componentes exporten únicamente componentes. */
export const AvisosCtx = createContext(() => {});

export const useAviso = () => useContext(AvisosCtx);
