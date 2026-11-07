import { Fragment } from "react";
import { Boton, LogoImagen } from "../ui/index.jsx";
import { PORTADA_POR_DEFECTO } from "../lib/dominio.js";
import "./tienda.css";

/**
 * Hero de la home. Lo usan la tienda y la vista previa del panel, de modo que
 * lo que se edita es literalmente lo que se publica.
 *
 * Cualquier campo vacío cae al valor por defecto: la portada nunca se ve rota
 * por una configuración a medio llenar.
 */
export default function Hero({ portada = PORTADA_POR_DEFECTO, comoVistaPrevia = false }) {
  const d = PORTADA_POR_DEFECTO;
  const eyebrow = portada.eyebrow?.trim() || d.eyebrow;
  const marca = portada.marca?.trim() || d.marca;
  const subtitulo = portada.subtitulo?.trim() || d.subtitulo;
  const parrafo = portada.parrafo?.trim() || d.parrafo;
  const textoBoton = portada.textoBoton?.trim() || d.textoBoton;
  // "/catalogo" fue el valor por defecto antiguo y no existe como ruta: lleva al
  // inicio en vez de bajar al catálogo. Se trata como el ancla que siempre quiso ser.
  const guardado = portada.linkBoton?.trim();
  const linkBoton = !guardado || guardado === "/catalogo" ? d.linkBoton : guardado;
  // Cada frase de la etiqueta se mantiene entera; solo se corta entre frases.
  const frases = eyebrow.split("·").map((f) => f.trim()).filter(Boolean);
  const sinNavegar = comoVistaPrevia ? (e) => e.preventDefault() : undefined;
  // Sirve igual una data URL guardada en Firestore que un enlace externo.
  const imagen = portada.imagenData?.trim();

  return (
    <section className={`hero ${comoVistaPrevia ? "hero--previa" : ""}`}>
      <div className="hero__malla">
        <div className="hero__texto">
          <span className="etiqueta hero__eyebrow">
            {frases.map((frase, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                <span className="hero__eyebrow-frase">
                  {frase}
                  {i < frases.length - 1 && " ·"}
                </span>
              </Fragment>
            ))}
          </span>

          <p className="hero__palabra" aria-hidden="true" style={{ "--letras": marca.length }}>
            {marca}
          </p>

          <h1 className="hero__subtitular">{subtitulo}</h1>

          <p className="hero__parrafo">{parrafo}</p>

          {/* En la vista previa los botones no deben navegar a ninguna parte. */}
          <div className="hero__acciones">
            <a className="hero__accion" href={linkBoton} onClick={sinNavegar}>
              <Boton>{textoBoton}</Boton>
            </a>
            <a className="hero__accion" href="#eventos" onClick={sinNavegar}>
              <Boton variante="contorno">Jabones para tu evento</Boton>
            </a>
          </div>
        </div>

        <div className="hero__foto">
          {imagen ? (
            <img
              src={imagen}
              alt={portada.imagenAlt?.trim() || "Jabones artesanales de JabonesG"}
              loading="eager"
              fetchPriority="high"
            />
          ) : (
            <div className="hero__hueco">
              <div className="hero__hueco-monograma">
                <LogoImagen variante="monograma" ancho={180} alt="" />
              </div>
              <span className="etiqueta hero__hueco-nota">Foto principal</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
