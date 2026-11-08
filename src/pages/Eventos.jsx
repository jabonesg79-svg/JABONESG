import { useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import {
  AROMAS,
  ESTADOS_EVENTO,
  ESTADOS_EVENTO_ACTIVOS,
  METODOS_PAGO,
  PEDIDO_EVENTO_VACIO,
  TIPOS_EVENTO,
  abonadoPedido,
  diasHasta,
  precioPorCantidad,
  saldoPedido,
  totalPedido,
} from "../lib/dominio.js";
import { diaISO, enlaceWhatsApp, fechaCorta, money, num } from "../lib/formato.js";
import { Area, Boton, Campo, Icono, Insignia, Modal, Selector, Tarjeta, Vacio } from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import { CondicionesEventos, DisenosEvento, TiposEvento } from "./EventosCatalogo.jsx";
import "./panel.css";

const FILTROS = [{ id: "activos", texto: "Activos" }, ...ESTADOS_EVENTO.map((e) => ({ id: e, texto: e })), { id: "todos", texto: "Todos" }];

const TONO_ESTADO = {
  Cotizado: "beige",
  Confirmado: "caramelo",
  "En producción": "caramelo",
  Listo: "salvia",
  Entregado: "salvia",
  Cancelado: "neutra",
};

/** Sin fecha de entrega va al final: lo urgente arriba. */
const porEntrega = (a, b) =>
  (a.fechaEntrega || "9999-99-99").localeCompare(b.fechaEntrega || "9999-99-99");

const cuandoEntrega = (fecha) => {
  const d = diasHasta(fecha);
  if (d === null) return "Sin fecha de entrega";
  if (d < 0) return `Entrega vencida hace ${-d} ${-d === 1 ? "día" : "días"}`;
  if (d === 0) return "Se entrega hoy";
  if (d === 1) return "Se entrega mañana";
  return `Se entrega en ${d} días`;
};

const mensajeCliente = (p) => {
  const saludo = `Hola ${p.cliente || ""}, te escribimos de JabonesG sobre tus recordatorios para ${String(p.tipoEvento || "tu evento").toLowerCase()}.`;
  const saldo = saldoPedido(p);
  const detalle = {
    Cotizado: `Te compartimos la cotización: ${num(p.cantidad)} unidades a ${money(p.precioUnitario)} c/u, total ${money(totalPedido(p))}. ¿Confirmamos?`,
    Confirmado: `Tu pedido está confirmado para entrega el ${fechaCorta(p.fechaEntrega)}.`,
    "En producción": "Tu pedido ya está en producción.",
    Listo: `Tu pedido está listo para entregar.${saldo ? ` Saldo pendiente: ${money(saldo)}.` : ""}`,
    Entregado: "¡Gracias por elegirnos! Esperamos que les encanten.",
    Cancelado: "",
  }[p.estado];
  return [saludo, detalle, saldo && p.estado !== "Listo" && p.estado !== "Cancelado" ? `Saldo pendiente: ${money(saldo)}.` : ""]
    .filter(Boolean)
    .join(" ");
};

const PESTANAS = [
  { id: "pedidos", texto: "Pedidos" },
  { id: "disenos", texto: "Diseños" },
  { id: "tipos", texto: "Tipos", resto: " de evento" },
  { id: "condiciones", texto: "Condiciones" },
];

/** Eventos en pestañas: los pedidos del día a día y, aparte, lo que arma el
    recorrido de la tienda (diseños, tipos y condiciones de pago). */
export default function Eventos() {
  const [pestana, setPestana] = useState("pedidos");
  return (
    <>
      <header className="cabecera-pagina">
        <div>
          <h1>Eventos</h1>
          <p>Recordatorios para matrimonios, baby showers y demás celebraciones.</p>
        </div>
      </header>

      <div className="pestanas" role="tablist" aria-label="Secciones de eventos">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            className={`pestanas__boton ${pestana === p.id ? "activo" : ""}`}
            onClick={() => setPestana(p.id)}
          >
            {p.texto}
            {p.resto && <span className="solo-escritorio">{p.resto}</span>}
          </button>
        ))}
      </div>

      {pestana === "pedidos" && <PedidosEventos />}
      {pestana === "disenos" && <DisenosEvento />}
      {pestana === "tipos" && <TiposEvento />}
      {pestana === "condiciones" && <CondicionesEventos />}
    </>
  );
}

