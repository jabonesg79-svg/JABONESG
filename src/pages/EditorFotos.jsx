import { useRef, useState } from "react";
import { MAX_FOTOS_PRODUCTO, PESO_MAXIMO_FOTO, pesoLegible, prepararFoto, validarImagen } from "../lib/imagenes.js";
import { Boton, Icono } from "../ui/index.jsx";
import FotoProducto from "../ui/FotoProducto.jsx";

/* Cada foto del formulario es de un tipo (ver fotoDelFormulario en Inventario):
   - `guardada`: ya está en Firestore, solo se conoce su id.
   - `nueva`: comprimida en el navegador; se sube al guardar el jabón, nunca
     antes, para que cancelar no deje fotos huérfanas.
   - `url`: enlace de un producto anterior a la subida de fotos. */

const claveNueva = () => `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function EditorFotos({ productoId, fotos, alCambiar }) {
  const entradaRef = useRef(null);
  const [procesando, setProcesando] = useState(0);
  const [avisos, setAvisos] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const cupo = MAX_FOTOS_PRODUCTO - fotos.length;

  const agregar = async (lista) => {
    const archivos = [...lista].filter((a) => a.type?.startsWith("image/"));
    if (!archivos.length) return;
    const problemas = [];
    if (archivos.length > cupo) {
      problemas.push(
        `Caben ${MAX_FOTOS_PRODUCTO} fotos por jabón: se tomaron ${Math.max(cupo, 0)} de las ${archivos.length} elegidas.`,
      );
    }

    const elegidos = archivos.slice(0, Math.max(cupo, 0));
    setProcesando(elegidos.length);
    const nuevas = [];
    for (const archivo of elegidos) {
      const problema = validarImagen(archivo, PESO_MAXIMO_FOTO);
      if (problema) {
        problemas.push(`${archivo.name}: ${problema}`);
      } else {
        try {
          const r = await prepararFoto(archivo);
          nuevas.push({
            clave: claveNueva(),
            tipo: "nueva",
            grande: r.grande.dataUrl,
            miniatura: r.miniatura.dataUrl,
            ancho: r.grande.ancho,
            alto: r.grande.alto,
            pesoOriginal: r.pesoOriginal,
            pesoFinal: r.grande.bytes,
          });
        } catch (err) {
          problemas.push(`${archivo.name}: ${err.message}`);
        }
      }
      setProcesando((n) => n - 1);
    }
    alCambiar((actuales) => [...actuales, ...nuevas].slice(0, MAX_FOTOS_PRODUCTO));
    setAvisos(problemas);
  };

  const mover = (i, destino) =>
    alCambiar((lista) => {
      const copia = [...lista];
      const [foto] = copia.splice(i, 1);
      copia.splice(destino, 0, foto);
      return copia;
    });

  const quitar = (i) => alCambiar((lista) => lista.filter((_, j) => j !== i));

  const soltar = (e) => {
    e.preventDefault();
    setArrastrando(false);
    if (cupo > 0) agregar(e.dataTransfer.files);
  };

  return (
    <div className="fotos-editor">
      {fotos.length > 0 && (
        <ol className="fotos-editor__lista">
          {fotos.map((foto, i) => (
            <li key={foto.clave} className="fotos-editor__item">
              <div className="fotos-editor__miniatura">
                {foto.tipo === "nueva" ? (
                  <img src={foto.miniatura} alt={`Foto ${i + 1}`} />
                ) : (
                  <FotoProducto
                    productoId={productoId}
                    foto={foto.tipo === "url" ? foto.url : foto.id}
                    version="miniatura"
                    alt={`Foto ${i + 1}`}
                  />
                )}
                {i === 0 && <span className="fotos-editor__principal">Principal</span>}
              </div>

              <p className="campo__pista">
                {foto.tipo === "nueva"
                  ? `${pesoLegible(foto.pesoOriginal)} → ${pesoLegible(foto.pesoFinal)} · sin guardar`
                  : foto.tipo === "url"
                    ? "Enlace"
                    : "Guardada"}
              </p>

              <div className="fotos-editor__acciones">
                <button
                  type="button"
                  onClick={() => mover(i, 0)}
                  disabled={i === 0}
                  title="Usar como principal"
                  aria-label={`Usar la foto ${i + 1} como principal`}
                >
                  <Icono nombre="estrella" tam={15} />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Mover la foto ${i + 1} antes`}
                >
                  <Icono nombre="flecha" tam={15} style={{ transform: "rotate(180deg)" }} />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, i + 1)}
                  disabled={i === fotos.length - 1}
                  aria-label={`Mover la foto ${i + 1} después`}
                >
                  <Icono nombre="flecha" tam={15} />
                </button>
                <button type="button" onClick={() => quitar(i)} aria-label={`Quitar la foto ${i + 1}`}>
                  <Icono nombre="basura" tam={15} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {cupo > 0 ? (
        <div
          className={`fotos-editor__zona ${arrastrando ? "activa" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}
        >
          <Icono nombre="imagen" tam={26} />
          <p>
            {procesando
              ? `Comprimiendo ${procesando} ${procesando === 1 ? "foto" : "fotos"}...`
              : `Arrastra fotos aquí o elígelas · quedan ${cupo}`}
          </p>
          <Boton
            type="button"
            variante="contorno"
            tamano="pequeno"
            disabled={procesando > 0}
            onClick={() => entradaRef.current?.click()}
          >
            Elegir fotos
          </Boton>
        </div>
      ) : (
        <p className="campo__pista">Llegaste al máximo de {MAX_FOTOS_PRODUCTO} fotos por jabón.</p>
      )}

      <p className="campo__pista">
        Desde el celular o el computador, JPG, PNG o WebP. Se comprimen solas antes de guardar: la
        grande a 1600 px para la ficha y una miniatura de 600 px para el catálogo. La estrella
        elige la principal.
      </p>
      {avisos.length > 0 && (
        <div className="portada__error">
          {avisos.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </div>
      )}

      <input
        ref={entradaRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          // Copia antes de limpiar: vaciar el input también vacía su FileList.
          const archivos = [...(e.target.files || [])];
          e.target.value = "";
          agregar(archivos);
        }}
        className="sr-solo"
      />
    </div>
  );
}
