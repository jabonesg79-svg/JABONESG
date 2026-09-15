import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../estado/contextos.js";
import { LINEAS } from "../lib/dominio.js";
import { money } from "../lib/formato.js";
import {
  Boton,
  Buscador,
  Cargando,
  Icono,
  Logotipo,
  Monograma,
  Vacio,
} from "../ui/index.jsx";
import { useRevelado } from "../ui/useRevelado.js";
import "./tienda.css";

/** Foto principal del hero. Vacío mientras no haya material propio:
    el hueco conserva la proporción para que entre sin tocar el layout. */
const FOTO_HERO = "";

/** Número de WhatsApp en formato internacional sin signos, por ejemplo
    "573000000000". Vacío = el botón no se renderiza. */
const WHATSAPP = "";

/** Enlaces de redes. Vacío mientras no haya cuentas publicadas. */
const REDES = [];

const ENVIOS = ["Envíos a todo el país", "Entregas locales coordinadas por WhatsApp"];

const PAGOS = ["Efectivo", "Transferencia bancaria", "Nequi y Daviplata"];

const VALORES = [
  { icono: "hoja", texto: "100% naturales" },
  { icono: "corazon", texto: "Hechos a mano" },
  { icono: "frasco", texto: "Ingredientes seleccionados" },
];

export default function Tienda() {
  const { productos, cargando } = useDatos();
  const [busqueda, setBusqueda] = useState("");
  const [linea, setLinea] = useState("todas");

  const publicados = useMemo(
    () => productos.filter((p) => p.publicado !== false),
    [productos],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return publicados
      .filter((p) => (linea === "todas" ? true : p.linea === linea))
      .filter((p) =>
        !q
          ? true
          : [p.nombre, p.descripcion, p.aroma, p.linea, p.codigo]
              .filter(Boolean)
              .some((campo) => String(campo).toLowerCase().includes(q)),
      );
  }, [publicados, busqueda, linea]);

  const lineasDisponibles = useMemo(
    () => LINEAS.filter((l) => publicados.some((p) => p.linea === l)),
    [publicados],
  );

  // Re-observa cuando cambia lo que se muestra, para que las piezas nuevas
  // también entren con su animación.
  useRevelado([cargando, visibles.length, linea]);

  return (
    <div className="tienda">
      <header className="tienda__barra no-imprimir">
        <div className="contenedor">
          <Logotipo compacto />
          <Link to="/acceso">
            <Boton variante="contorno" tamano="pequeno" icono="candado">
              Panel
            </Boton>
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero__malla">
          <div className="hero__texto">
            <span className="etiqueta">{VALORES.map((v) => v.texto).join(" · ")}</span>

            <h1 className="hero__titular">
              jabón hecho a mano,
              <br />
              en lotes pequeños
            </h1>

            <p>
              Aceites vegetales, arcillas y aromas naturales. Cada barra se corta, se cura y se
              empaca una por una.
            </p>

            <a href="#catalogo">
              <Boton>Ver el catálogo</Boton>
            </a>
          </div>

          <div className="hero__foto">
            {FOTO_HERO ? (
              <img src={FOTO_HERO} alt="Jabones artesanales de JabonesG recién cortados" />
            ) : (
              <div className="hero__hueco">
                <Monograma tam={72} color="var(--beige)" />
                <span className="etiqueta">foto principal</span>
              </div>
            )}
          </div>
        </div>

        <span className="hero__palabra" aria-hidden="true">
          jabonesg
        </span>
      </section>

      <section className="seccion--marfil" id="catalogo">
        <div className="contenedor catalogo">
          <div className="catalogo__cabecera revelar">
            <div>
              <h2>nuestro catálogo</h2>
              <p className="catalogo__conteo">
                {visibles.length} {visibles.length === 1 ? "jabón" : "jabones"}
                {linea !== "todas" ? ` en ${linea.toLowerCase()}` : ""}
              </p>
            </div>
            <div className="catalogo__buscador">
              <Buscador
                valor={busqueda}
                alCambiar={setBusqueda}
                placeholder="Buscar por nombre o aroma"
              />
            </div>
          </div>

          {lineasDisponibles.length > 0 && (
            <div className="chips revelar">
              <button
                className={`chip ${linea === "todas" ? "activo" : ""}`}
                onClick={() => setLinea("todas")}
              >
                Todos
              </button>
              {lineasDisponibles.map((l) => (
                <button
                  key={l}
                  className={`chip ${linea === l ? "activo" : ""}`}
                  onClick={() => setLinea(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {cargando ? (
            <Cargando texto="sacando los jabones del molde" />
          ) : visibles.length === 0 ? (
            <Vacio
              icono="caja"
              titulo="todavía no hay jabones aquí"
              texto="Pronto publicaremos el próximo lote. Vuelve en unos días."
            />
          ) : (
            <div className="rejilla">
              {visibles.map((p) => (
                <article key={p.id} className="pieza revelar">
                  <div className="pieza__foto">
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={`Jabón ${p.nombre}${p.aroma ? `, aroma ${p.aroma.toLowerCase()}` : ""}`}
                        loading="lazy"
                      />
                    ) : (
                      <Monograma tam={44} color="var(--beige)" />
                    )}
                  </div>

                  <div>
                    <h3 className="pieza__nombre">{p.nombre}</h3>
                    <p className="pieza__ingrediente">
                      {[p.aroma, p.pesoGramos ? `${p.pesoGramos} g` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <p>
                    <span className="pieza__precio">{money(p.precioVenta)}</span>
                    {Number(p.stock) <= 0 && (
                      <span className="etiqueta pieza__agotado">agotado</span>
                    )}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="cierre revelar">
        <div className="contenedor">
          <p className="script cierre__frase">Bienestar en cada detalle</p>

          {WHATSAPP && (
            <a
              className="cierre__boton"
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <Boton>Escríbenos por WhatsApp</Boton>
            </a>
          )}
        </div>
      </section>

      <footer className="pie">
        <div className="contenedor">
          <div className="pie__malla">
            <div className="pie__bloque">
              <Logotipo compacto />
              <p>Jabones artesanales hechos a mano, en lotes pequeños.</p>
            </div>

            <div className="pie__bloque">
              <span className="etiqueta">Síguenos</span>
              {REDES.length === 0 ? (
                <p>Pronto por aquí.</p>
              ) : (
                REDES.map((r) => (
                  <a key={r.nombre} href={r.url} target="_blank" rel="noreferrer noopener">
                    {r.nombre}
                  </a>
                ))
              )}
            </div>

            <div className="pie__bloque">
              <span className="etiqueta">Envíos</span>
              {ENVIOS.map((linea) => (
                <p key={linea}>{linea}</p>
              ))}
            </div>

            <div className="pie__bloque">
              <span className="etiqueta">Pagos</span>
              {PAGOS.map((linea) => (
                <p key={linea}>{linea}</p>
              ))}
            </div>
          </div>

          <div className="divisor pie__divisor">
            <Icono nombre="corazon" tam={12} />
          </div>

          <p className="pie__nota">
            JabonesG · jabones artesanales © {new Date().getFullYear()}
          </p>
        </div>
      </footer>

    </div>
  );
}
