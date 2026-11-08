import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDatos } from "../estado/contextos.js";
import { leerProductosPorId, siguienteNumeroFactura } from "../lib/datos.js";
import { FORMAS_PAGO, miniaturaDe, montoDescuento } from "../lib/dominio.js";
import { hoyISO, money, num } from "../lib/formato.js";
import {
  Boton,
  Buscador,
  Campo,
  Icono,
  Insignia,
  Selector,
  Tarjeta,
  Vacio
} from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import "./panel.css";

export default function Ventas() {
  const { productos, facturas, venderCarrito, pedidosWeb, actualizarPedidoWeb } = useDatos();
  const avisar = useAviso();
  const { state } = useLocation();
  const navegar = useNavigate();
  // Pedido web que se está convirtiendo en venta (viene de Pedidos web).
  const [origen, setOrigen] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [formaPago, setFormaPago] = useState(FORMAS_PAGO[0]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [cobrando, setCobrando] = useState(false);
  const [tipoDescuento, setTipoDescuento] = useState("pesos");
  const [valorDescuento, setValorDescuento] = useState("");
  // En el celular el carrito es una barra fija que se abre como hoja.
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) =>
      !q
        ? true
        : [p.nombre, p.codigo, p.linea, p.aroma]
            .filter(Boolean)
            .some((c) => String(c).toLowerCase().includes(q)),
    );
  }, [productos, busqueda]);

  // "Convertir en venta": carga las líneas del pedido con el stock y el
  // precio que hay hoy en Firestore, nunca con lo que mandó el navegador.
  // Se toma una sola vez al entrar: limpiar la dirección no debe cortar la carga.
  const [pedidoWebId] = useState(() => state?.pedidoWebId);
  useEffect(() => {
    if (!pedidoWebId) return undefined;
    const pedido = pedidosWeb.find((p) => p.id === pedidoWebId);
    // Se limpia la dirección para que recargar no vuelva a cargar el pedido.
    navegar(".", { replace: true, state: null });
    if (!pedido) return undefined;
    let vigente = true;
    const lineas = pedido.lineas || [];
    leerProductosPorId([...new Set(lineas.map((l) => l.productoId))]).then((leidos) => {
      if (!vigente) return;
      const mapa = leidos || Object.fromEntries(productos.map((p) => [p.id, p]));
      const avisos = [];
      const cargado = [];
      for (const l of lineas) {
        const p = mapa[l.productoId];
        const stock = Number(p?.stock) || 0;
        if (!p) {
          avisos.push(`${l.nombre}: ya no está en el inventario, no se cargó.`);
          continue;
        }
        if (stock <= 0) {
          avisos.push(`${p.nombre}: sin stock, no se cargó.`);
          continue;
        }
        const cantidad = Math.min(Number(l.cantidad) || 0, stock);
        if (cantidad < l.cantidad) avisos.push(`${p.nombre}: pidió ${l.cantidad} y hay ${stock}.`);
        const precio = Number(p.precioVenta) || 0;
        if (precio !== Number(l.precio)) {
          avisos.push(`${p.nombre}: lo vio a ${money(l.precio)}, hoy cuesta ${money(precio)}.`);
        }
        cargado.push({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          linea: p.linea,
          aroma: p.aroma,
          stock,
          costoProduccion: Number(p.costoProduccion) || 0,
          precioVenta: precio,
          precioFinal: precio,
          cantidad,
        });
      }
      setCarrito(cargado);
      setClienteNombre(pedido.nombre || "");
      setClienteTelefono(pedido.telefono || "");
      setOrigen({ id: pedido.id, nombre: pedido.nombre, avisos });
    });
    return () => {
      vigente = false;
    };
    // Solo al llegar desde "Convertir en venta".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoWebId]);

  const enCarrito = (id) => carrito.find((i) => i.id === id)?.cantidad || 0;

  const agregar = (producto) => {
    const yaLleva = enCarrito(producto.id);
    if (yaLleva >= (Number(producto.stock) || 0)) {
      return avisar(`Solo quedan ${num(producto.stock)} de ${producto.nombre}`, "peligro");
    }
    setCarrito((c) =>
      yaLleva
        ? c.map((i) => (i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [
            ...c,
            {
              id: producto.id,
              codigo: producto.codigo,
              nombre: producto.nombre,
              linea: producto.linea,
              aroma: producto.aroma,
              stock: Number(producto.stock) || 0,
              costoProduccion: Number(producto.costoProduccion) || 0,
              precioVenta: Number(producto.precioVenta) || 0,
              precioFinal: Number(producto.precioVenta) || 0,
              cantidad: 1,
            },
          ],
    );
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito((c) =>
      c
        .map((i) => {
          if (i.id !== id) return i;
          const nueva = i.cantidad + delta;
          if (nueva > i.stock) {
            avisar(`Solo quedan ${num(i.stock)} de ${i.nombre}`, "peligro");
            return i;
          }
          return { ...i, cantidad: nueva };
        })
        .filter((i) => i.cantidad > 0),
    );
  };

  const cambiarPrecio = (id, valor) =>
    setCarrito((c) => c.map((i) => (i.id === id ? { ...i, precioFinal: Number(valor) || 0 } : i)));

  const subtotal = carrito.reduce((s, i) => s + i.precioFinal * i.cantidad, 0);
  const descuento = montoDescuento(subtotal, tipoDescuento, valorDescuento);
  // Lo escrito supera el total: se aplica el máximo posible y se avisa.
  const descuentoRecortado =
    Number(valorDescuento) > 0 &&
    (tipoDescuento === "porcentaje" ? Number(valorDescuento) > 100 : Number(valorDescuento) > subtotal);
  const total = subtotal - descuento;

  const cobrar = async () => {
    if (carrito.length === 0) return;
    if (formaPago === "Crédito" && !clienteNombre.trim()) {
      return avisar("Una venta a crédito necesita el nombre del cliente", "peligro");
    }
    setCobrando(true);
    try {
      const { factura } = await venderCarrito({
        carrito,
        formaPago,
        cliente: { nombre: clienteNombre.trim(), telefono: clienteTelefono.trim() },
        numeroFactura: siguienteNumeroFactura(facturas),
        descuento: descuento ? { tipo: tipoDescuento, valor: Number(valorDescuento) || 0, monto: descuento } : null,
      });
      avisar(`Venta registrada · comprobante ${factura.numeroFactura}`, "exito");
      if (origen) {
        await actualizarPedidoWeb(origen.id, {
          estado: "vendido",
          numeroFactura: factura.numeroFactura,
          vendidoEl: hoyISO(),
        }).catch((err) => avisar(`La venta quedó, pero no se marcó el pedido web: ${err.message}`, "peligro"));
        setOrigen(null);
      }
      setCarrito([]);
      setClienteNombre("");
      setClienteTelefono("");
      setFormaPago(FORMAS_PAGO[0]);
      setValorDescuento("");
      setTipoDescuento("pesos");
      setCarritoAbierto(false);
    } catch (err) {
      avisar(`No se pudo registrar: ${err.message}`, "peligro");
    } finally {
      setCobrando(false);
    }
  };

  return (
    <>
      <header className="cabecera-pagina">
        <div>
          <h1>Vender</h1>
          <p>Toca un jabón para sumarlo a la venta.</p>
        </div>
        {carrito.length > 0 && (
          <div className="cabecera-pagina__acciones">
            <Boton
              variante="fantasma"
              onClick={() => {
                setCarrito([]);
                setOrigen(null);
              }}
            >
              Vaciar carrito
            </Boton>
          </div>
        )}
      </header>

      {origen && (
        <div className="venta-origen">
          <span>
            <Icono nombre="caja" tam={14} /> Venta del pedido web
            {origen.nombre ? ` de ${origen.nombre}` : ""}, con stock y precios de hoy. Al cobrar, el
            pedido queda como vendido.
          </span>
          {origen.avisos.length > 0 && (
            <ul>
              {origen.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="pos">
        <div>
          <div style={{ marginBottom: 16 }}>
            <Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar jabón..." />
          </div>

          {disponibles.length === 0 ? (
            <Tarjeta>
              <Vacio
                icono="caja"
                titulo="No hay jabones para vender"
                texto="Agrega productos desde Inventario para poder registrar ventas."
              />
            </Tarjeta>
          ) : (
            <div className="pos__catalogo">
              {disponibles.map((p) => {
                const restante = (Number(p.stock) || 0) - enCarrito(p.id);
                return (
                  <button
                    key={p.id}
                    className="pos__item"
                    onClick={() => agregar(p)}
                    disabled={restante <= 0}
                  >
                    <span className="pos__item-foto">
                      {miniaturaDe(p) ? (
                        <img src={miniaturaDe(p)} alt="" loading="lazy" />
                      ) : (
                        <Icono nombre="gota" tam={18} grosor={1.3} />
                      )}
                    </span>
                    <span className="pos__item-nombre">{p.nombre}</span>
                    <span className="pos__item-meta">
                      {[p.linea, p.aroma].filter(Boolean).join(" · ")}
                    </span>
                    <span className="pos__item-precio">{money(p.precioVenta)}</span>
                    <span>
                      {restante > 0 ? (
                        <Insignia tono="beige">{num(restante)} disponibles</Insignia>
                      ) : (
                        <Insignia tono="peligro">Sin stock</Insignia>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {carrito.length > 0 && !carritoAbierto && (
          <button className="carrito-barra no-imprimir" onClick={() => setCarritoAbierto(true)}>
            <span className="carrito-barra__cantidad">
              {num(carrito.reduce((s, i) => s + i.cantidad, 0))} u.
            </span>
            <strong>{money(total)}</strong>
            <span className="carrito-barra__cobrar">Cobrar</span>
          </button>
        )}

        {carritoAbierto && (
          <div className="carrito__velo" onClick={() => setCarritoAbierto(false)} aria-hidden="true" />
        )}

        <Tarjeta className={`bloque carrito ${carritoAbierto ? "carrito--abierto" : ""}`}>
          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Venta actual</h2>
            <Insignia tono="beige">
              {num(carrito.reduce((s, i) => s + i.cantidad, 0))} u.
            </Insignia>
            <button
              className="carrito__cerrar"
              onClick={() => setCarritoAbierto(false)}
              aria-label="Cerrar la venta"
            >
              <Icono nombre="cerrar" tam={18} />
            </button>
          </div>

          {carrito.length === 0 ? (
            <Vacio
              icono="ventas"
              titulo="Carrito vacío"
              texto="Los jabones que toques aparecerán aquí."
            />
          ) : (
            <>
              <div className="carrito__lineas">
                {carrito.map((i) => (
                  <div key={i.id} className="carrito__linea">
                    <div className="carrito__nombre">
                      {i.nombre}
                      <small>{money(i.precioFinal)} c/u</small>
                    </div>
                    <div className="carrito__cant">
                      <button onClick={() => cambiarCantidad(i.id, -1)} aria-label="Quitar uno">
                        <Icono nombre="menos" tam={13} grosor={2.4} />
                      </button>
                      <span>{i.cantidad}</span>
                      <button onClick={() => cambiarCantidad(i.id, 1)} aria-label="Agregar uno">
                        <Icono nombre="mas" tam={13} grosor={2.4} />
                      </button>
                    </div>
                    <input
                      className="campo__control"
                      style={{ width: 96, padding: "7px 10px", fontSize: 13 }}
                      type="number"
                      min="0"
                      value={i.precioFinal}
                      onChange={(e) => cambiarPrecio(i.id, e.target.value)}
                      aria-label={`Precio de ${i.nombre}`}
                    />
                  </div>
                ))}
              </div>

              <div className="carrito__descuento">
                <span className="campo__etiqueta">Descuento (opcional)</span>
                <div className="carrito__descuento-fila">
                  <div className="segmentado" role="group" aria-label="Tipo de descuento">
                    {[
                      { id: "pesos", texto: "$" },
                      { id: "porcentaje", texto: "%" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={tipoDescuento === t.id ? "activo" : ""}
                        aria-pressed={tipoDescuento === t.id}
                        onClick={() => setTipoDescuento(t.id)}
                      >
                        {t.texto}
                      </button>
                    ))}
                  </div>
                  <input
                    className="campo__control"
                    type="number"
                    min="0"
                    max={tipoDescuento === "porcentaje" ? 100 : subtotal}
                    placeholder={tipoDescuento === "porcentaje" ? "Ej.: 10" : "Ej.: 2000"}
                    aria-label="Valor del descuento"
                    value={valorDescuento}
                    onChange={(e) => setValorDescuento(e.target.value)}
                  />
                </div>
                {descuentoRecortado && (
                  <p className="portada__error">
                    El descuento no puede superar el total: se aplica {money(descuento)}.
                  </p>
                )}
              </div>

              {descuento > 0 && (
                <div className="carrito__desglose">
                  <p>
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </p>
                  <p>
                    <span>Descuento</span>
                    <span>− {money(descuento)}</span>
                  </p>
                </div>
              )}

              <div className="carrito__total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>

              <div className="carrito__campos">
                <Selector
                  etiqueta="Forma de pago"
                  opciones={FORMAS_PAGO}
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                />
                <Campo
                  etiqueta={formaPago === "Crédito" ? "Cliente (obligatorio)" : "Cliente (opcional)"}
                  placeholder="Nombre de quien compra"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                />
                <Campo
                  etiqueta="Teléfono (opcional)"
                  placeholder="300 000 0000"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                />
                <Boton bloque variante="acento" onClick={cobrar} disabled={cobrando} icono="chequeo">
                  {cobrando ? "Registrando..." : `Cobrar ${money(total)}`}
                </Boton>
              </div>
            </>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
