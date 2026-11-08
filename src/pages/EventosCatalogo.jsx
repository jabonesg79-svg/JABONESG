import { useRef, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import { borrarFotos, guardarFoto, leerFoto, nuevoIdDiseno } from "../lib/datos.js";
import {
  AROMAS,
  CONFIG_EVENTOS_POR_DEFECTO,
  DISENO_VACIO,
  ESTADOS_TIPO_EVENTO,
  PRESENTACIONES_EVENTO,
  TEXTO_PEDIDO_PEQUENO,
  TIPOS_EVENTO,
  TIPO_EVENTO_VACIO,
  desdeDiseno,
  esUrlFoto,
  textoAnticipo,
} from "../lib/dominio.js";
import { money } from "../lib/formato.js";
import { PESO_MAXIMO_FOTO, prepararFoto, validarImagen } from "../lib/imagenes.js";
import { Area, Boton, Campo, Icono, Insignia, Modal, Tarjeta, Vacio } from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import EditorFotos from "./EditorFotos.jsx";

/* Tipos de evento, diseños y condiciones de pago: lo que arma el recorrido de
   cotización de la tienda. */

/**
 * Mueve un elemento una posición y guarda el nuevo `orden` solo de los que
 * cambiaron. Si varios comparten orden (recién creados), se renumeran todos.
 */
async function reordenar(lista, indice, paso, guardarOrden) {
  const destino = indice + paso;
  if (destino < 0 || destino >= lista.length) return;
  const copia = [...lista];
  const [item] = copia.splice(indice, 1);
  copia.splice(destino, 0, item);
  await Promise.all(
    copia.map((x, i) => (Number(x.orden) === i ? null : guardarOrden(x, i))).filter(Boolean),
  );
}

/** Botones ↑ ↓ para ordenar en la tienda. */
function Ordenar({ indice, total, alMover, nombre }) {
  return (
    <span className="ordenar">
      <button type="button" disabled={indice === 0} onClick={() => alMover(-1)} aria-label={`Subir ${nombre}`}>
        <Icono nombre="flecha" tam={14} style={{ transform: "rotate(-90deg)" }} />
      </button>
      <button
        type="button"
        disabled={indice === total - 1}
        onClick={() => alMover(1)}
        aria-label={`Bajar ${nombre}`}
      >
        <Icono nombre="flecha" tam={14} style={{ transform: "rotate(90deg)" }} />
      </button>
    </span>
  );
}

/** Lista de tramos "desde N unidades a $P". */
function Tramos({ tramos, alCambiar, etiqueta }) {
  const cambiar = (i, clave) => (e) =>
    alCambiar(tramos.map((t, j) => (j === i ? { ...t, [clave]: e.target.value } : t)));
  return (
    <div className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      {tramos.length === 0 && <p className="campo__pista">Sin precios todavía.</p>}
      {tramos.map((t, i) => (
        <div key={i} className="tramo">
          <span>Desde</span>
          <input
            className="campo__control"
            type="number"
            min="1"
            inputMode="numeric"
            placeholder={i === 0 ? "Ej.: 1" : "Ej.: 50"}
            aria-label="Desde cuántas unidades"
            value={t.desde}
            onChange={cambiar(i, "desde")}
          />
          <span>unid. a</span>
          <input
            className="campo__control"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={i === 0 ? "Ej.: 6000" : "Ej.: 5000"}
            aria-label="Precio por unidad"
            value={t.precio}
            onChange={cambiar(i, "precio")}
          />
          <button type="button" onClick={() => alCambiar(tramos.filter((_, j) => j !== i))} aria-label="Quitar tramo">
            <Icono nombre="basura" tam={14} />
          </button>
        </div>
      ))}
      <Boton
        type="button"
        variante="contorno"
        tamano="pequeno"
        icono="mas"
        style={{ alignSelf: "flex-start" }}
        onClick={() => alCambiar([...tramos, { desde: tramos.length ? "" : "1", precio: "" }])}
      >
        Agregar tramo
      </Boton>
    </div>
  );
}

/* ====================================================================== */
/* Tipos de evento                                                        */
/* ====================================================================== */

export function TiposEvento() {
  const { tiposEvento, disenos, guardarTipoEvento, eliminarTipoEvento, actualizarDiseno } = useDatos();
  const avisar = useAviso();
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const entrada = useRef(null);

  const disenosActivos = (tipoId) => disenos.filter((d) => d.activo !== false && d.tipos?.includes(tipoId)).length;
  const usadoPor = (tipoId) => disenos.filter((d) => d.tipos?.includes(tipoId));

  const cargarSugeridos = async () => {
    setGuardando(true);
    try {
      const sugeridos = TIPOS_EVENTO.filter((t) => t !== "Otro");
      for (const [i, nombre] of sugeridos.entries()) {
        // Por ahora solo Baby shower tiene diseños; los demás esperan.
        await guardarTipoEvento({ nombre, foto: "", estado: nombre === "Baby shower" ? "activo" : "proximamente", orden: i });
      }
      avisar("Tipos de evento creados", "exito");
    } catch (err) {
      avisar(`No se pudieron crear: ${err.message}`, "peligro");
    } finally {
      setGuardando(false);
    }
  };

  const elegirFoto = async (archivo) => {
    if (!archivo) return;
    const problema = validarImagen(archivo, PESO_MAXIMO_FOTO);
    if (problema) return avisar(problema, "peligro");
    setProcesandoFoto(true);
    try {
      // Una sola foto, en el mismo documento: la miniatura de 600 px basta
      // para la tarjeta del tipo.
      const r = await prepararFoto(archivo);
      setForm((f) => ({ ...f, foto: r.miniatura.dataUrl }));
    } catch (err) {
      avisar(`No se pudo usar la foto: ${err.message}`, "peligro");
    } finally {
      setProcesandoFoto(false);
    }
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return avisar("El tipo de evento necesita un nombre", "peligro");
    setGuardando(true);
    try {
      await guardarTipoEvento(
        { ...form, orden: editandoId ? form.orden : tiposEvento.length },
        editandoId,
      );
      avisar(editandoId ? "Tipo actualizado" : "Tipo creado", "exito");
      setForm(null);
    } catch (err) {
      avisar(`No se pudo guardar: ${err.message}`, "peligro");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    try {
      // Los diseños que lo usaban lo pierden; no quedan apuntando a nada.
      for (const d of usadoPor(aBorrar.id)) {
        await actualizarDiseno(d.id, { tipos: d.tipos.filter((t) => t !== aBorrar.id) });
      }
      await eliminarTipoEvento(aBorrar.id);
      avisar("Tipo eliminado", "exito");
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
          Se elige en el primer paso del recorrido. Solo se puede elegir si tiene al menos un diseño
          activo; si no, la tienda lo muestra como «Próximamente · escríbenos».
        </p>
        <Boton
          icono="mas"
          onClick={() => {
            setEditandoId(null);
            setForm({ ...TIPO_EVENTO_VACIO });
          }}
        >
          Nuevo tipo
        </Boton>
      </div>

      {tiposEvento.length === 0 ? (
        <Tarjeta>
          <Vacio
            icono="regalo"
            titulo="Todavía no hay tipos de evento"
            texto="Puedes crear los habituales de una vez (Baby shower activo y los demás como «Próximamente») y ajustarlos después."
            accion={
              <Boton variante="suave" icono="mas" onClick={cargarSugeridos} disabled={guardando}>
                {guardando ? "Creando..." : "Crear los tipos habituales"}
              </Boton>
            }
          />
        </Tarjeta>
      ) : (
        <ul className="catalogo-eventos">
          {tiposEvento.map((t, i) => {
            const activos = disenosActivos(t.id);
            const sinDisenos = t.estado !== "proximamente" && activos === 0;
            return (
              <li key={t.id} className="catalogo-eventos__item">
                <span className="catalogo-eventos__foto">
                  {t.foto ? <img src={t.foto} alt="" /> : <Icono nombre="regalo" tam={22} />}
                </span>
                <div className="catalogo-eventos__texto">
                  <p className="catalogo-eventos__nombre">{t.nombre}</p>
                  <p className="producto-celda__meta">
                    {activos} {activos === 1 ? "diseño activo" : "diseños activos"}
                  </p>
                  {sinDisenos && (
                    <p className="producto-celda__falta">Sin diseños activos: en la tienda se verá como «Próximamente».</p>
                  )}
                </div>
                <Insignia tono={t.estado === "proximamente" ? "beige" : "salvia"}>
                  {ESTADOS_TIPO_EVENTO[t.estado] || "Activo"}
                </Insignia>
                <div className="catalogo-eventos__acciones">
                  <Ordenar
                    indice={i}
                    total={tiposEvento.length}
                    nombre={t.nombre}
                    alMover={(paso) =>
                      reordenar(tiposEvento, i, paso, (x, orden) => guardarTipoEvento({ ...x, orden }, x.id)).catch((err) =>
                        avisar(`No se pudo ordenar: ${err.message}`, "peligro"),
                      )
                    }
                  />
                  <Boton
                    variante="fantasma"
                    tamano="pequeno"
                    icono="lapiz"
                    onClick={() => {
                      setEditandoId(t.id);
                      setForm({ ...TIPO_EVENTO_VACIO, ...t });
                    }}
                  >
                    Editar
                  </Boton>
                  <Boton variante="fantasma" tamano="pequeno" onClick={() => setABorrar(t)} aria-label={`Eliminar ${t.nombre}`}>
                    <Icono nombre="basura" tam={15} />
                  </Boton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {form && (
        <Modal
          titulo={editandoId ? "Editar tipo de evento" : "Nuevo tipo de evento"}
          alCerrar={() => setForm(null)}
          pie={
            <>
              <Boton variante="contorno" onClick={() => setForm(null)}>
                Cancelar
              </Boton>
              <Boton onClick={guardar} disabled={guardando || procesandoFoto} icono="chequeo">
                {guardando ? "Guardando..." : "Guardar"}
              </Boton>
            </>
          }
        >
          <div className="portada__campos">
            <Campo
              etiqueta="Nombre"
              placeholder="Ej.: Baby shower"
              maxLength={40}
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
            <div className="campo">
              <span className="campo__etiqueta">Foto de la tarjeta</span>
              <div className="tipo-foto">
                <span className="catalogo-eventos__foto catalogo-eventos__foto--grande">
                  {form.foto ? <img src={form.foto} alt="" /> : <Icono nombre="imagen" tam={24} />}
                </span>
                <div className="tipo-foto__acciones">
                  <Boton type="button" variante="contorno" tamano="pequeno" disabled={procesandoFoto} onClick={() => entrada.current?.click()}>
                    {procesandoFoto ? "Comprimiendo..." : form.foto ? "Cambiar foto" : "Elegir foto"}
                  </Boton>
                  {form.foto && (
                    <Boton type="button" variante="fantasma" tamano="pequeno" onClick={() => setForm((f) => ({ ...f, foto: "" }))}>
                      Quitar
                    </Boton>
                  )}
                </div>
              </div>
              <span className="campo__pista">Se comprime sola a 600 px. Sin foto, la tarjeta muestra un ícono.</span>
              <input
                ref={entrada}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-solo"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = "";
                  elegirFoto(archivo);
                }}
              />
            </div>
            <div className="campo">
              <span className="campo__etiqueta">En la tienda</span>
              <div className="segmentado" role="group" aria-label="Estado en la tienda">
                {Object.entries(ESTADOS_TIPO_EVENTO).map(([id, texto]) => (
                  <button
                    key={id}
                    type="button"
                    className={form.estado === id ? "activo" : ""}
                    aria-pressed={form.estado === id}
                    onClick={() => setForm((f) => ({ ...f, estado: id }))}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              <span className="campo__pista">
                «Próximamente» se muestra pero lleva a WhatsApp, aunque tenga diseños.
              </span>
            </div>
          </div>
        </Modal>
      )}

      {aBorrar && (
        <Modal
          titulo="Eliminar tipo de evento"
          alCerrar={() => setABorrar(null)}
          pie={
            <>
              <Boton variante="contorno" onClick={() => setABorrar(null)}>
                Cancelar
              </Boton>
              <Boton variante="peligro" icono="basura" onClick={borrar}>
                Eliminar
              </Boton>
            </>
          }
        >
          <p>
            Vas a eliminar <strong>{aBorrar.nombre}</strong>.
            {usadoPor(aBorrar.id).length > 0
              ? ` Lo usan ${usadoPor(aBorrar.id).length} diseños: se les quitará este tipo.`
              : ""}{" "}
            Si solo quieres ocultarlo por un tiempo, cámbialo a «Próximamente».
          </p>
        </Modal>
      )}
    </>
  );
}

/* ====================================================================== */
/* Diseños                                                                */
/* ====================================================================== */

/** Pasa una entrada guardada de `fotos` al formato del editor (ver EditorFotos). */
const fotoDelFormulario = (entrada) => ({
  clave: `g-${entrada}`,
  ...(esUrlFoto(entrada) ? { tipo: "url", url: entrada } : { tipo: "guardada", id: entrada }),
});

const idsDeFotos = (d) => (d?.fotos || []).filter((f) => !esUrlFoto(f));

/** Lo que le falta a un diseño para verse completo en la tienda. */
const faltaDiseno = (d, fotos) =>
  [
    !d.tipos?.length && "tipo de evento",
    !fotos.length && "foto",
    !d.colores?.some((c) => String(c.nombre).trim()) && "colores",
    !d.aromas?.length && "aromas",
    !PRESENTACIONES_EVENTO.some((p) => (d.precios?.[p.id] || []).some((t) => Number(t.precio) > 0)) && "precios",
  ].filter(Boolean);

export function DisenosEvento() {
  const { disenos, tiposEvento, configEventos, guardarDiseno, actualizarDiseno, eliminarDiseno } = useDatos();
  const avisar = useAviso();
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState(null);
  const [aromaNuevo, setAromaNuevo] = useState("");

  const nombreTipo = (id) => tiposEvento.find((t) => t.id === id)?.nombre;
  const original = editandoId ? disenos.find((d) => d.id === editandoId) : null;
  const faltan = form ? faltaDiseno(form, fotos) : [];

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({ ...DISENO_VACIO, precios: { solo: [], empacado: [] } });
    setFotos([]);
  };

  const abrirEdicion = (d) => {
    setEditandoId(d.id);
    setForm({
      ...DISENO_VACIO,
      ...d,
      minimo: d.minimo ?? "",
      anticipacion: d.anticipacion ?? "",
      precios: {
        solo: (d.precios?.solo || []).map((t) => ({ desde: String(t.desde), precio: String(t.precio) })),
        empacado: (d.precios?.empacado || []).map((t) => ({ desde: String(t.desde), precio: String(t.precio) })),
      },
      colores: (d.colores || []).map((c) => ({ ...c })),
      aromas: [...(d.aromas || [])],
      tipos: [...(d.tipos || [])],
    });
    setFotos((d.fotos || []).map(fotoDelFormulario));
  };

  const alternar = (clave, valor) =>
    setForm((f) => ({
      ...f,
      [clave]: f[clave].includes(valor) ? f[clave].filter((x) => x !== valor) : [...f[clave], valor],
    }));

  const agregarAroma = () => {
    const a = aromaNuevo.trim();
    if (a && !form.aromas.includes(a)) setForm((f) => ({ ...f, aromas: [...f.aromas, a] }));
    setAromaNuevo("");
  };

  const cambiarColor = (i, clave) => (e) =>
    setForm((f) => ({ ...f, colores: f.colores.map((c, j) => (j === i ? { ...c, [clave]: e.target.value } : c)) }));

  const guardar = async () => {
    if (!form.nombre.trim()) return avisar("El diseño necesita un nombre", "peligro");
    setGuardando(true);
    // Un diseño nuevo reserva su id antes: sus fotos van debajo de él.
    const id = editandoId || nuevoIdDiseno();
    const subidas = [];
    try {
      const entradas = [];
      for (const foto of fotos) {
        if (foto.tipo === "nueva") {
          const fotoId = await guardarFoto(id, foto, "disenos");
          subidas.push(fotoId);
          entradas.push(fotoId);
        } else {
          entradas.push(foto.tipo === "url" ? foto.url : foto.id);
        }
      }
      const principal = fotos[0];
      const miniatura = !principal
        ? ""
        : principal.tipo === "nueva"
          ? principal.miniatura
          : principal.tipo === "guardada"
            ? (await leerFoto(id, principal.id, "disenos")).miniatura
            : principal.url;

      await guardarDiseno(
        { ...form, fotos: entradas, miniatura, orden: editandoId ? form.orden : disenos.length },
        id,
      );
      const quedan = new Set(entradas);
      await borrarFotos(id, idsDeFotos(original).filter((f) => !quedan.has(f)), "disenos");
      avisar(editandoId ? "Diseño actualizado" : "Diseño creado", "exito");
      setForm(null);
      setEditandoId(null);
    } catch (err) {
      await borrarFotos(id, subidas, "disenos");
      avisar(`No se pudo guardar: ${err.message}`, "peligro");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    try {
      await eliminarDiseno(aBorrar.id);
      await borrarFotos(aBorrar.id, idsDeFotos(aBorrar), "disenos");
      avisar("Diseño eliminado", "exito");
    } catch (err) {
      avisar(`No se pudo eliminar: ${err.message}`, "peligro");
    } finally {
      setABorrar(null);
    }
  };

  const alternarActivo = (d) =>
    actualizarDiseno(d.id, { activo: d.activo === false })
      .then(() => avisar(d.activo === false ? `${d.nombre} activo en la tienda` : `${d.nombre} desactivado`, "exito"))
      .catch((err) => avisar(`No se pudo cambiar: ${err.message}`, "peligro"));

  // Aromas que se ofrecen: los habituales más los propios que ya tenga.
  const aromasOpciones = form ? [...new Set([...AROMAS.filter((a) => a !== "Sin aroma"), ...form.aromas])] : [];

  return (
    <>
      <div className="pestana-cabecera">
        <p>
          {disenos.filter((d) => d.activo !== false).length} activos de {disenos.length}. Cada diseño
          tiene sus colores, aromas y precios por cantidad.
        </p>
        <Boton icono="mas" onClick={abrirNuevo}>
          Nuevo diseño
        </Boton>
      </div>

      {disenos.length === 0 ? (
        <Tarjeta>
          <Vacio
            icono="hoja"
            titulo="Todavía no hay diseños"
            texto={
              tiposEvento.length
                ? "Crea el primero: fotos, colores, aromas y precios. Mientras no haya diseños activos, la tienda muestra el banner de WhatsApp."
                : "Primero crea los tipos de evento (pestaña «Tipos de evento»); luego cada diseño dice a cuáles aplica."
            }
            accion={
              <Boton variante="suave" icono="mas" onClick={abrirNuevo}>
                Nuevo diseño
              </Boton>
            }
          />
        </Tarjeta>
      ) : (
        <ul className="catalogo-eventos">
          {disenos.map((d, i) => {
            const desde = desdeDiseno(d);
            const pendiente = faltaDiseno(d, d.fotos || []);
            return (
              <li key={d.id} className={`catalogo-eventos__item ${d.activo === false ? "catalogo-eventos__item--apagado" : ""}`}>
                <span className="catalogo-eventos__foto">
                  {d.miniatura ? <img src={d.miniatura} alt="" /> : <Icono nombre="hoja" tam={22} />}
                </span>
                <div className="catalogo-eventos__texto">
                  <p className="catalogo-eventos__nombre">{d.nombre}</p>
                  <p className="producto-celda__meta">
                    {[(d.tipos || []).map(nombreTipo).filter(Boolean).join(", ") || "Sin tipo de evento", desde && `desde ${money(desde)} c/u`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {d.colores?.length > 0 && (
                    <span className="muestras" aria-label={`Colores: ${d.colores.map((c) => c.nombre).join(", ")}`}>
                      {d.colores.map((c) => (
                        <span key={c.nombre} className="muestra" style={{ background: c.hex }} title={c.nombre} />
                      ))}
                    </span>
                  )}
                  {pendiente.length > 0 && <p className="producto-celda__falta">Falta: {pendiente.join(", ")}</p>}
                </div>
                <button
                  type="button"
                  className={`conmutador ${d.activo === false ? "" : "activo"}`}
                  role="switch"
                  aria-checked={d.activo !== false}
                  onClick={() => alternarActivo(d)}
                >
                  <span className="conmutador__pista" aria-hidden="true" />
                  {d.activo === false ? "Inactivo" : "Activo"}
                </button>
                <div className="catalogo-eventos__acciones">
                  <Ordenar
                    indice={i}
                    total={disenos.length}
                    nombre={d.nombre}
                    alMover={(paso) =>
                      reordenar(disenos, i, paso, (x, orden) => actualizarDiseno(x.id, { orden })).catch((err) =>
                        avisar(`No se pudo ordenar: ${err.message}`, "peligro"),
                      )
                    }
                  />
                  <Boton variante="fantasma" tamano="pequeno" icono="lapiz" onClick={() => abrirEdicion(d)}>
                    Editar
                  </Boton>
                  <Boton variante="fantasma" tamano="pequeno" onClick={() => setABorrar(d)} aria-label={`Eliminar ${d.nombre}`}>
                    <Icono nombre="basura" tam={15} />
                  </Boton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {form && (
        <Modal
          ancho
          titulo={editandoId ? "Editar diseño" : "Nuevo diseño"}
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
          <form
            className="formulario"
            onSubmit={(e) => {
              e.preventDefault();
              guardar();
            }}
          >
            <div className={`formulario__ancho listo ${faltan.length ? "" : "listo--ok"}`}>
              <Icono nombre={faltan.length ? "alerta" : "chequeo"} tam={16} grosor={2.2} />
              {faltan.length ? `Para la tienda falta: ${faltan.join(", ")}` : "Listo para la tienda"}
            </div>

            <h3 className="formulario__bloque">Diseño</h3>
            <Campo
              etiqueta="Nombre"
              placeholder="Ej.: Osito con globo"
              maxLength={60}
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
            />
            <label className="interruptor">
              <input
                type="checkbox"
                checked={form.activo !== false}
                onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              />
              <span>Activo en la tienda</span>
            </label>
            <div className="formulario__ancho">
              <Area
                etiqueta="Descripción"
                placeholder="Ej.: Jabón en forma de osito, 40 g, con globo en relieve."
                maxLength={400}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div className="formulario__ancho campo">
              <span className="campo__etiqueta">Tipos de evento</span>
              {tiposEvento.length === 0 ? (
                <p className="campo__pista">Crea primero los tipos de evento en su pestaña.</p>
              ) : (
                <div className="chips" style={{ margin: 0 }}>
                  {tiposEvento.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`chip ${form.tipos.includes(t.id) ? "activo" : ""}`}
                      aria-pressed={form.tipos.includes(t.id)}
                      onClick={() => alternar("tipos", t.id)}
                    >
                      {t.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <h3 className="formulario__bloque">Fotos</h3>
            <div className="formulario__ancho">
              <EditorFotos productoId={editandoId} fotos={fotos} alCambiar={setFotos} coleccion="disenos" unidad="diseño" />
            </div>

            <h3 className="formulario__bloque">Colores y aromas</h3>
            <div className="formulario__ancho campo">
              <span className="campo__etiqueta">Colores disponibles</span>
              {form.colores.map((c, i) => (
                <div key={i} className="color-fila">
                  <input
                    type="color"
                    className="color-fila__muestra"
                    value={c.hex || "#ffffff"}
                    onChange={cambiarColor(i, "hex")}
                    aria-label={`Color ${c.nombre || i + 1}`}
                  />
                  <input
                    className="campo__control"
                    placeholder="Ej.: Azul cielo"
                    maxLength={30}
                    value={c.nombre}
                    onChange={cambiarColor(i, "nombre")}
                    aria-label="Nombre del color"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, colores: f.colores.filter((_, j) => j !== i) }))}
                    aria-label="Quitar color"
                  >
                    <Icono nombre="basura" tam={14} />
                  </button>
                </div>
              ))}
              <Boton
                type="button"
                variante="contorno"
                tamano="pequeno"
                icono="mas"
                style={{ alignSelf: "flex-start" }}
                onClick={() => setForm((f) => ({ ...f, colores: [...f.colores, { nombre: "", hex: "#f2eae1" }] }))}
              >
                Agregar color
              </Boton>
            </div>
            <div className="formulario__ancho campo">
              <span className="campo__etiqueta">Aromas disponibles</span>
              <div className="chips" style={{ margin: 0 }}>
                {aromasOpciones.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`chip ${form.aromas.includes(a) ? "activo" : ""}`}
                    aria-pressed={form.aromas.includes(a)}
                    onClick={() => alternar("aromas", a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="abonos__nuevo">
                <input
                  className="campo__control"
                  placeholder="Otro aroma. Ej.: Vainilla"
                  maxLength={30}
                  value={aromaNuevo}
                  onChange={(e) => setAromaNuevo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregarAroma();
                    }
                  }}
                />
                <Boton type="button" variante="contorno" tamano="pequeno" icono="mas" onClick={agregarAroma}>
                  Agregar
                </Boton>
              </div>
            </div>

            <h3 className="formulario__bloque">Precios por cantidad</h3>
            <p className="formulario__ancho campo__pista">
              El precio por unidad baja con la cantidad. Ej.: desde 1 a $6.000 y desde 50 a $5.000.
              La tienda calcula el total con el tramo que corresponda.
            </p>
            {PRESENTACIONES_EVENTO.map((p) => (
              <Tramos
                key={p.id}
                etiqueta={p.texto}
                tramos={form.precios[p.id]}
                alCambiar={(tramos) => setForm((f) => ({ ...f, precios: { ...f.precios, [p.id]: tramos } }))}
              />
            ))}

            <h3 className="formulario__bloque">Pedido mínimo y anticipación</h3>
            <Campo
              etiqueta="Pedido mínimo (unidades)"
              type="number"
              min="0"
              placeholder={configEventos.pedidoMinimo ? `General: ${configEventos.pedidoMinimo}` : "Ej.: 20"}
              value={form.minimo}
              onChange={(e) => setForm((f) => ({ ...f, minimo: e.target.value }))}
              pista="Vacío: usa el general de «Condiciones»."
            />
            <Campo
              etiqueta="Días de anticipación"
              type="number"
              min="0"
              placeholder={configEventos.diasAnticipacion ? `General: ${configEventos.diasAnticipacion}` : "Ej.: 15"}
              value={form.anticipacion}
              onChange={(e) => setForm((f) => ({ ...f, anticipacion: e.target.value }))}
              pista="Vacío: usa el general de «Condiciones»."
            />
          </form>
        </Modal>
      )}

      {aBorrar && (
        <Modal
          titulo="Eliminar diseño"
          alCerrar={() => setABorrar(null)}
          pie={
            <>
              <Boton variante="contorno" onClick={() => setABorrar(null)}>
                Cancelar
              </Boton>
              <Boton variante="peligro" icono="basura" onClick={borrar}>
                Eliminar
              </Boton>
            </>
          }
        >
          <p>
            Vas a eliminar <strong>{aBorrar.nombre}</strong> con sus fotos. Esta acción no se puede
            deshacer. Si solo quieres sacarlo de la tienda, desactívalo.
          </p>
        </Modal>
      )}
    </>
  );
}

/* ====================================================================== */
/* Condiciones                                                            */
/* ====================================================================== */

export function CondicionesEventos() {
  const { configEventos, guardarConfigEventos } = useDatos();
  const avisar = useAviso();
  const inicial = () => ({
    pedidoMinimo: configEventos.pedidoMinimo || "",
    diasAnticipacion: configEventos.diasAnticipacion || "",
    umbralAnticipo: configEventos.umbralAnticipo || "",
    porcentajeAnticipo: configEventos.porcentajeAnticipo ?? CONFIG_EVENTOS_POR_DEFECTO.porcentajeAnticipo,
    textoPedidoPequeno: configEventos.textoPedidoPequeno ?? TEXTO_PEDIDO_PEQUENO,
  });
  const [form, setForm] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const campo = (clave) => (e) => setForm((f) => ({ ...f, [clave]: e.target.value }));

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarConfigEventos(form);
      avisar("Condiciones guardadas", "exito");
    } catch (err) {
      avisar(`No se pudo guardar: ${err.message}`, "peligro");
    } finally {
      setGuardando(false);
    }
  };

  // Vista previa con un pedido de ejemplo a $5.000 la unidad.
  const umbral = Number(form.umbralAnticipo) || 0;
  const ejemploGrande = umbral || 50;
  const ejemploChico = Math.max(1, (umbral || 50) - 10);

  return (
    <>
      <div className="pestana-cabecera">
        <p>Valen para todos los diseños. El mínimo y la anticipación de un diseño mandan sobre los de aquí.</p>
        <Boton icono="chequeo" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar condiciones"}
        </Boton>
      </div>

      <Tarjeta className="bloque">
        <div className="bloque__cuerpo--aire portada__campos">
          <h3 className="formulario__bloque">Pedido</h3>
          <div className="portada__par">
            <Campo etiqueta="Pedido mínimo general (unidades)" type="number" min="0" placeholder="Ej.: 20" value={form.pedidoMinimo} onChange={campo("pedidoMinimo")} />
            <Campo etiqueta="Días de anticipación general" type="number" min="0" placeholder="Ej.: 15" value={form.diasAnticipacion} onChange={campo("diasAnticipacion")} />
          </div>

          <h3 className="formulario__bloque">Anticipo</h3>
          <div className="portada__par">
            <Campo
              etiqueta="Pedir anticipo desde (unidades)"
              type="number"
              min="0"
              placeholder="Ej.: 50"
              value={form.umbralAnticipo}
              onChange={campo("umbralAnticipo")}
              pista="Vacío o 0: nunca se pide anticipo."
            />
            <Campo
              etiqueta="Porcentaje de anticipo"
              type="number"
              min="0"
              max="100"
              placeholder="50"
              value={form.porcentajeAnticipo}
              onChange={campo("porcentajeAnticipo")}
              pista="Por defecto, 50 %."
            />
          </div>
          <Area
            etiqueta="Texto para pedidos por debajo del umbral"
            maxLength={300}
            value={form.textoPedidoPequeno}
            onChange={campo("textoPedidoPequeno")}
            pista="Vacío: se usa el texto original."
          />

          <div className="campo">
            <span className="campo__etiqueta">Así lo verá la clienta</span>
            <div className="condiciones-vista">
              <p>
                <strong>{ejemploGrande} unidades a $5.000</strong>
                {textoAnticipo(form, ejemploGrande, ejemploGrande * 5000)}
              </p>
              <p>
                <strong>{ejemploChico} unidades</strong>
                {textoAnticipo(form, ejemploChico, ejemploChico * 5000)}
              </p>
            </div>
          </div>
        </div>
      </Tarjeta>
    </>
  );
}
