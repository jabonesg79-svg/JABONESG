import { useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import Hero from "./Hero.jsx";
import { LINEAS } from "../lib/dominio.js";
import { enlaceInstagram, enlaceWhatsApp, money, telefonoLegible } from "../lib/formato.js";
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

const ENVIOS = ["Envíos a todo el país", "Entregas locales coordinadas por WhatsApp"];

const PAGOS = ["Efectivo", "Transferencia bancaria", "Nequi y Daviplata"];

/** Solo secciones que existen: un enlace que no lleva a ninguna parte se ve roto. */
const NAVEGACION = [
  { texto: "Catálogo", destino: "#catalogo" },
  { texto: "Eventos", destino: "#eventos" },
  { texto: "Contacto", destino: "#contacto" },
];

const EVENTOS = [
  "Matrimonios",
  "Bautizos",
  "Baby shower",
  "Primeras comuniones",
  "Cumpleaños",
  "Detalles empresariales",
];

const MENSAJE_GENERAL = "Hola JabonesG, quiero información sobre sus jabones.";
const MENSAJE_EVENTO =
  "Hola JabonesG, quiero cotizar recordatorios de jabón para un evento. Tipo de evento: ___ · Fecha: ___ · Cantidad aproximada: ___";

export default function Tienda() {
  const { productos, portada, contacto, cargando } = useDatos();
  const [busqueda, setBusqueda] = useState("");
  const [linea, setLinea] = useState("todas");
  const [menuAbierto, setMenuAbierto] = useState(false);

  const whatsapp = enlaceWhatsApp(contacto.whatsapp, MENSAJE_GENERAL);
  const whatsappEvento = enlaceWhatsApp(contacto.whatsapp, MENSAJE_EVENTO);
  const instagram = enlaceInstagram(contacto.instagram);

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

          <nav
            id="menu-principal"
            className={`nav ${menuAbierto ? "nav--abierto" : ""}`}
            aria-label="Secciones del sitio"
          >
            {NAVEGACION.map((item) => (
              <a
                key={item.texto}
                className="nav__enlace"
                href={item.destino}
                onClick={() => setMenuAbierto(false)}
              >
                {item.texto}
              </a>
            ))}
          </nav>

          <div className="barra__acciones">
            {whatsapp && (
              <a
                className="barra__whatsapp"
                href={whatsapp}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Escríbenos por WhatsApp"
              >
                <Icono nombre="whatsapp" tam={18} />
                <span>WhatsApp</span>
              </a>
            )}
            <button
              className="barra__menu"
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuAbierto}
              aria-controls="menu-principal"
              onClick={() => setMenuAbierto((v) => !v)}
            >
              <Icono nombre={menuAbierto ? "cerrar" : "menu"} tam={22} />
            </button>
          </div>
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

      <section className="eventos" id="eventos">
        <div className="contenedor eventos__malla revelar">
          <div className="eventos__texto">
            <span className="etiqueta">Recordatorios para eventos</span>
            <h2 className="seccion-cabecera__titulo">jabones para tu celebración</h2>
            <p>
              Recordatorios hechos a mano con el aroma, el color y la etiqueta de tu evento.
              Cuéntanos la fecha y la cantidad, y te enviamos opciones y precio.
            </p>
            <ul className="eventos__tipos">
              {EVENTOS.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>

          {whatsappEvento && (
            <a
              className="eventos__accion"
              href={whatsappEvento}
              target="_blank"
              rel="noreferrer noopener"
            >
              <Boton variante="acento" icono="whatsapp">
                Cotizar mi evento
              </Boton>
            </a>
          )}
        </div>
      </section>

      <section className="cierre revelar" id="contacto">
        <div className="contenedor">
          <p className="script cierre__frase">Bienestar en cada detalle</p>

          {whatsapp && (
            <a className="cierre__boton" href={whatsapp} target="_blank" rel="noreferrer noopener">
              <Boton icono="whatsapp">Escríbenos por WhatsApp</Boton>
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
              <span className="etiqueta">Escríbenos</span>
              {whatsapp && (
                <a className="pie__red" href={whatsapp} target="_blank" rel="noreferrer noopener">
                  <Icono nombre="whatsapp" tam={16} />
                  WhatsApp · {telefonoLegible(contacto.whatsapp)}
                </a>
              )}
              {instagram && (
                <a className="pie__red" href={instagram} target="_blank" rel="noreferrer noopener">
                  <Icono nombre="instagram" tam={16} />
                  Instagram
                </a>
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

          {/* El panel sigue en /admin, pero no se anuncia en la tienda. */}
          <p className="pie__nota">JabonesG · jabones artesanales © {new Date().getFullYear()}</p>
        </div>
      </footer>

      {whatsapp && (
        <a
          className="whatsapp-flotante no-imprimir"
          href={whatsapp}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Escríbenos por WhatsApp"
        >
          <Icono nombre="whatsapp" tam={28} />
        </a>
      )}

    </div>
  );
}
