import { useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import { siguienteNumeroFactura } from "../lib/datos.js";
import { FORMAS_PAGO } from "../lib/dominio.js";
import { money, num } from "../lib/formato.js";
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
  const { productos, facturas, venderCarrito } = useDatos();
  const avisar = useAviso();

  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [formaPago, setFormaPago] = useState(FORMAS_PAGO[0]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [cobrando, setCobrando] = useState(false);

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

  const total = carrito.reduce((s, i) => s + i.precioFinal * i.cantidad, 0);

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
      });
      avisar(`Venta registrada · factura ${factura.numeroFactura}`, "exito");
      setCarrito([]);
      setClienteNombre("");
      setClienteTelefono("");
      setFormaPago(FORMAS_PAGO[0]);
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
            <Boton variante="fantasma" onClick={() => setCarrito([])}>
              Vaciar carrito
            </Boton>
          </div>
        )}
      </header>

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

        <Tarjeta className="bloque carrito">
          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Venta actual</h2>
            <Insignia tono="beige">
              {num(carrito.reduce((s, i) => s + i.cantidad, 0))} u.
            </Insignia>
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
