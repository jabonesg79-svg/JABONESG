import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { almacenamiento } from "./firebase.js";

export const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp"];
export const PESO_MAXIMO = 4 * 1024 * 1024; // 4 MB
const ANCHO_MAXIMO = 1800;

/** Valida antes de tocar la red. Devuelve el mensaje de error, o null si pasa. */
export function validarImagen(archivo) {
  if (!archivo) return "Elige un archivo.";
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
    return "Formato no admitido. Usa JPG, PNG o WebP.";
  }
  if (archivo.size > PESO_MAXIMO) {
    const mb = (archivo.size / 1024 / 1024).toFixed(1);
    return `La imagen pesa ${mb} MB y el máximo son 4 MB.`;
  }
  return null;
}

/**
 * Convierte a WebP sobre un canvas, redimensionando si excede el ancho máximo.
 * Es el mismo criterio que usa scripts/preparar-marca.mjs para los activos de
 * marca, solo que aquí corre en el navegador de quien sube la foto.
 *
 * Si el navegador no sabe exportar WebP, devuelve el archivo original: vale más
 * subir algo pesado que fallar la carga.
 */
export function convertirAWebP(archivo, calidad = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, ANCHO_MAXIMO / img.naturalWidth);
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(img.naturalWidth * escala);
      lienzo.height = Math.round(img.naturalHeight * escala);

      const ctx = lienzo.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);

      lienzo.toBlob(
        (blob) => resolve(blob && blob.size > 0 ? blob : archivo),
        "image/webp",
        calidad,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No pudimos leer la imagen."));
    };

    img.src = url;
  });
}

/**
 * Sube la imagen de portada y borra la anterior.
 *
 * El borrado va después de que la nueva quedó publicada: si fallara primero,
 * la portada se quedaría sin foto. Y si el borrado falla (por ejemplo, porque
 * el archivo ya no existe) no se interrumpe la operación.
 */
export async function subirImagenPortada(archivo, rutaAnterior = "") {
  const error = validarImagen(archivo);
  if (error) throw new Error(error);

  const convertida = await convertirAWebP(archivo);
  const ruta = `portada/${Date.now()}.webp`;
  const referencia = ref(almacenamiento, ruta);

  await uploadBytes(referencia, convertida, { contentType: "image/webp" });
  const url = await getDownloadURL(referencia);

  if (rutaAnterior && rutaAnterior !== ruta) {
    try {
      await deleteObject(ref(almacenamiento, rutaAnterior));
    } catch {
      // La anterior ya no estaba: no es motivo para fallar.
    }
  }

  return { url, ruta, peso: convertida.size };
}
