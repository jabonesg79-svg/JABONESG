import { useEffect, useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import Hero from "./Hero.jsx";
import Ficha from "./Ficha.jsx";
import { ComoComprar, PorQue, Testimonios } from "./SeccionesInicio.jsx";
import { EJEMPLOS } from "../lib/ejemplos.js";
import {
  BENEFICIOS,
  ETIQUETA_ESTADO,
  estadoTienda,
  miniaturaDe,
  ordenarParaTienda,
  precioDesde,
} from "../lib/dominio.js";
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
  { texto: "Nosotros", destino: "#nosotros" },
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

const mensajePedido = (p) =>
  estadoTienda(p) === "agotado"
    ? `Hola JabonesG, vi el jabón "${p.nombre}" agotado en la tienda. ¿Cuándo vuelve a estar disponible?`
    : `Hola JabonesG, quiero pedir el jabón "${p.nombre}" (${money(p.precioVenta)}). ¿Me ayudas con el pedido?`;

const MENSAJE_GENERAL = "Hola JabonesG, quiero información sobre sus jabones.";
const MENSAJE_EVENTO =
  "Hola JabonesG, quiero cotizar recordatorios de jabón para un evento. Tipo de evento: ___ · Fecha: ___ · Cantidad aproximada: ___";

export default function Tienda() {
  const { productos, portada, contacto, testimonios, configEventos, cargando } = useDatos();
  const [busqueda, setBusqueda] = useState("");
  const [beneficio, setBeneficio] = useState("todos");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [contactoALaVista, setContactoALaVista] = useState(false);

  const whatsapp = enlaceWhatsApp(contacto.whatsapp, MENSAJE_GENERAL);
  const whatsappEvento = enlaceWhatsApp(contacto.whatsapp, MENSAJE_EVENTO);
  const instagram = enlaceInstagram(contacto.instagram);

  // Condiciones de eventos configuradas en el panel; las vacías no se muestran.
  const desde = precioDesde(configEventos);
  const condicionesEvento = [
    desde && { titulo: "Desde", valor: `${money(desde)} por unidad` },
    configEventos.pedidoMinimo > 0 && { titulo: "Pedido mínimo", valor: `${configEventos.pedidoMinimo} unidades` },
    configEventos.diasAnticipacion > 0 && {
      titulo: "Anticipación",
      valor: `${configEventos.diasAnticipacion} días antes del evento`,
    },
    configEventos.empaques?.length > 0 && {
      titulo: "Empaques",
      valor: configEventos.empaques.join(" · "),
      ancha: true,
    },
  ].filter(Boolean);

  const publicados = useMemo(
    () => [
      ...productos.filter((p) => p.publicado !== false),
      // Muestras solo en desarrollo: nunca llegan a Firestore ni a la tienda publicada.
      ...(import.meta.env.DEV ? EJEMPLOS : []),
    ],
    [productos],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ordenarParaTienda(
      publicados
        .filter((p) => beneficio === "todos" || p.beneficios?.includes(beneficio))
        .filter((p) =>
          !q
            ? true
            : [p.nombre, p.descripcion, p.beneficioCorto, p.aroma, p.linea, p.codigo]
                .filter(Boolean)
                .some((campo) => String(campo).toLowerCase().includes(q)),
        ),
    );
  }, [publicados, busqueda, beneficio]);

  // Solo se ofrecen filtros que devuelven algo.
  const beneficiosDisponibles = useMemo(
    () => BENEFICIOS.filter((b) => publicados.some((p) => p.beneficios?.includes(b))),
    [publicados],
  );

  // El botón flotante sobra cuando ya se ven los botones del hero, la franja
  // de WhatsApp o el pie: ahí taparía justo esos botones y enlaces.
  useEffect(() => {
    const objetivos = document.querySelectorAll(".hero__acciones, .cierre, .pie");
    if (!objetivos.length || typeof IntersectionObserver === "undefined") return undefined;
    const visibles = new Set();
    const observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) visibles.add(e.target);
        else visibles.delete(e.target);
      }
      setContactoALaVista(visibles.size > 0);
      // Lo que queda debajo del header fijo no cuenta como "a la vista".
    }, { rootMargin: "-74px 0px 0px 0px" });
    objetivos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, []);

  // Re-observa cuando cambia lo que se muestra, para que las piezas nuevas
  // también entren con su animación.
  useRevelado([cargando, visibles.length, beneficio]);

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
                {beneficio !== "todos" ? ` · ${beneficio.toLowerCase()}` : ""}
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

          {beneficiosDisponibles.length > 0 && (
            <div className="chips revelar" role="group" aria-label="Filtrar por beneficio">
              <button
                className={`chip ${beneficio === "todos" ? "activo" : ""}`}
                aria-pressed={beneficio === "todos"}
                onClick={() => setBeneficio("todos")}
              >
                Todos
              </button>
              {beneficiosDisponibles.map((b) => (
                <button
                  key={b}
                  className={`chip ${beneficio === b ? "activo" : ""}`}
                  aria-pressed={beneficio === b}
                  onClick={() => setBeneficio(b)}
                >
                  {b}
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
              {visibles.map((p) => {
                const estado = estadoTienda(p);
                // La tarjeta usa la miniatura que ya trae el producto: el
                // catálogo no lee ningún documento de fotos.
                const foto = miniaturaDe(p);
                const pedido = enlaceWhatsApp(contacto.whatsapp, mensajePedido(p));
                return (
                  <article
                    key={p.id}
                    className={`pieza revelar ${estado === "agotado" ? "pieza--agotada" : ""}`}
                  >
                    <button
                      className="pieza__abrir"
                      onClick={() => setDetalle(p)}
                      aria-label={`Ver detalle de ${p.nombre}`}
                    >
                      <div className="pieza__foto">
                        {foto ? (
                          <img
                            src={foto}
                            alt={`Jabón ${p.nombre}${p.aroma ? `, aroma ${p.aroma.toLowerCase()}` : ""}`}
                            loading="lazy"
                          />
                        ) : (
                          <LogoImagen
                            variante="monograma"
                            ancho={104}
                            className="pieza__marca-agua"
                            alt=""
                          />
                        )}
                        <span className={`pieza__estado pieza__estado--${estado}`}>
                          {ETIQUETA_ESTADO[estado]}
                        </span>
                        {p.ejemplo && <span className="pieza__ejemplo">Ejemplo</span>}
                      </div>

                      <h3 className="pieza__nombre">{p.nombre}</h3>
                      {(p.beneficioCorto || p.aroma) && (
                        <p className="pieza__beneficio">{p.beneficioCorto || p.aroma}</p>
                      )}
                      <p className="pieza__precio">{money(p.precioVenta)}</p>
                    </button>

                    {pedido && (
                      <a
                        className="pieza__pedir"
                        href={pedido}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <Icono nombre="whatsapp" tam={16} />
                        {estado === "agotado" ? (
                          "Preguntar"
                        ) : (
                          <span>
                            Pedir<span className="pieza__pedir-extra"> por WhatsApp</span>
                          </span>
                        )}
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <PorQue />

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
            {condicionesEvento.length > 0 && (
              <dl className="eventos__condiciones">
                {condicionesEvento.map((c) => (
                  <div key={c.titulo} className={c.ancha ? "eventos__condicion--ancha" : undefined}>
                    <dt>{c.titulo}</dt>
                    <dd>{c.valor}</dd>
                  </div>
                ))}
              </dl>
            )}
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

      <ComoComprar />

      <Testimonios lista={testimonios} />

      {/* Franja delgada: la frase de marca cierra la página junto al contacto. */}
      <section className="cierre revelar" id="contacto">
        <div className="contenedor cierre__fila">
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

      {detalle && (
        <Ficha
          producto={detalle}
          enlacePedido={enlaceWhatsApp(contacto.whatsapp, mensajePedido(detalle))}
          alCerrar={() => setDetalle(null)}
        />
      )}

      {whatsapp && (
        <a
          className={`whatsapp-flotante no-imprimir ${contactoALaVista ? "whatsapp-flotante--oculto" : ""}`}
          aria-hidden={contactoALaVista || undefined}
          tabIndex={contactoALaVista ? -1 : undefined}
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
