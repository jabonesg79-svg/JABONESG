import { useEffect, useState } from "react";
import { esRefImagen } from "../lib/dominio.js";
import { leerImagen } from "../lib/datos.js";

/**
 * Muestra una foto de producto venga como venga: URL, data URL o referencia
 * "img:<id>" a la colección `imagenes`. Mientras la referencia carga no pinta
 * nada y se ve el fondo del marco, igual que una foto lenta.
 */
export default function FotoProducto({ src, ...resto }) {
  const [cargada, setCargada] = useState({ src: null, url: "" });
  const esRef = esRefImagen(src);

  useEffect(() => {
    if (!esRef) return undefined;
    let vigente = true;
    leerImagen(src).then((url) => vigente && setCargada({ src, url }));
    return () => {
      vigente = false;
    };
  }, [src, esRef]);

  const url = esRef ? (cargada.src === src ? cargada.url : "") : src;
  if (!url) return null;
  return <img src={url} {...resto} />;
}
