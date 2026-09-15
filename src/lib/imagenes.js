/**
 * Imágenes sin Firebase Storage.
 *
 * El proyecto está en plan Spark y Storage exige Blaze, así que las imágenes
 * viajan dentro del propio documento de Firestore como data URL comprimida.
 * Todo el trabajo pesado ocurre en el navegador de quien sube la foto.
 */

export const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp"];
export const PESO_MAXIMO_ARCHIVO = 4 * 1024 * 1024; // 4 MB de entrada

/**
 * Tope de lo que se guarda en el documento.
 *
 * Un documento de Firestore no puede pasar de 1 MB contando todos sus campos.
 * El data URL es lo único grande que lleva, así que se le deja 700 000
 * caracteres y sobra margen para los textos y los metadatos.
 *
 * Ojo: el objetivo se mide sobre el data URL ya codificado, no sobre el blob.
 * Base64 crece alrededor de un 37%, de modo que un blob de 700 000 bytes daría
 * un data URL de unos 957 000 caracteres y rompería este mismo límite.
 */
export const PESO_MAXIMO_GUARDADO = 700000;

const ANCHOS = [1600, 1200];
const CALIDAD_INICIAL = 0.82;
const CALIDAD_MINIMA = 0.5;
const PASO_CALIDAD = 0.07;

export const ERROR_MUY_PESADA =
  "La imagen es muy pesada. Intenta con una foto más liviana o pega una URL.";

/** Valida el archivo de entrada antes de gastar tiempo en comprimirlo. */
export function validarImagen(archivo) {
  if (!archivo) return "Elige un archivo.";
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
    return "Formato no admitido. Usa JPG, PNG o WebP.";
  }
  if (archivo.size > PESO_MAXIMO_ARCHIVO) {
    const mb = (archivo.size / 1024 / 1024).toFixed(1);
    return `La imagen pesa ${mb} MB y el máximo son 4 MB.`;
  }
  return null;
}

/** ¿Este navegador sabe exportar WebP desde un canvas? */
function soportaWebP() {
  const lienzo = document.createElement("canvas");
  lienzo.width = 1;
  lienzo.height = 1;
  return lienzo.toDataURL("image/webp").startsWith("data:image/webp");
}

function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No pudimos leer la imagen."));
    };
    img.src = url;
  });
}

function aBlob(lienzo, tipo, calidad) {
  return new Promise((resolve) => lienzo.toBlob(resolve, tipo, calidad));
}

function aDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(new Error("No pudimos codificar la imagen."));
    lector.readAsDataURL(blob);
  });
}

/**
 * Comprime hasta que el data URL quepa en `pesoObjetivo`.
 *
 * Baja la calidad en pasos desde 0.82 hasta 0.5; si con el ancho grande no
 * alcanza, repite la escalera con el ancho reducido. Nunca agranda una imagen
 * que ya venía más angosta que el máximo.
 */
export async function comprimirImagen(
  archivo,
  { maxAncho = ANCHOS[0], calidad = CALIDAD_INICIAL, pesoObjetivo = PESO_MAXIMO_GUARDADO } = {},
) {
  const img = await cargarImagen(archivo);
  const tipo = soportaWebP() ? "image/webp" : "image/jpeg";
  const anchos = [maxAncho, ANCHOS[1]].filter((a, i, lista) => lista.indexOf(a) === i);

  const lienzo = document.createElement("canvas");
  const ctx = lienzo.getContext("2d");

  for (const ancho of anchos) {
    const escala = Math.min(1, ancho / img.naturalWidth);
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);

    for (let q = calidad; q >= CALIDAD_MINIMA - 0.001; q -= PASO_CALIDAD) {
      const blob = await aBlob(lienzo, tipo, Number(q.toFixed(2)));
      if (!blob) continue;
      const dataUrl = await aDataUrl(blob);
      if (dataUrl.length <= pesoObjetivo) {
        return {
          dataUrl,
          peso: dataUrl.length,
          ancho: lienzo.width,
          alto: lienzo.height,
          calidad: Number(q.toFixed(2)),
          tipo,
        };
      }
    }
  }

  throw new Error(ERROR_MUY_PESADA);
}

/**
 * Comprueba que una URL pegada sea https y que la imagen cargue de verdad,
 * para no guardar un enlace roto en la portada.
 */
export function validarUrlImagen(url) {
  return new Promise((resolve) => {
    const limpia = (url || "").trim();
    if (!limpia) return resolve("Pega una URL.");
    if (!limpia.startsWith("https://")) return resolve("La URL debe empezar por https://");

    const img = new Image();
    let resuelto = false;
    const terminar = (mensaje) => {
      if (resuelto) return;
      resuelto = true;
      resolve(mensaje);
    };

    img.onload = () => terminar(null);
    img.onerror = () => terminar("No pudimos cargar esa imagen. Revisa la URL.");
    setTimeout(() => terminar("La imagen tardó demasiado en responder."), 10000);
    img.src = limpia;
  });
}

export const enKB = (bytes) => `${Math.round((Number(bytes) || 0) / 1024)} KB`;
