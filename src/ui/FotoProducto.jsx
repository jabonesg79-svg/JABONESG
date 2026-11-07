import { useEffect, useState } from "react";
import { esUrlFoto } from "../lib/dominio.js";
import { leerFoto } from "../lib/datos.js";

/**
 * Muestra una entrada de `fotos`: una URL tal cual, o el id de una foto de
 * `productos/{productoId}/imagenes`, que se lee solo cuando este componente
 * aparece (la ficha la pide al abrirse, nunca el catálogo). Mientras carga no
 * pinta nada y se ve el fondo del marco.
 */
export default function FotoProducto({ productoId, foto, version = "grande", ...resto }) {
  const [cargada, setCargada] = useState({ clave: null, url: "" });
  const esUrl = esUrlFoto(foto);
  const clave = `${productoId}/${foto}/${version}`;

  useEffect(() => {
    if (esUrl || !productoId || !foto) return undefined;
    let vigente = true;
    leerFoto(productoId, foto).then((f) => vigente && setCargada({ clave, url: f[version] }));
    return () => {
      vigente = false;
    };
  }, [clave, esUrl, productoId, foto, version]);

  const url = esUrl ? foto : cargada.clave === clave ? cargada.url : "";
  if (!url) return null;
  return <img src={url} decoding="async" {...resto} />;
}
