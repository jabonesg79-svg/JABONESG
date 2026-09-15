import { useMemo, useRef, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import { LARGO_PARRAFO_PORTADA, PORTADA_POR_DEFECTO } from "../lib/dominio.js";
import { PESO_MAXIMO, subirImagenPortada, validarImagen } from "../lib/imagenes.js";
import { Area, Boton, Campo, Icono, Tarjeta } from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import Hero from "./Hero.jsx";
import "./panel.css";

export default function Portada() {
  const { portada, guardarPortada } = useDatos();
  const avisar = useAviso();
  const archivoRef = useRef(null);

  // Shell no monta esta página hasta que los datos están cargados, así que
  // `portada` ya trae lo guardado y el formulario puede partir de ahí.
  const [form, setForm] = useState(portada);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");
  const [guardadoEn, setGuardadoEn] = useState(null);

  const campo = (clave) => (e) => {
    setForm((f) => ({ ...f, [clave]: e.target.value }));
    setGuardadoEn(null);
  };

  const hayCambios = useMemo(
    () => Object.keys(PORTADA_POR_DEFECTO).some((k) => (form[k] ?? "") !== (portada[k] ?? "")),
    [form, portada],
  );

  const sobranteParrafo = (form.parrafo || "").length - LARGO_PARRAFO_PORTADA;

  const elegirImagen = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const problema = validarImagen(archivo);
    if (problema) {
      setErrorImagen(problema);
      e.target.value = "";
      return;
    }

    setErrorImagen("");
    setSubiendo(true);
    try {
      const { url, ruta, peso } = await subirImagenPortada(archivo, form.imagenRuta);
      // Se guarda de inmediato: si el usuario cerrara la página ahora, el
      // archivo ya está en Storage y la portada quedaría apuntando a él.
      const actualizado = { ...form, imagenUrl: url, imagenRuta: ruta };
      setForm(actualizado);
      await guardarPortada(actualizado);
      setGuardadoEn(new Date());
      avisar(`Imagen publicada · ${(peso / 1024).toFixed(0)} KB en WebP`, "exito");
    } catch (err) {
      setErrorImagen(err.message);
      avisar("No pudimos subir la imagen", "peligro");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarPortada(form);
      setGuardadoEn(new Date());
      avisar("Portada actualizada", "exito");
    } catch (err) {
      avisar(`No se pudo guardar: ${err.message}`, "peligro");
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = () => {
    // Se conserva la imagen: restaurar textos no debería borrar una foto subida.
    setForm({ ...PORTADA_POR_DEFECTO, imagenUrl: form.imagenUrl, imagenRuta: form.imagenRuta, imagenAlt: form.imagenAlt });
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

      {guardadoEn && !hayCambios && (
        <p className="portada__confirmacion">
          <Icono nombre="chequeo" tam={14} grosor={2.2} />
          Publicado a las {guardadoEn.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
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
            <Campo
              etiqueta="Subtítulo"
              value={form.subtitulo || ""}
              onChange={campo("subtitulo")}
            />

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
          </div>

          <div className="bloque__cuerpo--aire portada__campos">
            <div className="portada__imagen">
              <div className="portada__miniatura">
                {form.imagenUrl ? (
                  <img src={form.imagenUrl} alt={form.imagenAlt || "Imagen actual de la portada"} />
                ) : (
                  <span className="etiqueta">Sin imagen</span>
                )}
              </div>

              <div className="portada__imagen-acciones">
                <Boton
                  variante="contorno"
                  onClick={() => archivoRef.current?.click()}
                  disabled={subiendo}
                  icono="imagen"
                >
                  {subiendo
                    ? "Subiendo..."
                    : form.imagenUrl
                      ? "Reemplazar imagen"
                      : "Subir imagen"}
                </Boton>
                <p className="campo__pista">
                  JPG, PNG o WebP · máximo {PESO_MAXIMO / 1024 / 1024} MB. Se convierte a WebP
                  antes de publicarse y la anterior se borra.
                </p>
                {errorImagen && <p className="portada__error">{errorImagen}</p>}
              </div>

              <input
                ref={archivoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={elegirImagen}
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
