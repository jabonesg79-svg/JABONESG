import { useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import { cerrarCredito } from "../lib/datos.js";
import { fechaCorta, fechaLarga, money, num } from "../lib/formato.js";
import {
  Boton,
  Buscador,
  Icono,
  Insignia,
  Logotipo,
  Modal,
  Tarjeta,
  Vacio
} from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import "./panel.css";

const FILTROS = [
  { id: "todas", texto: "Todas" },
  { id: "credito", texto: "Créditos abiertos" },
  { id: "pagadas", texto: "Pagadas" },
];

export default function Facturas() {
  const { facturas, setFacturas } = useDatos();
  const avisar = useAviso();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [abierta, setAbierta] = useState(null);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return facturas
      .filter((f) => {
        if (filtro === "credito") return f.estadoCredito === "abierto";
        if (filtro === "pagadas") return f.estadoCredito !== "abierto";
        return true;
      })
      .filter((f) =>
        !q
          ? true
          : [f.numeroFactura, f.clienteNombre, f.ticket]
              .filter(Boolean)
              .some((c) => String(c).toLowerCase().includes(q)),
      );
  }, [facturas, busqueda, filtro]);

  const marcarPagada = async (factura) => {
    try {
      await cerrarCredito(factura.id);
      setFacturas((lista) =>
        lista.map((f) => (f.id === factura.id ? { ...f, estadoCredito: "pagado" } : f)),
      );
      setAbierta((a) => (a && a.id === factura.id ? { ...a, estadoCredito: "pagado" } : a));
      avisar("Crédito marcado como pagado", "exito");
    } catch (err) {
      avisar(`No se pudo actualizar: ${err.message}`, "peligro");
    }
  };

  const porCobrar = facturas
    .filter((f) => f.estadoCredito === "abierto")
    .reduce((s, f) => s + (Number(f.total) || 0), 0);

  return (
    <>
      <header className="cabecera-pagina no-imprimir">
        <div>
          <h1>Facturas</h1>
          <p>
            {facturas.length} emitidas · {money(porCobrar)} pendientes de cobro
          </p>
        </div>
      </header>

      <div className="herramientas no-imprimir">
        <div className="herramientas__buscador">
          <Buscador
            valor={busqueda}
            alCambiar={setBusqueda}
            placeholder="Buscar por número o cliente..."
          />
        </div>
        <div className="chips" style={{ margin: 0 }}>
          {FILTROS.map((f) => (
            <button
              key={f.id}
              className={`chip ${filtro === f.id ? "activo" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.texto}
            </button>
          ))}
        </div>
      </div>

      <Tarjeta className="bloque no-imprimir">
        {visibles.length === 0 ? (
          <Vacio
            icono="facturas"
            titulo={facturas.length === 0 ? "Todavía no hay facturas" : "Nada con ese filtro"}
            texto={
              facturas.length === 0
                ? "Cada venta que registres genera su factura automáticamente."
                : "Prueba con otra búsqueda."
            }
          />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th className="num">Artículos</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <strong>#{f.numeroFactura}</strong>
                      <p className="producto-celda__meta">{f.ticket}</p>
                    </td>
                    <td>{fechaCorta(f.fecha)}</td>
                    <td>{f.clienteNombre || "Mostrador"}</td>
                    <td>
                      {f.estadoCredito === "abierto" ? (
                        <Insignia tono="caramelo">Crédito abierto</Insignia>
                      ) : (
                        <Insignia tono="salvia">{f.formaPago}</Insignia>
                      )}
                    </td>
                    <td className="num">
                      {num((f.items || []).reduce((s, i) => s + (Number(i.cantidad) || 0), 0))}
                    </td>
                    <td className="num">
                      <strong>{money(f.total)}</strong>
                    </td>
                    <td>
                      <div className="acciones-fila">
                        <Boton variante="fantasma" tamano="pequeno" onClick={() => setAbierta(f)}>
                          Ver
                        </Boton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {abierta && (
        <Modal
          titulo={`Factura #${abierta.numeroFactura}`}
          alCerrar={() => setAbierta(null)}
          pie={
            <>
              {abierta.estadoCredito === "abierto" && (
                <Boton variante="salvia" icono="chequeo" onClick={() => marcarPagada(abierta)}>
                  Marcar como pagada
                </Boton>
              )}
              <Boton variante="contorno" icono="descarga" onClick={() => window.print()}>
                Imprimir
              </Boton>
            </>
          }
        >
          <div className="factura-hoja">
            <div className="factura-hoja__cabecera">
              <Logotipo />
              <div className="factura-hoja__numero">
                <strong>#{abierta.numeroFactura}</strong>
                {fechaLarga(abierta.fecha)}
                <br />
                {abierta.ticket}
              </div>
            </div>

            <div className="factura-hoja__cliente">
              <strong style={{ color: "var(--cacao)" }}>
                {abierta.clienteNombre || "Venta de mostrador"}
              </strong>
              {abierta.clienteTelefono ? ` · ${abierta.clienteTelefono}` : ""}
              <br />
              Forma de pago: {abierta.formaPago}
              {abierta.estadoCredito === "abierto" ? " · pendiente de cobro" : ""}
            </div>

            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="num">Cant.</th>
                    <th className="num">Precio</th>
                    <th className="num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(abierta.items || []).map((i, indice) => (
                    <tr key={`${i.codigo}-${indice}`}>
                      <td>{i.nombre}</td>
                      <td className="num">{num(i.cantidad)}</td>
                      <td className="num">{money(i.precioVenta)}</td>
                      <td className="num">{money(i.precioVenta * i.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="factura-hoja__total">
              <span>Total</span>
              <strong>{money(abierta.total)}</strong>
            </div>

            <div className="factura-hoja__gracias">
              <div className="filete">
                <Icono nombre="corazon" tam={12} />
              </div>
              <p className="script" style={{ fontSize: 26, marginTop: 10 }}>
                Gracias por tu compra
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
