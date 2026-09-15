import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../estado/contextos.js";
import { estadoStock } from "../lib/dominio.js";
import { diaISO, fechaLarga, money, num } from "../lib/formato.js";
import { Boton, Icono, Insignia, Tarjeta, Vacio } from "../ui/index.jsx";
import "./panel.css";

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

export default function Resumen() {
  const { productos, ventas, facturas } = useDatos();

  const hoy = diaISO();
  const mes = hoy.slice(0, 7);

  const metricas = useMemo(() => {
    const deHoy = ventas.filter((v) => diaISO(v.fecha) === hoy);
    const delMes = ventas.filter((v) => String(v.fecha).slice(0, 7) === mes);

    const ingreso = (lista) =>
      lista.reduce((s, v) => s + (Number(v.precioVenta) || 0) * (Number(v.cantidad) || 0), 0);
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
      enStock: productos.reduce((s, p) => s + (Number(p.stock) || 0), 0),
      valorInventario: productos.reduce(
        (s, p) => s + (Number(p.stock) || 0) * (Number(p.costoProduccion) || 0),
        0,
      ),
    };
  }, [ventas, productos, hoy, mes]);

  const porAgotarse = useMemo(
    () => productos.filter((p) => estadoStock(p) !== "ok").slice(0, 6),
    [productos],
  );

  const masVendidos = useMemo(() => {
    const acumulado = new Map();
    for (const v of ventas) {
      const clave = v.nombre || v.codigo || "Sin nombre";
      const previo = acumulado.get(clave) || { nombre: clave, unidades: 0, ingreso: 0 };
      previo.unidades += Number(v.cantidad) || 0;
      previo.ingreso += (Number(v.precioVenta) || 0) * (Number(v.cantidad) || 0);
      acumulado.set(clave, previo);
    }
    return [...acumulado.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5);
  }, [ventas]);

  const creditosAbiertos = facturas.filter((f) => f.estadoCredito === "abierto");
  const topUnidades = masVendidos[0]?.unidades || 1;

  return (
    <>
      <header className="cabecera-pagina">
        <div>
          <h1>
            {saludo()} <span className="script" style={{ fontSize: 34 }}>hoy es</span>
          </h1>
          <p style={{ textTransform: "capitalize" }}>{fechaLarga(new Date().toISOString())}</p>
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
          <p className="metrica__etiqueta">Jabones en stock</p>
          <p className="metrica__valor">{num(metricas.enStock)}</p>
          <p className="metrica__nota">
            {productos.length} productos · {money(metricas.valorInventario)} en costo
          </p>
        </Tarjeta>

        <Tarjeta className="metrica">
          <div className="metrica__icono">
            <Icono nombre="facturas" tam={18} />
          </div>
          <p className="metrica__etiqueta">Créditos abiertos</p>
          <p className="metrica__valor">{creditosAbiertos.length}</p>
          <p className="metrica__nota">
            {money(creditosAbiertos.reduce((s, f) => s + (Number(f.total) || 0), 0))} por cobrar
          </p>
        </Tarjeta>
      </div>

      <div className="panel-rejilla">
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
            <h2 className="bloque__titulo">Hay que reponer</h2>
            <Link to="/panel/inventario">
              <Boton variante="fantasma" tamano="pequeno">
                Ver todo
              </Boton>
            </Link>
          </div>
          <div className="bloque__cuerpo">
            {porAgotarse.length === 0 ? (
              <Vacio
                icono="chequeo"
                titulo="Todo en orden"
                texto="Ningún producto está por debajo de su mínimo."
              />
            ) : (
              <div className="lista-simple">
                {porAgotarse.map((p) => (
                  <div key={p.id} className="lista-simple__fila">
                    <div>
                      <p className="lista-simple__nombre">{p.nombre}</p>
                      <p className="lista-simple__meta">
                        {p.linea} · mínimo {p.stockMinimo || 0}
                      </p>
                    </div>
                    <span className="lista-simple__valor">
                      <Insignia tono={estadoStock(p) === "agotado" ? "peligro" : "caramelo"}>
                        {Number(p.stock) || 0} u.
                      </Insignia>
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
