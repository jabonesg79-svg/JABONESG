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
  const linkBoton = portada.linkBoton?.trim() || d.linkBoton;
  const imagenUrl = portada.imagenUrl?.trim();

  return (
    <section className={`hero ${comoVistaPrevia ? "hero--previa" : ""}`}>
      <div className="hero__malla">
        <div className="hero__texto">
          <span className="etiqueta hero__eyebrow">{eyebrow}</span>

          <p className="hero__palabra" aria-hidden="true">
            {marca}
          </p>

          <h1 className="hero__subtitular">{subtitulo}</h1>

          <p className="hero__parrafo">{parrafo}</p>

          <a
            className="hero__accion"
            href={linkBoton}
            // En la vista previa el botón no debe navegar a ninguna parte.
            onClick={comoVistaPrevia ? (e) => e.preventDefault() : undefined}
          >
            <Boton>{textoBoton}</Boton>
          </a>
        </div>

        <div className="hero__foto">
          {imagenUrl ? (
            <img
              src={imagenUrl}
              alt={portada.imagenAlt?.trim() || "Jabones artesanales de JabonesG"}
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
