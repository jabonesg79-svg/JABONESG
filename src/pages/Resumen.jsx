import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../estado/contextos.js";
import {
  ESTADOS_EVENTO_ACTIVOS,
  diasHasta,
  estadoStock,
  fotosDe,
  ingresoLinea,
  saldoPedido,
  vigente,
} from "../lib/dominio.js";
import { diaISO, fechaCorta, fechaLarga, money, num } from "../lib/formato.js";
import { Boton, Icono, Insignia, Tarjeta, Vacio } from "../ui/index.jsx";
import "./panel.css";

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

const DIAS_GRAFICA = 30;

/** "AAAA-MM-DD" de los últimos `n` días, en hora local, del más viejo a hoy. */
const ultimosDias = (n) => {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) =>
    diaISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (n - 1 - i)).toISOString()),
  );
};

/** Barras de ventas por día: una sola serie, así que un solo color y sin
    leyenda; el título la nombra. Cada barra muestra su valor al pasar o tocar. */
function GraficaVentas({ dias }) {
  const [activo, setActivo] = useState(null);
  const maximo = Math.max(...dias.map((d) => d.total), 1);
  const ancho = 100 / dias.length;
  const marcado = activo ?? dias.length - 1;
  const d = dias[marcado];
  return (
    <div className="grafica">
      <p className="grafica__lectura" aria-live="polite">
        <strong>{money(d.total)}</strong> el {fechaCorta(d.dia)}
        {activo === null ? " (hoy)" : ""}
      </p>
      <svg
        className="grafica__lienzo"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Ventas por día, últimos ${dias.length} días. Máximo ${money(maximo)}.`}
        onMouseLeave={() => setActivo(null)}
      >
        <line x1="0" y1="40" x2="100" y2="40" className="grafica__base" />
        {dias.map((x, i) => {
          const alto = x.total ? Math.max((x.total / maximo) * 38, 0.8) : 0;
          return (
            <g key={x.dia} onMouseEnter={() => setActivo(i)} onClick={() => setActivo(i)}>
              {/* Zona de toque más grande que la barra */}
              <rect x={i * ancho} y="0" width={ancho} height="40" fill="transparent" />
              {alto > 0 && (
                <rect
                  x={i * ancho + ancho * 0.15}
                  y={40 - alto}
                  width={ancho * 0.7}
                  height={alto}
                  rx="0.6"
                  className={`grafica__barra ${i === marcado ? "activa" : ""}`}
                />
              )}
              <title>{`${fechaCorta(x.dia)}: ${money(x.total)}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="grafica__eje">
        <span>{fechaCorta(dias[0].dia)}</span>
        <span>hoy</span>
      </div>
      {/* La misma información como tabla, para lectores de pantalla. */}
      <table className="sr-solo">
        <caption>Ventas por día</caption>
        <tbody>
          {dias.map((x) => (
            <tr key={x.dia}>
              <th>{fechaCorta(x.dia)}</th>
              <td>{money(x.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Resumen() {
  const { productos, ventas, facturas, pedidosEventos = [] } = useDatos();

  const hoy = diaISO();
  const mes = hoy.slice(0, 7);
  const vigentes = useMemo(() => ventas.filter(vigente), [ventas]);

  const metricas = useMemo(() => {
    const deHoy = vigentes.filter((v) => diaISO(v.fecha) === hoy);
    const delMes = vigentes.filter((v) => diaISO(v.fecha).slice(0, 7) === mes);
    const ingreso = (lista) => lista.reduce((s, v) => s + ingresoLinea(v), 0);
    const costo = (lista) =>
      lista.reduce((s, v) => s + (Number(v.costoProduccion) || 0) * (Number(v.cantidad) || 0), 0);
    const ingresoMes = ingreso(delMes);
    const gananciaMes = ingresoMes - costo(delMes);
    return {
      ventasHoy: ingreso(deHoy),
      barrasHoy: deHoy.reduce((s, v) => s + (Number(v.cantidad) || 0), 0),
      ingresoMes,
      gananciaMes,
      margenMes: ingresoMes ? Math.round((gananciaMes / ingresoMes) * 100) : 0,
      enStock: productos.reduce((s, p) => s + Math.max(0, Number(p.stock) || 0), 0),
      valorVenta: productos.reduce(
        (s, p) => s + Math.max(0, Number(p.stock) || 0) * (Number(p.precioVenta) || 0),
        0,
      ),
    };
  }, [vigentes, productos, hoy, mes]);

  const dias = useMemo(() => {
    const porDia = new Map();
    for (const v of vigentes) {
      const dia = diaISO(v.fecha);
      porDia.set(dia, (porDia.get(dia) || 0) + ingresoLinea(v));
    }
    return ultimosDias(DIAS_GRAFICA).map((dia) => ({ dia, total: porDia.get(dia) || 0 }));
  }, [vigentes]);
  const total30 = dias.reduce((s, d) => s + d.total, 0);

  const masVendidos = useMemo(() => {
    const acumulado = new Map();
    for (const v of vigentes) {
      const clave = v.nombre || v.codigo || "Sin nombre";
      const previo = acumulado.get(clave) || { nombre: clave, unidades: 0, ingreso: 0 };
      previo.unidades += Number(v.cantidad) || 0;
      previo.ingreso += ingresoLinea(v);
      acumulado.set(clave, previo);
    }
    return [...acumulado.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5);
  }, [vigentes]);
  const topUnidades = masVendidos[0]?.unidades || 1;

  const creditosAbiertos = facturas.filter((f) => vigente(f) && f.estadoCredito === "abierto");

  const entregas = useMemo(
    () =>
      pedidosEventos
        .filter((p) => ESTADOS_EVENTO_ACTIVOS.includes(p.estado) && p.estado !== "Cotizado")
        .sort((a, b) => (a.fechaEntrega || "9999").localeCompare(b.fechaEntrega || "9999")),
    [pedidosEventos],
  );
  const saldosEventos = entregas.reduce((s, p) => s + saldoPedido(p), 0);

  const tareas = useMemo(() => {
    const publicados = productos.filter((p) => p.publicado !== false);
    return [
      {
        clave: "sin-foto",
        titulo: "Sin foto en la tienda",
        lista: publicados.filter((p) => fotosDe(p).length === 0),
        tono: "caramelo",
      },
      { clave: "agotados", titulo: "Agotados", lista: productos.filter((p) => estadoStock(p) === "agotado"), tono: "peligro" },
      { clave: "reponer", titulo: "Por reponer", lista: productos.filter((p) => estadoStock(p) === "bajo"), tono: "caramelo" },
    ].filter((t) => t.lista.length > 0);
  }, [productos]);

  return (
    <>
      <header className="cabecera-pagina">
        <div>
          <h1>{saludo()}</h1>
          <p className="resumen__fecha">{fechaLarga(new Date().toISOString())}</p>
        </div>
        <div className="cabecera-pagina__acciones">
          <Link to="/panel/ventas">
            <Boton variante="acento" icono="ventas">
              Registrar venta
            </Boton>
          </Link>
        </div>
      </header>

      <div className="metricas">
        <Tarjeta className="metrica metrica--acento">
          <div className="metrica__icono">
            <Icono nombre="ventas" tam={18} />
          </div>
          <p className="metrica__etiqueta">Vendido hoy</p>
          <p className="metrica__valor">{money(metricas.ventasHoy)}</p>
          <p className="metrica__nota">{num(metricas.barrasHoy)} unidades</p>
        </Tarjeta>

        <Tarjeta className="metrica">
          <div className="metrica__icono">
            <Icono nombre="grafico" tam={18} />
          </div>
          <p className="metrica__etiqueta">Ingresos del mes</p>
          <p className="metrica__valor">{money(metricas.ingresoMes)}</p>
          <p className="metrica__nota">
            Ganancia {money(metricas.gananciaMes)} · margen {metricas.margenMes}%
          </p>
        </Tarjeta>

        <Tarjeta className="metrica">
          <div className="metrica__icono">
            <Icono nombre="inventario" tam={18} />
          </div>
          <p className="metrica__etiqueta">Inventario</p>
          <p className="metrica__valor">{money(metricas.valorVenta)}</p>
          <p className="metrica__nota">
            a precio de venta · {num(metricas.enStock)} unidades
          </p>
        </Tarjeta>

        <Tarjeta className="metrica">
          <div className="metrica__icono">
            <Icono nombre="facturas" tam={18} />
          </div>
          <p className="metrica__etiqueta">Por cobrar</p>
          <p className="metrica__valor">
            {money(creditosAbiertos.reduce((s, f) => s + (Number(f.total) || 0), 0) + saldosEventos)}
          </p>
          <p className="metrica__nota">
            {creditosAbiertos.length} créditos · {money(saldosEventos)} de eventos
          </p>
        </Tarjeta>
      </div>

      <div className="panel-rejilla">
        <Tarjeta className="bloque">
          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Ventas, últimos {DIAS_GRAFICA} días</h2>
            <Insignia tono="beige">{money(total30)}</Insignia>
          </div>
          <div className="bloque__cuerpo--aire">
            {total30 === 0 ? (
              <Vacio
                icono="grafico"
                titulo="Sin ventas en estos días"
                texto="Cuando registres ventas, aquí verás cómo se mueven día a día."
              />
            ) : (
              <GraficaVentas dias={dias} />
            )}
          </div>
        </Tarjeta>

        <Tarjeta className="bloque">
          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Próximas entregas</h2>
            <Link to="/panel/eventos">
              <Boton variante="fantasma" tamano="pequeno">
                Eventos
              </Boton>
            </Link>
          </div>
          <div className="bloque__cuerpo">
            {entregas.length === 0 ? (
              <Vacio icono="regalo" titulo="Sin entregas pendientes" texto="Los pedidos confirmados aparecen aquí." />
            ) : (
              <div className="lista-simple">
                {entregas.slice(0, 5).map((p) => {
                  const d = diasHasta(p.fechaEntrega);
                  return (
                    <div key={p.id} className="lista-simple__fila">
                      <div style={{ minWidth: 0 }}>
                        <p className="lista-simple__nombre">{p.cliente}</p>
                        <p className={`lista-simple__meta ${d !== null && d <= 3 ? "texto-urgente" : ""}`}>
                          {p.fechaEntrega
                            ? `${fechaCorta(p.fechaEntrega)} · ${d === 0 ? "hoy" : d === 1 ? "mañana" : d < 0 ? `vencida hace ${-d} d` : `en ${d} días`}`
                            : "Sin fecha de entrega"}{" "}
                          · {p.estado}
                        </p>
                      </div>
                      <span className="lista-simple__valor">
                        {saldoPedido(p) ? (
                          <Insignia tono="caramelo">Saldo {money(saldoPedido(p))}</Insignia>
                        ) : (
                          <Insignia tono="salvia">Pagado</Insignia>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Tarjeta>

        <Tarjeta className="bloque">
          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Los que más salen</h2>
            <Insignia tono="beige">Histórico</Insignia>
          </div>
          <div className="bloque__cuerpo">
            {masVendidos.length === 0 ? (
              <Vacio
                icono="grafico"
                titulo="Aún no hay ventas"
                texto="Cuando registres la primera venta, aquí verás qué jabones se mueven más."
              />
            ) : (
              <div className="lista-simple">
                {masVendidos.map((m) => (
                  <div key={m.nombre} className="lista-simple__fila">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="lista-simple__nombre">{m.nombre}</p>
                      <div className="barra-progreso" style={{ marginTop: 7 }}>
                        <span style={{ width: `${(m.unidades / topUnidades) * 100}%` }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="lista-simple__valor">{num(m.unidades)} u.</p>
                      <p className="lista-simple__meta">{money(m.ingreso)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tarjeta>

        <Tarjeta className="bloque">
          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Tareas pendientes</h2>
            <Link to="/panel/inventario">
              <Boton variante="fantasma" tamano="pequeno">
                Inventario
              </Boton>
            </Link>
          </div>
          <div className="bloque__cuerpo">
            {tareas.length === 0 ? (
              <Vacio icono="chequeo" titulo="Todo en orden" texto="Ningún jabón sin foto, agotado o por reponer." />
            ) : (
              <div className="lista-simple">
                {tareas.map((t) => (
                  <div key={t.clave} className="lista-simple__fila">
                    <div style={{ minWidth: 0 }}>
                      <p className="lista-simple__nombre">{t.titulo}</p>
                      <p className="lista-simple__meta">
                        {t.lista.slice(0, 3).map((p) => p.nombre).join(" · ")}
                        {t.lista.length > 3 ? ` y ${t.lista.length - 3} más` : ""}
                      </p>
                    </div>
                    <span className="lista-simple__valor">
                      <Insignia tono={t.tono}>{t.lista.length}</Insignia>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tarjeta>
      </div>
    </>
  );
}
