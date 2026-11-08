import { useCallback, useEffect, useRef, useState } from "react";
import { marcarEnvio, puedeEnviar } from "../estado/useCarrito.js";
import { crearPedidoWeb, leerProductosPorId } from "../lib/datos.js";
import {
  armarMensaje,
  ENTREGAS,
  LARGOS_PEDIDO,
  listaPedido,
  miniaturaDe,
  totalLineas,
} from "../lib/dominio.js";
import { enlaceWhatsApp, money } from "../lib/formato.js";
import { Boton, Icono, LogoImagen } from "../ui/index.jsx";
import SelectorCantidad from "./SelectorCantidad.jsx";

/** Lo que tarda como máximo el guardado antes de abrir WhatsApp igual. */
const ESPERA_GUARDADO = 4000;

const esComputador = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Carrito de la tienda: panel lateral en computador, hoja desde abajo en
 * celular. Antes de mostrar el total y antes de enviar vuelve a leer stock y
 * precio de cada jabón; si algo cambió, lo ajusta y se lo dice a la clienta.
 */
export default function Carrito({ carrito, catalogo, contacto, alCerrar, alVerCatalogo }) {
  // Lo último leído del servidor manda sobre lo que trajo la tienda al cargar.
  const [frescos, setFrescos] = useState({});
  const [avisos, setAvisos] = useState([]);
  // Se abre revisando: el total se confirma con lo que diga el servidor.
  const [revisando, setRevisando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const [trampa, setTrampa] = useState("");
  const cerrar = useRef(null);

  const productoDe = useCallback(
    (id) => (id in frescos ? frescos[id] : catalogo.find((p) => p.id === id) || null),
    [frescos, catalogo],
  );

  /**
   * Revisa cada línea contra el servidor. Devuelve { lineas, avisos } con el
   * carrito ya ajustado; si la red falla, deja todo como estaba.
   */
  const revisar = useCallback(async () => {
    const lineas = carrito.lineas;
    // Las muestras de desarrollo no están en Firestore.
    const ids = lineas.map((l) => l.id).filter((id) => !id.startsWith("ejemplo-"));
    const leidos = ids.length ? await leerProductosPorId(ids) : {};
    if (!leidos) return { lineas, avisos: [] };

    const mapa = { ...Object.fromEntries(catalogo.map((p) => [p.id, p])), ...leidos };
    const nuevos = [];
    const ajustadas = [];
    for (const l of lineas) {
      const p = mapa[l.id];
      const stock = Math.max(0, Math.floor(Number(p?.stock) || 0));
      if (!p || p.publicado === false) {
        nuevos.push(`Un jabón de tu carrito ya no está en la tienda y lo quitamos.`);
        continue;
      }
      if (stock <= 0) {
        nuevos.push(`${p.nombre} se agotó y salió del carrito.`);
        continue;
      }
      let cantidad = l.cantidad;
      if (cantidad > stock) {
        cantidad = stock;
        nuevos.push(`De ${p.nombre} solo quedan ${stock}: ajustamos la cantidad.`);
      }
      const precio = Number(p.precioVenta) || 0;
      if (l.precioVisto && precio !== l.precioVisto) {
        nuevos.push(`El precio de ${p.nombre} cambió de ${money(l.precioVisto)} a ${money(precio)}.`);
      }
      ajustadas.push({ ...l, cantidad, precioVisto: precio });
    }

    setFrescos((f) => ({ ...f, ...leidos }));
    const cambio = JSON.stringify(ajustadas) !== JSON.stringify(lineas);
    if (cambio) carrito.ajustar(ajustadas);
    return { lineas: ajustadas, avisos: nuevos };
  }, [carrito, catalogo]);

  // Al abrir: revisar una vez, enfocar el cierre y bloquear el scroll de atrás.
  const revisarRef = useRef(revisar);
  useEffect(() => {
    revisarRef.current = revisar;
  }, [revisar]);
  useEffect(() => {
    let vigente = true;
    revisarRef.current().then((r) => {
      if (!vigente) return;
      setAvisos(r.avisos);
      setRevisando(false);
    });
    cerrar.current?.focus();
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => {
      vigente = false;
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [alCerrar]);

  const lineas = carrito.lineas
    .map((l) => ({ ...l, producto: productoDe(l.id) }))
    .filter((l) => l.producto);
  const total = totalLineas(lineas.map((l) => ({ cantidad: l.cantidad, precio: Number(l.producto.precioVenta) || 0 })));
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);
  const { datos } = carrito;

  const enviar = async () => {
    // El campo trampa solo lo llenan los robots: se les muestra el final sin
    // guardar ni abrir nada.
    if (trampa) {
      setConfirmacion({ enlace: "" });
      return;
    }
    if (!puedeEnviar()) {
      setAvisos(["Acabas de enviar un pedido. Espera un minuto antes de enviar otro."]);
      return;
    }
    // En computador la pestaña se abre ya, dentro del toque, para que el
    // navegador no la bloquee; se llena cuando el pedido quede guardado.
    const computador = esComputador();
    const pestana = computador ? window.open("", "_blank") : null;
    if (pestana) pestana.opener = null;

    setEnviando(true);
    const revision = await revisar();
    if (revision.avisos.length) {
      pestana?.close();
      setAvisos([...revision.avisos, "Revisa los cambios y vuelve a tocar «Enviar pedido»."]);
      setEnviando(false);
      return;
    }

    const pedido = revision.lineas.map((l) => {
      const p = productoDe(l.id) || {};
      return { productoId: l.id, nombre: p.nombre || "", cantidad: l.cantidad, precio: l.precioVisto };
    });
    const totalPedido = totalLineas(pedido);
    const limpio = Object.fromEntries(
      Object.keys(LARGOS_PEDIDO).map((k) => [k, String(datos[k] || "").trim().slice(0, LARGOS_PEDIDO[k])]),
    );
    const mensaje = armarMensaje(contacto.mensajes, "carrito", {
      lista: listaPedido(pedido),
      total: money(totalPedido),
      nombre: limpio.nombre,
      ciudad: limpio.ciudad,
      entrega: limpio.entrega,
      notas: limpio.notas,
    });
    const enlace = enlaceWhatsApp(contacto.whatsapp, mensaje);

    // Si guardar falla o tarda, WhatsApp se abre igual: el pedido no se pierde.
    await Promise.race([
      crearPedidoWeb({ lineas: pedido, total: totalPedido, datos: limpio }),
      new Promise((resolver) => setTimeout(resolver, ESPERA_GUARDADO)),
    ]).catch((err) => console.error("[carrito] no se guardó el pedido", err));

    marcarEnvio();
    carrito.vaciar({ conservarDatos: true });
    setConfirmacion({ enlace });
    setAvisos([]);
    setEnviando(false);

    if (pestana) pestana.location.href = enlace;
    else if (computador) window.open(enlace, "_blank", "noopener");
    // En el celular se sale a la app; un instante después, para que el carrito
    // vacío alcance a guardarse.
    else setTimeout(() => window.location.assign(enlace), 150);
  };

  const campo = (clave) => ({
    value: datos[clave] || "",
    maxLength: LARGOS_PEDIDO[clave],
    onChange: (e) => carrito.cambiarDato(clave, e.target.value),
  });

  return (
    <>
      <div className="carrito-tienda__velo" onClick={alCerrar} aria-hidden="true" />
      <aside className="carrito-tienda" role="dialog" aria-modal="true" aria-labelledby="carrito-titulo">
        <header className="carrito-tienda__cabecera">
          <h2 id="carrito-titulo" className="carrito-tienda__titulo">
            Tu carrito
            {unidades > 0 && !confirmacion && (
              <span className="carrito-tienda__conteo">
                {unidades} {unidades === 1 ? "jabón" : "jabones"}
              </span>
            )}
          </h2>
          <button ref={cerrar} className="carrito-tienda__cerrar" onClick={alCerrar} aria-label="Cerrar el carrito">
            <Icono nombre="cerrar" tam={20} />
          </button>
        </header>

        {confirmacion ? (
          <div className="carrito-tienda__final">
            <span className="carrito-tienda__check">
              <Icono nombre="chequeo" tam={28} grosor={2} />
            </span>
            <h3>¡Tu pedido está listo!</h3>
            <p>
              Lo dejamos escrito en WhatsApp: solo falta que toques enviar en el chat. Te
              respondemos para confirmar la disponibilidad y el costo del envío.
            </p>
            {confirmacion.enlace && (
              <a href={confirmacion.enlace} target="_blank" rel="noreferrer noopener" className="carrito-tienda__bloque">
                <Boton icono="whatsapp" bloque>
                  Abrir WhatsApp de nuevo
                </Boton>
              </a>
            )}
            <Boton variante="contorno" bloque onClick={alVerCatalogo}>
              Seguir viendo jabones
            </Boton>
          </div>
        ) : lineas.length === 0 ? (
          <div className="carrito-tienda__final">
            <LogoImagen variante="monograma" ancho={72} alt="" className="carrito-tienda__marca" />
            <h3>Tu carrito está vacío</h3>
            {avisos.map((a) => (
              <p key={a} className="carrito-tienda__aviso">
                {a}
              </p>
            ))}
            <p>Agrega los jabones que te gusten y envíanos el pedido por WhatsApp.</p>
            <Boton bloque onClick={alVerCatalogo}>
              Ver catálogo
            </Boton>
          </div>
        ) : (
          <>
            <div className="carrito-tienda__cuerpo">
              {avisos.length > 0 && (
                <ul className="carrito-tienda__avisos" role="status">
                  {avisos.map((a) => (
                    <li key={a}>
                      <Icono nombre="alerta" tam={14} grosor={2.2} /> {a}
                    </li>
                  ))}
                </ul>
              )}

              <ul className="carrito-tienda__lineas">
                {lineas.map(({ id, cantidad, producto: p }) => (
                  <li key={id} className="carrito-tienda__linea">
                    <span className="carrito-tienda__foto">
                      {miniaturaDe(p) ? <img src={miniaturaDe(p)} alt="" /> : <Icono nombre="gota" tam={18} />}
                    </span>
                    <div className="carrito-tienda__info">
                      <p className="carrito-tienda__nombre">{p.nombre}</p>
                      <SelectorCantidad
                        producto={p}
                        cantidad={cantidad}
                        alCambiar={(n) => carrito.cambiarCantidad(id, n)}
                        conTotal
                      />
                    </div>
                    <button
                      className="carrito-tienda__quitar"
                      onClick={() => carrito.quitar(id)}
                      aria-label={`Quitar ${p.nombre}`}
                    >
                      <Icono nombre="basura" tam={17} />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="carrito-tienda__datos">
                <p className="etiqueta">Tus datos (opcional)</p>
                <div className="carrito-tienda__par">
                  <label className="campo">
                    <span className="campo__etiqueta">Nombre</span>
                    <input className="campo__control" autoComplete="name" {...campo("nombre")} />
                  </label>
                  <label className="campo">
                    <span className="campo__etiqueta">Teléfono</span>
                    <input className="campo__control" type="tel" inputMode="tel" autoComplete="tel" {...campo("telefono")} />
                  </label>
                </div>
                <label className="campo">
                  <span className="campo__etiqueta">Ciudad</span>
                  <input className="campo__control" autoComplete="address-level2" {...campo("ciudad")} />
                </label>
                <div className="campo">
                  <span className="campo__etiqueta" id="entrega-titulo">Entrega</span>
                  <div className="carrito-tienda__entregas" role="group" aria-labelledby="entrega-titulo">
                    {ENTREGAS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className={`chip ${datos.entrega === e ? "activo" : ""}`}
                        aria-pressed={datos.entrega === e}
                        onClick={() => carrito.cambiarDato("entrega", datos.entrega === e ? "" : e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="campo">
                  <span className="campo__etiqueta">Notas</span>
                  <textarea
                    className="campo__control campo__control--area"
                    rows={2}
                    placeholder="Ej.: es un regalo, sin bolsa"
                    {...campo("notas")}
                  />
                </label>
                {/* Trampa para robots: invisible para las personas. */}
                <label className="carrito-tienda__trampa" aria-hidden="true">
                  Sitio web
                  <input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
                </label>
                <p className="carrito-tienda__nota">
                  <Icono nombre="caja" tam={14} /> El costo del envío se confirma por WhatsApp.
                </p>
              </div>
            </div>

            <footer className="carrito-tienda__pie">
              <p className="carrito-tienda__total">
                <span>Total del pedido</span>
                <strong>{money(total)}</strong>
              </p>
              <Boton icono="whatsapp" bloque onClick={enviar} disabled={enviando || revisando}>
                {enviando ? "Preparando tu pedido..." : revisando ? "Revisando el stock..." : "Enviar pedido por WhatsApp"}
              </Boton>
              {confirmarVaciar ? (
                <p className="carrito-tienda__vaciar">
                  ¿Vaciar el carrito?{" "}
                  <button
                    onClick={() => {
                      carrito.vaciar({ conservarDatos: true });
                      setConfirmarVaciar(false);
                      setAvisos([]);
                    }}
                  >
                    Sí, vaciar
                  </button>{" "}
                  · <button onClick={() => setConfirmarVaciar(false)}>No</button>
                </p>
              ) : (
                <button className="carrito-tienda__vaciar" onClick={() => setConfirmarVaciar(true)}>
                  Vaciar carrito
                </button>
              )}
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