function PedidosEventos() {
  const { pedidosEventos, configEventos, guardarPedidoEvento, eliminarPedidoEvento } = useDatos();
  const avisar = useAviso();

  const [filtro, setFiltro] = useState("activos");
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState(null);
  const [abono, setAbono] = useState({ monto: "", metodo: METODOS_PAGO[0], fecha: diaISO() });

  const visibles = useMemo(
    () =>
      pedidosEventos
        .filter((p) =>
          filtro === "todos" ? true : filtro === "activos" ? ESTADOS_EVENTO_ACTIVOS.includes(p.estado) : p.estado === filtro,
        )
        .sort(porEntrega),
    [pedidosEventos, filtro],
  );

  // Una cotización todavía no es deuda: cuenta desde que se confirma.
  const porCobrar = pedidosEventos
    .filter((p) => ESTADOS_EVENTO_ACTIVOS.includes(p.estado) && p.estado !== "Cotizado")
    .reduce((s, p) => s + saldoPedido(p), 0);

  const campo = (clave) => (e) => setForm((f) => ({ ...f, [clave]: e.target.value }));

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({ ...PEDIDO_EVENTO_VACIO, abonos: [] });
    setAbono({ monto: "", metodo: METODOS_PAGO[0], fecha: diaISO() });
  };

  const abrirEdicion = (p) => {
    setEditandoId(p.id);
    setForm({
      ...PEDIDO_EVENTO_VACIO,
      ...p,
      cantidad: String(p.cantidad ?? ""),
      precioUnitario: String(p.precioUnitario ?? ""),
      abonos: p.abonos || [],
    });
    setAbono({ monto: "", metodo: METODOS_PAGO[0], fecha: diaISO() });
  };

  /* ---------- Avisos del formulario ---------- */

  const sugerido = form ? precioPorCantidad(configEventos, form.cantidad) : 0;
  const total = form ? totalPedido(form) : 0;
  const saldo = form ? saldoPedido(form) : 0;
  const avisosForm = [];
  if (form) {
    const minimo = Number(configEventos.pedidoMinimo) || 0;
    if (minimo && form.cantidad && Number(form.cantidad) < minimo) {
      avisosForm.push(`El pedido mínimo es de ${num(minimo)} unidades.`);
    }
    const anticipacion = Number(configEventos.diasAnticipacion) || 0;
    const faltan = diasHasta(form.fechaEntrega);
    if (!editandoId && anticipacion && faltan !== null && faltan < anticipacion) {
      avisosForm.push(`La entrega queda a ${faltan} días; la anticipación pedida es de ${anticipacion}.`);
    }
    if (form.fechaEvento && form.fechaEntrega && form.fechaEntrega > form.fechaEvento) {
      avisosForm.push("La fecha de entrega es posterior a la del evento.");
    }
  }

  const agregarAbono = () => {
    const monto = Number(abono.monto) || 0;
    if (monto <= 0) return avisar("Escribe el monto del abono", "peligro");
    if (monto > saldo) return avisar(`El abono supera el saldo (${money(saldo)})`, "peligro");
    setForm((f) => ({ ...f, abonos: [...(f.abonos || []), { ...abono, monto }] }));
    setAbono({ monto: "", metodo: abono.metodo, fecha: diaISO() });
  };

  const quitarAbono = (i) => setForm((f) => ({ ...f, abonos: f.abonos.filter((_, j) => j !== i) }));

  const guardar = async (e) => {
    e?.preventDefault();
    if (!form.cliente.trim()) return avisar("El pedido necesita el nombre del cliente", "peligro");
    if (abonadoPedido(form) > totalPedido(form)) {
      return avisar("Los abonos superan el total del pedido", "peligro");
    }
    setGuardando(true);
    try {
      await guardarPedidoEvento(form, editandoId);
      avisar(editandoId ? "Pedido actualizado" : "Pedido creado", "exito");
      setForm(null);
      setEditandoId(null);
    } catch (err) {
      avisar(`No se pudo guardar: ${err.message}`, "peligro");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    try {
      await eliminarPedidoEvento(aBorrar.id);
      avisar("Pedido eliminado", "exito");
    } catch (err) {
      avisar(`No se pudo eliminar: ${err.message}`, "peligro");
    } finally {
      setABorrar(null);
    }
  };

  return (
    <>
      <div className="pestana-cabecera">
        <p>
          {pedidosEventos.filter((p) => ESTADOS_EVENTO_ACTIVOS.includes(p.estado)).length} pedidos activos ·{" "}
          {money(porCobrar)} por cobrar
        </p>
        <Boton icono="mas" onClick={abrirNuevo}>
          Nuevo pedido
        </Boton>
      </div>

      <div className="chips chips--fila" style={{ marginBottom: 20 }}>
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

      {visibles.length === 0 ? (
        <Tarjeta>
          <Vacio
            icono="corazon"
            titulo={pedidosEventos.length === 0 ? "Aún no hay pedidos de eventos" : "Nada con ese filtro"}
            texto={
              pedidosEventos.length === 0
                ? "Registra aquí los recordatorios para matrimonios, bautizos y demás: abonos, saldo y entrega."
                : "Prueba con otro estado."
            }
            accion={
              pedidosEventos.length === 0 ? (
                <Boton variante="suave" icono="mas" onClick={abrirNuevo}>
                  Nuevo pedido
                </Boton>
              ) : null
            }
          />
        </Tarjeta>
      ) : (
        <div className="pedidos">
          {visibles.map((p) => {
            const saldoP = saldoPedido(p);
            const d = diasHasta(p.fechaEntrega);
            const urgente = ESTADOS_EVENTO_ACTIVOS.includes(p.estado) && d !== null && d <= 3;
            const whatsapp = enlaceWhatsApp(p.telefono, mensajeCliente(p));
            return (
              <Tarjeta key={p.id} className="pedido">
                <div className="pedido__cabecera">
                  <div>
                    <p className="pedido__cliente">{p.cliente}</p>
                    <p className="pedido__meta">
                      {[p.tipoEvento, p.fechaEvento && `evento ${fechaCorta(p.fechaEvento)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Insignia tono={TONO_ESTADO[p.estado] || "neutra"}>{p.estado}</Insignia>
                </div>

                <p className={`pedido__entrega ${urgente ? "pedido__entrega--urgente" : ""}`}>
                  <Icono nombre="reloj" tam={14} />
                  {cuandoEntrega(p.fechaEntrega)}
                  {p.fechaEntrega && <span> · {fechaCorta(p.fechaEntrega)}</span>}
                </p>

                <dl className="pedido__cifras">
                  <div>
                    <dt>Cantidad</dt>
                    <dd>{num(p.cantidad)}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{money(totalPedido(p))}</dd>
                  </div>
                  <div>
                    <dt>Saldo</dt>
                    <dd className={saldoP ? "pedido__saldo" : ""}>{saldoP ? money(saldoP) : "Pagado"}</dd>
                  </div>
                </dl>

                <div className="pedido__acciones">
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noreferrer noopener" className="pedido__whatsapp">
                      <Icono nombre="whatsapp" tam={15} /> WhatsApp
                    </a>
                  )}
                  <Boton variante="fantasma" tamano="pequeno" icono="lapiz" onClick={() => abrirEdicion(p)}>
                    Editar
                  </Boton>
                  <Boton
                    variante="fantasma"
                    tamano="pequeno"
                    onClick={() => setABorrar(p)}
                    aria-label={`Eliminar pedido de ${p.cliente}`}
                  >
                    <Icono nombre="basura" tam={15} />
                  </Boton>
                </div>
              </Tarjeta>
            );
          })}
        </div>
      )}

      {form && (
        <Modal
          ancho
          titulo={editandoId ? "Editar pedido" : "Nuevo pedido"}
          alCerrar={() => setForm(null)}
          pie={
            <>
              <Boton variante="contorno" onClick={() => setForm(null)}>
                Cancelar
              </Boton>
              <Boton onClick={guardar} disabled={guardando} icono="chequeo">
                {guardando ? "Guardando..." : "Guardar"}
              </Boton>
            </>
          }
        >
          <form className="formulario" onSubmit={guardar}>
            <h3 className="formulario__bloque">Cliente y evento</h3>
            <Campo
              etiqueta="Cliente"
              placeholder="Ej.: Laura Gómez"
              value={form.cliente}
              onChange={campo("cliente")}
              required
            />
            <Campo
              etiqueta="Teléfono"
              placeholder="Ej.: 300 123 4567"
              inputMode="tel"
              value={form.telefono}
              onChange={campo("telefono")}
            />
            <Selector etiqueta="Tipo de evento" opciones={TIPOS_EVENTO} value={form.tipoEvento} onChange={campo("tipoEvento")} />
            <Selector etiqueta="Estado" opciones={ESTADOS_EVENTO} value={form.estado} onChange={campo("estado")} />
            <Campo etiqueta="Fecha del evento" type="date" value={form.fechaEvento} onChange={campo("fechaEvento")} />
            <Campo etiqueta="Fecha de entrega" type="date" value={form.fechaEntrega} onChange={campo("fechaEntrega")} />

            <h3 className="formulario__bloque">Recordatorio</h3>
            <Campo
              etiqueta="Cantidad"
              type="number"
              min="0"
              placeholder="Ej.: 50"
              value={form.cantidad}
              onChange={campo("cantidad")}
            />
            <Selector
              etiqueta="Aroma"
              opciones={["", ...AROMAS].map((a) => ({ id: a, etiqueta: a || "Sin definir" }))}
              value={form.aroma}
              onChange={campo("aroma")}
            />
            <Campo etiqueta="Tamaño" placeholder="Ej.: Mini 30 g" value={form.tamano} onChange={campo("tamano")} />
            <Campo
              etiqueta="Empaque"
              placeholder="Ej.: Bolsa de organza"
              list="empaques-evento"
              value={form.empaque}
              onChange={campo("empaque")}
            />
            <datalist id="empaques-evento">
              {(configEventos.empaques || []).map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
            <Campo
              etiqueta="Texto de la etiqueta"
              placeholder="Ej.: Gracias por acompañarnos · Ana y Luis"
              value={form.textoEtiqueta}
              onChange={campo("textoEtiqueta")}
            />
            <Campo etiqueta="Colores" placeholder="Ej.: Blanco y dorado" value={form.colores} onChange={campo("colores")} />

            <h3 className="formulario__bloque">Precio y pagos</h3>
            <Campo
              etiqueta="Precio unitario"
              type="number"
              min="0"
              placeholder={sugerido ? `Ej.: ${sugerido}` : "Ej.: 4500"}
              value={form.precioUnitario}
              onChange={campo("precioUnitario")}
              pista={
                sugerido && Number(form.precioUnitario) !== sugerido ? (
                  <button
                    type="button"
                    className="enlace-pista"
                    onClick={() => setForm((f) => ({ ...f, precioUnitario: String(sugerido) }))}
                  >
                    Usar {money(sugerido)} de tu tabla para {num(form.cantidad)} unidades
                  </button>
                ) : undefined
              }
            />
            <div className="campo">
              <span className="campo__etiqueta">Total</span>
              <p className="pedido__total">{money(total)}</p>
              <span className="campo__pista">Cantidad × precio unitario</span>
            </div>

            <div className="formulario__ancho campo">
              <span className="campo__etiqueta">Abonos</span>
              {(form.abonos || []).length > 0 && (
                <ul className="abonos">
                  {form.abonos.map((a, i) => (
                    <li key={i}>
                      <span>{fechaCorta(a.fecha)}</span>
                      <span>{a.metodo}</span>
                      <strong>{money(a.monto)}</strong>
                      <button type="button" onClick={() => quitarAbono(i)} aria-label="Quitar abono">
                        <Icono nombre="basura" tam={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {saldo > 0 && (
                <div className="abonos__nuevo">
                  <input
                    className="campo__control"
                    type="number"
                    min="0"
                    placeholder="Monto"
                    aria-label="Monto del abono"
                    value={abono.monto}
                    onChange={(e) => setAbono((a) => ({ ...a, monto: e.target.value }))}
                  />
                  <select
                    className="campo__control"
                    aria-label="Método de pago del abono"
                    value={abono.metodo}
                    onChange={(e) => setAbono((a) => ({ ...a, metodo: e.target.value }))}
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    className="campo__control"
                    type="date"
                    aria-label="Fecha del abono"
                    value={abono.fecha}
                    onChange={(e) => setAbono((a) => ({ ...a, fecha: e.target.value }))}
                  />
                  <Boton type="button" variante="contorno" tamano="pequeno" icono="mas" onClick={agregarAbono}>
                    Abonar
                  </Boton>
                </div>
              )}
              <p className="abonos__resumen">
                Abonado {money(abonadoPedido(form))} · <strong>Saldo {money(saldo)}</strong>
              </p>
            </div>

            <div className="formulario__ancho">
              <Area etiqueta="Notas" placeholder="Ej.: Entregar en el salón a las 3 p. m." value={form.notas} onChange={campo("notas")} />
            </div>

            {avisosForm.length > 0 && (
              <div className="formulario__ancho listo">
                <Icono nombre="alerta" tam={16} grosor={2.2} />
                <div>
                  {avisosForm.map((a) => (
                    <p key={a}>{a}</p>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {aBorrar && (
        <Modal
          titulo="Eliminar pedido"
          alCerrar={() => setABorrar(null)}
          pie={
            <>
              <Boton variante="contorno" onClick={() => setABorrar(null)}>
                Cancelar
              </Boton>
              <Boton variante="peligro" onClick={borrar} icono="basura">
                Eliminar
              </Boton>
            </>
          }
        >
          <p>
            Vas a eliminar el pedido de <strong>{aBorrar.cliente}</strong> con sus abonos. Esta acción no
            se puede deshacer. Si solo no se hizo, cámbialo a «Cancelado».
          </p>
        </Modal>
      )}
    </>
  );
}
