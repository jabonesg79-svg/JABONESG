import { useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import {
  AROMAS,
  LINEAS,
  PRESENTACIONES,
  PRODUCTO_VACIO,
  estadoStock,
} from "../lib/dominio.js";
import { fechaCorta, margen, money, num, slug } from "../lib/formato.js";
import {
  Area,
  Boton,
  Buscador,
  Campo,
  Icono,
  Insignia,
  Modal,
  Selector,
  Tarjeta,
  Vacio
} from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import "./panel.css";

const FILTROS = [
  { id: "todos", texto: "Todos" },
  { id: "bajo", texto: "Por reponer" },
  { id: "agotado", texto: "Agotados" },
  { id: "oculto", texto: "Sin publicar" },
];

/** Quita los campos que gestiona la capa de datos, no el formulario. */
const sinMetadatos = (form) => {
  const copia = { ...form };
  delete copia.id;
  delete copia.creado;
  delete copia.actualizado;
  return copia;
};

/** Los números llegan del formulario como texto; Firestore debe recibirlos como números. */
const aDocumento = (form) => ({
  ...form,
  nombre: form.nombre.trim(),
  codigo: (form.codigo || slug(form.nombre).slice(0, 14)).trim(),
  pesoGramos: Number(form.pesoGramos) || 0,
  costoProduccion: Number(form.costoProduccion) || 0,
  precioVenta: Number(form.precioVenta) || 0,
  stock: Number(form.stock) || 0,
  stockMinimo: Number(form.stockMinimo) || 0,
});

export default function Inventario() {
  const { productos, guardarProducto, eliminarProducto } = useDatos();
  const avisar = useAviso();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState(null);

  const campo = (clave) => (e) => setForm((f) => ({ ...f, [clave]: e.target.value }));

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({ ...PRODUCTO_VACIO });
  };

  const abrirEdicion = (p) => {
    setEditandoId(p.id);
    setForm({
      ...PRODUCTO_VACIO,
      ...p,
      pesoGramos: String(p.pesoGramos ?? ""),
      costoProduccion: String(p.costoProduccion ?? ""),
      precioVenta: String(p.precioVenta ?? ""),
      stock: String(p.stock ?? ""),
      stockMinimo: String(p.stockMinimo ?? ""),
    });
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return avisar("El jabón necesita un nombre", "peligro");
    setGuardando(true);
    try {
      await guardarProducto(aDocumento(sinMetadatos(form)), editandoId);
      avisar(editandoId ? "Producto actualizado" : "Producto agregado al inventario", "exito");
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
      await eliminarProducto(aBorrar.id);
      avisar("Producto eliminado", "exito");
    } catch (err) {
      avisar(`No se pudo eliminar: ${err.message}`, "peligro");
    } finally {
      setABorrar(null);
    }
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos
      .filter((p) => {
        if (filtro === "bajo") return estadoStock(p) === "bajo";
        if (filtro === "agotado") return estadoStock(p) === "agotado";
        if (filtro === "oculto") return p.publicado === false;
        return true;
      })
      .filter((p) =>
        !q
          ? true
          : [p.nombre, p.codigo, p.linea, p.aroma, p.lote]
              .filter(Boolean)
              .some((c) => String(c).toLowerCase().includes(q)),
      );
  }, [productos, busqueda, filtro]);

  return (
    <>
      <header className="cabecera-pagina">
        <div>
          <h1>Inventario</h1>
          <p>
            {productos.length} productos · {num(productos.reduce((s, p) => s + (Number(p.stock) || 0), 0))}{" "}
            unidades en total
          </p>
        </div>
        <div className="cabecera-pagina__acciones">
          <Boton icono="mas" onClick={abrirNuevo}>
            Nuevo jabón
          </Boton>
        </div>
      </header>

      <div className="herramientas">
        <div className="herramientas__buscador">
          <Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar por nombre, código o lote..." />
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

      <Tarjeta className="bloque">
        {visibles.length === 0 ? (
          <Vacio
            icono="caja"
            titulo={productos.length === 0 ? "El inventario está vacío" : "Nada con ese filtro"}
            texto={
              productos.length === 0
                ? "Agrega tu primer jabón para empezar a llevar el control de lotes y stock."
                : "Prueba con otra búsqueda o quita el filtro."
            }
            accion={
              productos.length === 0 ? (
                <Boton variante="suave" icono="mas" onClick={abrirNuevo}>
                  Agregar jabón
                </Boton>
              ) : null
            }
          />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Lote</th>
                  <th className="num">Stock</th>
                  <th className="num">Costo</th>
                  <th className="num">Precio</th>
                  <th className="num">Margen</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const estado = estadoStock(p);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="producto-celda">
                          <div className="producto-celda__foto">
                            {p.imagen ? (
                              <img src={p.imagen} alt="" />
                            ) : (
                              <Icono nombre="gota" tam={20} grosor={1.3} />
                            )}
                          </div>
                          <div>
                            <p className="producto-celda__nombre">{p.nombre}</p>
                            <p className="producto-celda__meta">
                              {[p.codigo, p.linea, p.aroma].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p style={{ fontSize: 13.5 }}>{p.lote || "—"}</p>
                        <p className="producto-celda__meta">{fechaCorta(p.fechaElaboracion)}</p>
                      </td>
                      <td className="num">
                        <strong>{num(p.stock)}</strong>
                        <p className="producto-celda__meta">mín. {num(p.stockMinimo)}</p>
                      </td>
                      <td className="num">{money(p.costoProduccion)}</td>
                      <td className="num">{money(p.precioVenta)}</td>
                      <td className="num">{margen(p.precioVenta, p.costoProduccion)}%</td>
                      <td>
                        {estado === "agotado" ? (
                          <Insignia tono="peligro">Agotado</Insignia>
                        ) : estado === "bajo" ? (
                          <Insignia tono="caramelo">Por reponer</Insignia>
                        ) : p.publicado === false ? (
                          <Insignia tono="beige">Sin publicar</Insignia>
                        ) : (
                          <Insignia tono="salvia">En catálogo</Insignia>
                        )}
                      </td>
                      <td>
                        <div className="acciones-fila">
                          <Boton
                            variante="fantasma"
                            tamano="pequeno"
                            onClick={() => abrirEdicion(p)}
                            aria-label={`Editar ${p.nombre}`}
                          >
                            <Icono nombre="lapiz" tam={15} />
                          </Boton>
                          <Boton
                            variante="fantasma"
                            tamano="pequeno"
                            onClick={() => setABorrar(p)}
                            aria-label={`Eliminar ${p.nombre}`}
                          >
                            <Icono nombre="basura" tam={15} />
                          </Boton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {form && (
        <Modal
          ancho
          titulo={editandoId ? "Editar jabón" : "Nuevo jabón"}
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
            <div className="formulario__ancho">
              <Campo
                etiqueta="Nombre"
                placeholder="Jabón de avena y miel"
                value={form.nombre}
                onChange={campo("nombre")}
                required
              />
            </div>

            <Campo
              etiqueta="Código"
              placeholder="Se genera solo si lo dejas vacío"
              value={form.codigo}
              onChange={campo("codigo")}
            />
            <Selector etiqueta="Línea" opciones={LINEAS} value={form.linea} onChange={campo("linea")} />
            <Selector etiqueta="Aroma" opciones={AROMAS} value={form.aroma} onChange={campo("aroma")} />
            <Selector
              etiqueta="Presentación"
              opciones={PRESENTACIONES}
              value={form.presentacion}
              onChange={campo("presentacion")}
            />

            <Campo
              etiqueta="Peso (gramos)"
              type="number"
              min="0"
              placeholder="100"
              value={form.pesoGramos}
              onChange={campo("pesoGramos")}
            />
            <Campo etiqueta="Lote" placeholder="L-2026-04" value={form.lote} onChange={campo("lote")} />

            <Campo
              etiqueta="Fecha de elaboración"
              type="date"
              value={form.fechaElaboracion}
              onChange={campo("fechaElaboracion")}
            />
            <Campo
              etiqueta="Imagen (URL)"
              placeholder="https://..."
              value={form.imagen}
              onChange={campo("imagen")}
            />

            <Campo
              etiqueta="Costo de producción"
              type="number"
              min="0"
              value={form.costoProduccion}
              onChange={campo("costoProduccion")}
            />
            <Campo
              etiqueta="Precio de venta"
              type="number"
              min="0"
              value={form.precioVenta}
              onChange={campo("precioVenta")}
              pista={
                form.precioVenta && form.costoProduccion
                  ? `Margen ${margen(form.precioVenta, form.costoProduccion)}%`
                  : undefined
              }
            />

            <Campo
              etiqueta="Stock actual"
              type="number"
              min="0"
              value={form.stock}
              onChange={campo("stock")}
            />
            <Campo
              etiqueta="Stock mínimo"
              type="number"
              min="0"
              value={form.stockMinimo}
              onChange={campo("stockMinimo")}
              pista="Por debajo de este número aparece en «hay que reponer»"
            />

            <div className="formulario__ancho">
              <Area
                etiqueta="Descripción para la tienda"
                placeholder="Barra de glicerina con avena molida y miel. Hidrata y exfolia suave."
                value={form.descripcion}
                onChange={campo("descripcion")}
              />
            </div>

            <div className="formulario__ancho">
              <Area
                etiqueta="Ingredientes"
                placeholder="Base de glicerina, avena, miel, aceite de almendras..."
                value={form.ingredientes}
                onChange={campo("ingredientes")}
              />
            </div>

            <div className="formulario__ancho">
              <label className="interruptor">
                <input
                  type="checkbox"
                  checked={form.publicado !== false}
                  onChange={(e) => setForm((f) => ({ ...f, publicado: e.target.checked }))}
                />
                <span>Mostrar en el catálogo público</span>
              </label>
            </div>
          </form>
        </Modal>
      )}

      {aBorrar && (
        <Modal
          titulo="Eliminar producto"
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
            Vas a eliminar <strong>{aBorrar.nombre}</strong> del inventario. Las ventas ya
            registradas se conservan, pero el producto desaparece del catálogo y del punto de venta.
          </p>
          <p style={{ marginTop: 12, color: "var(--taupe)", fontSize: 13.5 }}>
            Esta acción no se puede deshacer. Si solo quieres ocultarlo de la tienda, edítalo y
            desactiva «Mostrar en el catálogo público».
          </p>
        </Modal>
      )}
    </>
  );
}
