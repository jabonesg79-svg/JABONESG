import { Icono } from "../ui/index.jsx";

const RAZONES = [
  {
    icono: "hoja",
    titulo: "100% naturales",
    texto: "Aceites vegetales, arcillas y aromas naturales en cada barra.",
  },
  {
    icono: "corazon",
    titulo: "Hechos a mano",
    texto: "Cada barra se corta, se cura y se empaca una por una, con cuidado.",
  },
  {
    icono: "frasco",
    titulo: "Lotes pequeños",
    texto: "Producimos poco y seguido: lo que te llega está fresco.",
  },
  {
    icono: "gota",
    titulo: "Para cada piel",
    texto: "Opciones para piel seca, grasa, mixta y sensible. Te ayudamos a elegir.",
  },
];

const PASOS = [
  { titulo: "Elige", texto: "Mira el catálogo y abre la ficha del jabón que te guste." },
  { titulo: "Escríbenos", texto: "Toca «Pedir por WhatsApp»: el mensaje ya va con el jabón y el precio." },
  { titulo: "Paga", texto: "Transferencia bancaria, Nequi, Daviplata o efectivo." },
  { titulo: "Recíbelo", texto: "Enviamos a todo el país y coordinamos entregas locales." },
];

export function PorQue() {
  return (
    <section className="razones" id="nosotros">
      <div className="contenedor">
        <div className="seccion-cabecera revelar">
          <span className="etiqueta">Por qué JabonesG</span>
          <h2 className="seccion-cabecera__titulo">cuidado que se nota</h2>
        </div>
        <ul className="razones__lista">
          {RAZONES.map((r) => (
            <li key={r.titulo} className="razon revelar">
              <span className="razon__icono">
                <Icono nombre={r.icono} tam={24} />
              </span>
              <h3 className="razon__titulo">{r.titulo}</h3>
              <p className="razon__texto">{r.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ComoComprar() {
  return (
    <section className="pasos" id="como-comprar">
      <div className="contenedor">
        <div className="seccion-cabecera revelar">
          <span className="etiqueta">Cómo comprar</span>
          <h2 className="seccion-cabecera__titulo">en cuatro pasos</h2>
        </div>
        <ol className="pasos__lista">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="paso revelar">
              <span className="paso__numero">{i + 1}</span>
              <h3 className="paso__titulo">{p.titulo}</h3>
              <p className="paso__texto">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Sin testimonios cargados no se pinta nada: una sección vacía resta confianza. */
export function Testimonios({ lista = [] }) {
  if (!lista.length) return null;
  return (
    <section className="testimonios" id="testimonios">
      <div className="contenedor">
        <div className="seccion-cabecera revelar">
          <span className="etiqueta">Lo que dicen</span>
          <h2 className="seccion-cabecera__titulo">quienes ya los usan</h2>
        </div>
        <ul className="testimonios__lista">
          {lista.map((t, i) => (
            <li key={`${t.nombre}-${i}`} className="testimonio revelar">
              <blockquote className="testimonio__texto">“{t.texto}”</blockquote>
              <p className="testimonio__autor">
                {t.nombre}
                {t.ciudad && <span> · {t.ciudad}</span>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
