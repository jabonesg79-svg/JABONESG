import { useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import { cerrarCredito } from "../lib/datos.js";
import { fechaCorta, fechaLarga, money, num } from "../lib/formato.js";
import {
  Area,
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
  { id: "todas", texto: "Todos" },
  { id: "credito", texto: "Créditos abiertos" },
  { id: "pagadas", texto: "Pagados" },
  { id: "anuladas", texto: "Anulados" },
];

const MOTIVO_MINIMO = 5;

/** Comprobantes de venta: registro interno de cada venta. No reemplaza la
    factura electrónica de la DIAN, y así se dice en pantalla y al imprimir. */
export default function Comprobantes() {
  const { facturas, setFacturas, anularComprobante } = useDatos();
  const avisar = useAviso();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [abierta, setAbierta] = useState(null);
  const [anulando, setAnulando] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return facturas
      .filter((f) => {
        if (filtro === "credito") return !f.anulada && f.estadoCredito === "abierto";
        if (filtro === "pagadas") return !f.anulada && f.estadoCredito !== "abierto";
        if (filtro === "anuladas") return f.anulada;
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

  const confirmarAnulacion = async () => {
    const texto = motivo.trim();
    if (texto.length < MOTIVO_MINIMO) return avisar("Escribe el motivo de la anulación", "peligro");
    setProcesando(true);
    try {
      const anulada = await anularComprobante(anulando, texto);
      const unidades = Object.values(anulada.devuelto).reduce((s, n) => s + n, 0);
      avisar(`Comprobante #${anulando.numeroFactura} anulado · ${num(unidades)} u. devueltas al stock`, "exito");
      setAbierta((a) => (a && a.id === anulando.id ? anulada : a));
      setAnulando(null);
      setMotivo("");
    } catch (err) {
      avisar(`No se pudo anular: ${err.message}`, "peligro");
    } finally {
      setProcesando(false);
    }
  };

  const porCobrar = facturas
    .filter((f) => !f.anulada && f.estadoCredito === "abierto")
    .reduce((s, f) => s + (Number(f.total) || 0), 0);
  const vigentes = facturas.filter((f) => !f.anulada).length;

  return (
    <>
      <header className="cabecera-pagina no-imprimir">
        <div>
          <h1>Comprobantes de venta</h1>
          <p>
            {vigentes} emitidos · {money(porCobrar)} pendientes de cobro
          </p>
        </div>
      </header>

      <p className="aviso-legal no-imprimir">
        <Icono nombre="alerta" tam={14} grosor={2.2} />
        No es factura electrónica: es el comprobante interno de cada venta.
      </p>

      <div className="herramientas no-imprimir">
        <div className="herramientas__buscador">
          <Buscador
            valor={busqueda}
            alCambiar={setBusqueda}
            placeholder="Buscar por número o cliente..."
          />
        </div>
        <div className="chips chips--fila" style={{ margin: 0 }}>
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
            titulo={facturas.length === 0 ? "Todavía no hay comprobantes" : "Nada con ese filtro"}
            texto={
              facturas.length === 0
                ? "Cada venta que registres genera su comprobante automáticamente."
                : "Prueba con otra búsqueda."
            }
          />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th className="col-opcional">Fecha</th>
                  <th>Cliente</th>
                  <th className="col-opcional">Pago</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id} className={f.anulada ? "fila-anulada" : undefined}>
                    <td>
                      <strong>#{f.numeroFactura}</strong>
                      <p className="producto-celda__meta sin-corte solo-movil">{fechaCorta(f.fecha)}</p>
                    </td>
                    <td className="col-opcional sin-corte">{fechaCorta(f.fecha)}</td>
                    <td>{f.clienteNombre || "Mostrador"}</td>
                    <td className="col-opcional">
                      {f.anulada ? (
                        <Insignia tono="neutra">Anulado</Insignia>
                      ) : f.estadoCredito === "abierto" ? (
                        <Insignia tono="caramelo">Crédito abierto</Insignia>
                      ) : (
                        <Insignia tono="salvia">{f.formaPago}</Insignia>
                      )}
                    </td>
                    <td className="num">
                      <strong className="sin-corte">{money(f.total)}</strong>
                      {f.anulada && <p className="producto-celda__meta">Anulado</p>}
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

      {abierta && !anulando && (
        <Modal
          titulo={`Comprobante #${abierta.numeroFactura}`}
          alCerrar={() => setAbierta(null)}
          pie={
            <>
              {!abierta.anulada && (
                <Boton variante="fantasma" icono="basura" onClick={() => setAnulando(abierta)}>
                  Anular
                </Boton>
              )}
              {!abierta.anulada && abierta.estadoCredito === "abierto" && (
                <Boton variante="salvia" icono="chequeo" onClick={() => marcarPagada(abierta)}>
                  Marcar como pagado
                </Boton>
              )}
              <Boton variante="contorno" icono="descarga" onClick={() => window.print()}>
                Imprimir
              </Boton>
            </>
          }
        >
          <div className="factura-hoja">
            {abierta.anulada && (
              <div className="sello-anulado">
                <strong>Anulado</strong> el {fechaCorta(abierta.fechaAnulacion)} · {abierta.motivoAnulacion}
              </div>
            )}

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

            {abierta.descuento?.monto > 0 && (
              <div className="factura-hoja__lineas">
                <p>
                  <span>Subtotal</span>
                  <span>{money(abierta.subtotal)}</span>
                </p>
                <p>
                  <span>
                    Descuento
                    {abierta.descuento.tipo === "porcentaje" ? ` (${abierta.descuento.valor}%)` : ""}
                  </span>
                  <span>− {money(abierta.descuento.monto)}</span>
                </p>
              </div>
            )}

            <div className="factura-hoja__total">
              <span>Total</span>
              <strong>{money(abierta.total)}</strong>
            </div>

            <p className="factura-hoja__nota">
              Comprobante interno de venta. No es factura electrónica.
            </p>

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

      {anulando && (
        <Modal
          titulo={`Anular comprobante #${anulando.numeroFactura}`}
          alCerrar={() => setAnulando(null)}
          pie={
            <>
              <Boton variante="contorno" onClick={() => setAnulando(null)}>
                Cancelar
              </Boton>
              <Boton
                variante="peligro"
                icono="basura"
                onClick={confirmarAnulacion}
                disabled={procesando || motivo.trim().length < MOTIVO_MINIMO}
              >
                {procesando ? "Anulando..." : "Anular y devolver stock"}
              </Boton>
            </>
          }
        >
          <div className="portada__campos">
            <p>
              La venta de <strong>{money(anulando.total)}</strong> deja de contar en las cifras y
              las{" "}
              <strong>
                {num((anulando.items || []).reduce((s, i) => s + (Number(i.cantidad) || 0), 0))}{" "}
                unidades
              </strong>{" "}
              vuelven al inventario. El comprobante se conserva marcado como anulado; esto no se
              puede deshacer.
            </p>
            <Area
              etiqueta="Motivo"
              placeholder="Ej.: Se registró dos veces la misma venta"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>
        </Modal>
      )}
    </>
  );
}
