import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDatos } from "../estado/contextos.js";
import { ESTADOS_PEDIDO_WEB, listaPedido, totalLineas } from "../lib/dominio.js";
import { enlaceWhatsApp, fechaCorta, money, num, telefonoLegible } from "../lib/formato.js";
import { Boton, Icono, Insignia, Modal, Tarjeta, Vacio } from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import "./panel.css";

const FILTROS = [
  { id: "nuevo", texto: "Nuevos" },
  { id: "vendido", texto: "Vendidos" },
  { id: "descartado", texto: "Descartados" },
  { id: "todos", texto: "Todos" },
];

const TONO = { nuevo: "caramelo", vendido: "salvia", descartado: "neutra" };

const hora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
};

const unidades = (p) => (p.lineas || []).reduce((s, l) => s + (Number(l.cantidad) || 0), 0);

/** Respuesta prellenada: saluda por el nombre y repite lo que pidió. */
const respuesta = (p) =>
  [
    `¡Hola${p.nombre ? `, ${p.nombre}` : ""}! 🌿 Te escribimos de JabonesG por tu pedido:`,
    listaPedido(p.lineas || []),
    `*Total: ${money(totalLineas(p.lineas || []))}*`,
    "",
  ].join("\n");

/**
 * Pedidos que llegan del carrito de la tienda. El total que trae cada uno es
 * el que vio la clienta; al convertirlo en venta, Vender vuelve a leer stock y
 * precios de Firestore.
 */
