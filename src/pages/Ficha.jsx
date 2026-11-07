import { useState } from "react";
import { ETIQUETA_ESTADO, estadoTienda, etiquetaPresentacion, fotosDe } from "../lib/dominio.js";
import { money } from "../lib/formato.js";
import { Boton, LogoImagen, Modal } from "../ui/index.jsx";
import FotoProducto from "../ui/FotoProducto.jsx";

/**
 * Ficha de detalle de un jabón en la tienda. Solo muestra lo que está lleno:
 * un producto cargado a medias se ve corto, nunca con huecos.
 */
export default function Ficha({ producto: p, enlacePedido, alCerrar }) {
  const fotos = fotosDe(p);
  const [actual, setActual] = useState(0);
  const estado = estadoTienda(p);

  const datos = [
    ["Aroma", p.aroma],
    ["Peso", p.pesoGramos ? `${p.pesoGramos} g` : ""],
    ["Tipo de piel", p.tipoPiel],
    ["Presentación", p.presentacion ? etiquetaPresentacion(p.presentacion) : ""],
  ].filter(([, valor]) => valor);

  return (
    <Modal ancho titulo={p.nombre} alCerrar={alCerrar}>
      <div className="ficha">
        <div className="ficha__galeria">
          <div className="ficha__foto">
            {fotos.length ? (
              <FotoProducto src={fotos[actual]} alt={`${p.nombre}, foto ${actual + 1} de ${fotos.length}`} />
            ) : (
              <LogoImagen variante="monograma" ancho={120} className="pieza__marca-agua" alt="" />
            )}
          </div>
          {fotos.length > 1 && (
            <div className="ficha__miniaturas">
              {fotos.map((foto, i) => (
                <button
                  key={foto}
                  className={`ficha__miniatura ${i === actual ? "activa" : ""}`}
                  onClick={() => setActual(i)}
                  aria-label={`Ver foto ${i + 1}`}
                >
                  <FotoProducto src={foto} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ficha__texto">
          <p>
            <span className="pieza__precio">{money(p.precioVenta)}</span>
            <span className={`pieza__estado pieza__estado--${estado} ficha__estado`}>
              {ETIQUETA_ESTADO[estado]}
            </span>
          </p>

          {p.beneficioCorto && <p className="ficha__lema">{p.beneficioCorto}</p>}
          {p.descripcion && <p className="ficha__descripcion">{p.descripcion}</p>}

          {p.beneficios?.length > 0 && (
            <ul className="ficha__beneficios">
              {p.beneficios.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}

          {datos.length > 0 && (
            <dl className="ficha__datos">
              {datos.map(([clave, valor]) => (
                <div key={clave}>
                  <dt>{clave}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          )}

          {p.ingredientes && (
            <section className="ficha__bloque">
              <h3 className="etiqueta">Ingredientes</h3>
              <p>{p.ingredientes}</p>
            </section>
          )}

          {p.modoUso && (
            <section className="ficha__bloque">
              <h3 className="etiqueta">Modo de uso</h3>
              <p>{p.modoUso}</p>
            </section>
          )}

          {enlacePedido && (
            <a className="ficha__pedir" href={enlacePedido} target="_blank" rel="noreferrer noopener">
              <Boton icono="whatsapp" bloque>
                {estado === "agotado" ? "Preguntar cuándo vuelve" : "Pedir por WhatsApp"}
              </Boton>
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}
