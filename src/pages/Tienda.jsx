import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../estado/contextos.js";
import Hero from "./Hero.jsx";
import { LINEAS } from "../lib/dominio.js";
import { money } from "../lib/formato.js";
import {
  Boton,
  Buscador,
  Cargando,
  Icono,
  Logotipo,
  LogoImagen,
  Vacio,
} from "../ui/index.jsx";
import { useRevelado } from "../ui/useRevelado.js";
import "./tienda.css";

/** Número de WhatsApp en formato internacional sin signos, por ejemplo
    "573000000000". Vacío = el botón no se renderiza. */
const WHATSAPP = "";

/** Enlaces de redes. Vacío mientras no haya cuentas publicadas. */
const REDES = [];

const ENVIOS = ["Envíos a todo el país", "Entregas locales coordinadas por WhatsApp"];

const PAGOS = ["Efectivo", "Transferencia bancaria", "Nequi y Daviplata"];

/** Las entradas sin `destino` aún no tienen sección: se muestran, pero no enlazan
    a ninguna parte para no dejar anclas rotas. */
const NAVEGACION = [
  { texto: "Catálogo", destino: "#catalogo" },
  { texto: "Ingredientes", destino: null },
  { texto: "Nosotros", destino: null },
  { texto: "Contacto", destino: "#contacto" },
];

export default function Tienda() {
  const { productos, portada, cargando } = useDatos();
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

          <nav className="nav" aria-label="Secciones del sitio">
            {NAVEGACION.map((item) =>
              item.destino ? (
                <a key={item.texto} className="nav__enlace" href={item.destino}>
                  {item.texto}
                </a>
              ) : (
                // Sin sección todavía: se muestra, pero no enlaza a ninguna parte.
                <span key={item.texto} className="nav__enlace">
                  {item.texto}
                </span>
              ),
            )}
          </nav>
        </div>
      </header>

      <Hero portada={portada} />

      <section className="seccion--marfil" id="catalogo">
        <div className="contenedor catalogo">
          <div className="catalogo__cabecera revelar">
            <div className="seccion-cabecera">
              <span className="etiqueta">Lo que hay hoy</span>
              <h2 className="seccion-cabecera__titulo">nuestro catálogo</h2>
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
                      <LogoImagen variante="monograma" ancho={104} className="pieza__marca-agua" alt="" />
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

      <section className="cierre revelar" id="contacto">
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
              <LogoImagen variante="completo" ancho={232} />
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

          <div className="pie__cierre">
            <p className="pie__nota">
              JabonesG · jabones artesanales © {new Date().getFullYear()}
            </p>
            <Link className="pie__admin" to="/admin">
              Panel
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