export default function PedidosWeb() {
  const { pedidosWeb, productos, actualizarPedidoWeb } = useDatos();
  const avisar = useAviso();
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState("nuevo");
  const [abierto, setAbierto] = useState(null);
  const [descartando, setDescartando] = useState(false);

  const visibles = useMemo(
    () => pedidosWeb.filter((p) => filtro === "todos" || (p.estado || "nuevo") === filtro),
    [pedidosWeb, filtro],
  );
  const nuevos = pedidosWeb.filter((p) => (p.estado || "nuevo") === "nuevo").length;

  // Precio de hoy de cada línea, para que se vea si cambió desde el pedido.
  const precioHoy = (l) => {
    const p = productos.find((x) => x.id === l.productoId);
    return p ? Number(p.precioVenta) || 0 : null;
  };

  const descartar = async (p) => {
    try {
      await actualizarPedidoWeb(p.id, { estado: "descartado" });
      avisar("Pedido descartado", "exito");
      setAbierto(null);
      setDescartando(false);
    } catch (err) {
      avisar(`No se pudo descartar: ${err.message}`, "peligro");
    }
  };

  const enlaceRespuesta = (p) =>
    enlaceWhatsApp(p.telefono, respuesta(p)) || `https://wa.me/?text=${encodeURIComponent(respuesta(p))}`;

  return (
    <>
      <header className="cabecera-pagina">
        <div>
          <h1>Pedidos web</h1>
          <p>
            {nuevos === 0 ? "Sin pedidos nuevos" : `${nuevos} ${nuevos === 1 ? "pedido nuevo" : "pedidos nuevos"}`} ·
            llegan desde el carrito de la tienda
          </p>
        </div>
      </header>

      <div className="chips chips--fila" style={{ marginBottom: 18 }}>
        {FILTROS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filtro === f.id ? "activo" : ""}`}
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
          >
            {f.texto}
          </button>
        ))}
      </div>

      <Tarjeta className="bloque">
        {visibles.length === 0 ? (
          <Vacio
            icono="caja"
            titulo={pedidosWeb.length === 0 ? "Todavía no hay pedidos web" : "Nada con ese filtro"}
            texto={
              pedidosWeb.length === 0
                ? "Cuando alguien envíe su carrito desde la tienda, el pedido aparece aquí."
                : "Prueba con otro filtro."
            }
          />
        ) : (
          <ul className="pedidos-web">
            {visibles.map((p) => (
              <li key={p.id}>
                <button className="pedido-web" onClick={() => setAbierto(p)}>
                  <span className="pedido-web__quien">
                    <strong>{p.nombre || "Sin nombre"}</strong>
                    <span className="producto-celda__meta">
                      {fechaCorta(p.creado)} · {hora(p.creado)}
                      {p.ciudad ? ` · ${p.ciudad}` : ""}
                    </span>
                  </span>
                  <span className="pedido-web__cifras">
                    <strong className="sin-corte">{money(totalLineas(p.lineas || []))}</strong>
                    <span className="producto-celda__meta sin-corte">{num(unidades(p))} u.</span>
                  </span>
                  <Insignia tono={TONO[p.estado || "nuevo"]}>
                    {ESTADOS_PEDIDO_WEB[p.estado || "nuevo"]}
                    {p.estado === "vendido" && p.numeroFactura ? ` · #${p.numeroFactura}` : ""}
                  </Insignia>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {abierto && (
        <Modal
          titulo={abierto.nombre ? `Pedido de ${abierto.nombre}` : "Pedido web"}
          alCerrar={() => {
            setAbierto(null);
            setDescartando(false);
          }}
          pie={
            <div className="pedido-web__acciones">
              {descartando ? (
                <>
                  <Boton variante="contorno" onClick={() => setDescartando(false)}>
                    No
                  </Boton>
                  <Boton variante="peligro" icono="basura" onClick={() => descartar(abierto)}>
                    Sí, descartar
                  </Boton>
                </>
              ) : (
                <>
                  {(abierto.estado || "nuevo") === "nuevo" && (
                    <Boton variante="fantasma" icono="basura" onClick={() => setDescartando(true)}>
                      Descartar
                    </Boton>
                  )}
                  <a href={enlaceRespuesta(abierto)} target="_blank" rel="noreferrer noopener">
                    <Boton variante="contorno" icono="whatsapp">
                      Responder por WhatsApp
                    </Boton>
                  </a>
                  {(abierto.estado || "nuevo") === "nuevo" && (
                    <Boton
                      icono="ventas"
                      onClick={() => navegar("/panel/ventas", { state: { pedidoWebId: abierto.id } })}
                    >
                      Convertir en venta
                    </Boton>
                  )}
                </>
              )}
            </div>
          }
        >
          <div className="pedido-web__detalle">
            {descartando && (
              <p className="portada__error">
                <Icono nombre="alerta" tam={13} grosor={2.2} /> El pedido queda en «Descartados»; no
                cambia el stock.
              </p>
            )}
            <dl className="ficha__datos">
              <div>
                <dt>Recibido</dt>
                <dd>
                  {fechaCorta(abierto.creado)} · {hora(abierto.creado)}
                </dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  {ESTADOS_PEDIDO_WEB[abierto.estado || "nuevo"]}
                  {abierto.numeroFactura ? ` · comprobante #${abierto.numeroFactura}` : ""}
                </dd>
              </div>
              {abierto.telefono && (
                <div>
                  <dt>Teléfono</dt>
                  <dd>{telefonoLegible(abierto.telefono) || abierto.telefono}</dd>
                </div>
              )}
              {abierto.ciudad && (
                <div>
                  <dt>Ciudad</dt>
                  <dd>{abierto.ciudad}</dd>
                </div>
              )}
              {abierto.entrega && (
                <div>
                  <dt>Entrega</dt>
                  <dd>{abierto.entrega}</dd>
                </div>
              )}
            </dl>
            {abierto.notas && <p className="pedido-web__notas">“{abierto.notas}”</p>}

            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Jabón</th>
                    <th className="num">Cant.</th>
                    <th className="num col-opcional">Precio</th>
                    <th className="num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(abierto.lineas || []).map((l, i) => {
                    const hoy = precioHoy(l);
                    return (
                      <tr key={`${l.productoId}-${i}`}>
                        <td>
                          {l.nombre}
                          {hoy === null && <p className="producto-celda__meta">Ya no está en el inventario</p>}
                          {hoy !== null && hoy !== Number(l.precio) && (
                            <p className="producto-celda__meta">Hoy cuesta {money(hoy)}</p>
                          )}
                        </td>
                        <td className="num">{num(l.cantidad)}</td>
                        <td className="num sin-corte col-opcional">{money(l.precio)}</td>
                        <td className="num sin-corte">{money(l.cantidad * l.precio)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="factura-hoja__total">
              <span>Total enviado</span>
              <strong>{money(totalLineas(abierto.lineas || []))}</strong>
            </div>
            <p className="campo__pista">
              Es el total que vio la clienta. Al convertirlo en venta se usan el stock y los precios
              de hoy.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
