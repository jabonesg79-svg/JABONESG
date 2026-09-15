import { useMemo, useRef, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import { LARGO_PARRAFO_PORTADA, PORTADA_POR_DEFECTO } from "../lib/dominio.js";
import {
  PESO_MAXIMO_GUARDADO,
  comprimirImagen,
  enKB,
  validarImagen,
  validarUrlImagen,
} from "../lib/imagenes.js";
import { Area, Boton, Campo, Icono, Tarjeta } from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import Hero from "./Hero.jsx";
import "./panel.css";

const MODOS = [
  { id: "archivo", texto: "Subir archivo" },
  { id: "url", texto: "Pegar URL" },
];

export default function Portada() {
  const { portada, guardarPortada } = useDatos();
  const avisar = useAviso();
  const archivoRef = useRef(null);

  // Shell no monta esta página hasta que los datos están cargados, así que
  // `portada` ya trae lo guardado y el formulario puede partir de ahí.
  const [form, setForm] = useState(portada);
  const [modo, setModo] = useState("archivo");
  const [url, setUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState(null);

  const campo = (clave) => (e) => {
    setForm((f) => ({ ...f, [clave]: e.target.value }));
    setGuardadoEn(null);
    setErrorGuardado(null);
  };

  const hayCambios = useMemo(
    () => Object.keys(PORTADA_POR_DEFECTO).some((k) => (form[k] ?? "") !== (portada[k] ?? "")),
    [form, portada],
  );

  const sobranteParrafo = (form.parrafo || "").length - LARGO_PARRAFO_PORTADA;
  const pesoActual = (form.imagenData || "").length;
  const margen = PESO_MAXIMO_GUARDADO - pesoActual;

  /* ---------- Imagen por archivo ---------- */

  const elegirArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    const problema = validarImagen(archivo);
    if (problema) {
      setErrorImagen(problema);
      return;
    }

    setErrorImagen("");
    setProcesando(true);
    try {
      const resultado = await comprimirImagen(archivo);
      // Solo queda en el formulario: nada se escribe hasta "Guardar cambios".
      setForm((f) => ({ ...f, imagenData: resultado.dataUrl, imagenPeso: resultado.peso }));
      setDetalle(resultado);
      setGuardadoEn(null);
      avisar(`Imagen lista · ${enKB(resultado.peso)}. Falta guardar.`, "neutro");
    } catch (err) {
      setErrorImagen(err.message);
    } finally {
      setProcesando(false);
    }
  };

  /* ---------- Imagen por URL ---------- */

  const usarUrl = async () => {
    setErrorImagen("");
    setProcesando(true);
    try {
      const problema = await validarUrlImagen(url);
      if (problema) {
        setErrorImagen(problema);
        return;
      }
      setForm((f) => ({ ...f, imagenData: url.trim(), imagenPeso: url.trim().length }));
      setDetalle(null);
      setGuardadoEn(null);
      avisar("Imagen enlazada. Falta guardar.", "neutro");
    } finally {
      setProcesando(false);
    }
  };

  const quitarImagen = () => {
    setForm((f) => ({ ...f, imagenData: "", imagenPeso: 0, imagenAlt: "" }));
    setDetalle(null);
    setUrl("");
    setGuardadoEn(null);
  };

  /* ---------- Guardado ---------- */

  const guardar = async () => {
    console.log("[portada] click en Guardar cambios", {
      hayCambios,
      pesoImagen: (form.imagenData || "").length,
      campos: Object.keys(form),
    });

    setErrorGuardado(null);
    setGuardando(true);
    try {
      // Devuelve el documento releído desde Firestore, no lo que enviamos:
      // si algo no quedó escrito, se ve de inmediato en el formulario.
      const confirmado = await guardarPortada(form);
      setForm(confirmado);
      setGuardadoEn(new Date());
      avisar("Portada actualizada", "exito");
    } catch (err) {
      // El objeto completo a consola, y en pantalla el código y el mensaje
      // reales de Firebase: un "Error al guardar" genérico no sirve para nada.
      console.error("[portada] falló el guardado", err);
      setErrorGuardado({
        code: err?.code || "sin-codigo",
        message: err?.message || String(err),
      });
      avisar("No se pudo guardar", "peligro");
    } finally {
      // Pase lo que pase, el botón sale del estado de carga.
      setGuardando(false);
    }
  };

  const restaurar = () => {
    // Se conserva la imagen: restaurar textos no debería borrar una foto puesta.
    setForm({
      ...PORTADA_POR_DEFECTO,
      imagenData: form.imagenData,
      imagenPeso: form.imagenPeso,
      imagenAlt: form.imagenAlt,
    });
    setGuardadoEn(null);
    avisar("Textos por defecto cargados. Falta guardar.", "neutro");
  };

  return (
    <>
      <header className="cabecera-pagina">
        <div>
          <h1>Portada</h1>
          <p>Lo que ve quien entra a la tienda, antes del catálogo.</p>
        </div>
        <div className="cabecera-pagina__acciones">
          <Boton variante="contorno" onClick={restaurar}>
            Restaurar valores por defecto
          </Boton>
          <Boton onClick={guardar} disabled={guardando || !hayCambios} icono="chequeo">
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Boton>
        </div>
      </header>

      {errorGuardado && (
        <div className="portada__fallo">
          <p>
            <Icono nombre="alerta" tam={14} grosor={2.2} /> No se guardó
          </p>
          <p className="portada__fallo-codigo">{errorGuardado.code}</p>
          <p>{errorGuardado.message}</p>
        </div>
      )}

      {guardadoEn && !hayCambios && !errorGuardado && (
        <p className="portada__confirmacion">
          <Icono nombre="chequeo" tam={14} grosor={2.2} />
          Publicado a las{" "}
          {guardadoEn.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {!hayCambios && !guardadoEn && (
        // Sin esto, el botón deshabilitado parece un botón roto.
        <p className="portada__sin-cambios">
          Todo lo que ves aquí ya está publicado. Cambia algo para poder guardar.
        </p>
      )}

      <div className="portada">
        <Tarjeta className="bloque">
          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Textos</h2>
          </div>

          <div className="bloque__cuerpo--aire portada__campos">
            <Campo
              etiqueta="Etiqueta superior"
              value={form.eyebrow || ""}
              onChange={campo("eyebrow")}
              pista="Se muestra en mayúsculas"
            />
            <Campo etiqueta="Palabra de marca" value={form.marca || ""} onChange={campo("marca")} />
            <Campo etiqueta="Subtítulo" value={form.subtitulo || ""} onChange={campo("subtitulo")} />

            <Area
              etiqueta="Párrafo"
              value={form.parrafo || ""}
              onChange={campo("parrafo")}
              pista={
                sobranteParrafo > 0
                  ? `${(form.parrafo || "").length} caracteres · ${sobranteParrafo} por encima de los ${LARGO_PARRAFO_PORTADA} sugeridos`
                  : `${(form.parrafo || "").length} de ${LARGO_PARRAFO_PORTADA} caracteres sugeridos`
              }
            />

            <div className="portada__par">
              <Campo
                etiqueta="Texto del botón"
                value={form.textoBoton || ""}
                onChange={campo("textoBoton")}
              />
              <Campo
                etiqueta="Enlace del botón"
                value={form.linkBoton || ""}
                onChange={campo("linkBoton")}
                pista="Ruta interna o enlace completo"
              />
            </div>
          </div>

          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Imagen</h2>
            <span className="etiqueta">
              {pesoActual ? `${enKB(pesoActual)} · quedan ${enKB(margen)}` : "Sin imagen"}
            </span>
          </div>

          <div className="bloque__cuerpo--aire portada__campos">
            <div className="chips" style={{ marginBottom: 0 }}>
              {MODOS.map((m) => (
                <button
                  key={m.id}
                  className={`chip ${modo === m.id ? "activo" : ""}`}
                  onClick={() => {
                    setModo(m.id);
                    setErrorImagen("");
                  }}
                >
                  {m.texto}
                </button>
              ))}
            </div>

            <div className="portada__imagen">
              <div className="portada__miniatura">
                {form.imagenData ? (
                  <img src={form.imagenData} alt={form.imagenAlt || "Imagen actual de la portada"} />
                ) : (
                  <span className="etiqueta">Sin imagen</span>
                )}
              </div>

              <div className="portada__imagen-acciones">
                {modo === "archivo" ? (
                  <>
                    <Boton
                      variante="contorno"
                      onClick={() => archivoRef.current?.click()}
                      disabled={procesando}
                      icono="imagen"
                    >
                      {procesando
                        ? "Comprimiendo..."
                        : form.imagenData
                          ? "Reemplazar imagen"
                          : "Subir imagen"}
                    </Boton>
                    <p className="campo__pista">
                      JPG, PNG o WebP · máximo 4 MB de entrada. Se comprime a WebP en tu
                      navegador y se guarda dentro del documento, sin usar Storage.
                    </p>
                  </>
                ) : (
                  <>
                    <Campo
                      etiqueta="URL de la imagen"
                      placeholder="https://..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <Boton variante="contorno" onClick={usarUrl} disabled={procesando}>
                      {procesando ? "Comprobando..." : "Usar esta URL"}
                    </Boton>
                  </>
                )}

                {detalle && (
                  <p className="campo__pista">
                    {detalle.ancho}×{detalle.alto} px · calidad {detalle.calidad} ·{" "}
                    {detalle.tipo.replace("image/", "").toUpperCase()} · {enKB(detalle.peso)}
                  </p>
                )}

                {form.imagenData && (
                  <Boton variante="fantasma" tamano="pequeno" onClick={quitarImagen} icono="basura">
                    Quitar imagen
                  </Boton>
                )}

                {errorImagen && <p className="portada__error">{errorImagen}</p>}
              </div>

              <input
                ref={archivoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={elegirArchivo}
                className="sr-solo"
              />
            </div>

            <Campo
              etiqueta="Texto alternativo de la imagen"
              value={form.imagenAlt || ""}
              onChange={campo("imagenAlt")}
              pista="Describe la foto para quien no puede verla"
            />
          </div>
        </Tarjeta>

        <div className="portada__previa">
          <div className="bloque__cabecera">
            <h2 className="bloque__titulo">Vista previa</h2>
            <span className="etiqueta">Escala reducida</span>
          </div>
          <div className="portada__previa-marco">
            <Hero portada={form} comoVistaPrevia />
          </div>
        </div>
      </div>
    </>
  );
}
