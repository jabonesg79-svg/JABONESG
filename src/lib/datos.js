import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { hoyISO } from "./formato.js";
import { PORTADA_POR_DEFECTO } from "./dominio.js";
import { PESO_MAXIMO_GUARDADO } from "./imagenes.js";

const conId = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

/* ---------- Productos ---------- */

export async function leerProductos() {
  const snap = await getDocs(collection(db, "productos"));
  return conId(snap).sort((a, b) => (b.creado || "").localeCompare(a.creado || ""));
}

export async function crearProducto(datos) {
  const payload = { ...datos, creado: hoyISO(), actualizado: hoyISO() };
  const ref = await addDoc(collection(db, "productos"), payload);
  return { id: ref.id, ...payload };
}

export async function actualizarProducto(id, datos) {
  const payload = { ...datos, actualizado: hoyISO() };
  await updateDoc(doc(db, "productos", id), payload);
  return payload;
}

export async function borrarProducto(id) {
  await deleteDoc(doc(db, "productos", id));
}

/* ---------- Ventas y facturas ---------- */

export async function leerVentas() {
  const snap = await getDocs(collection(db, "ventas"));
  return conId(snap).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

export async function leerFacturas() {
  const snap = await getDocs(collection(db, "facturas"));
  return conId(snap).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

/**
 * Registra una venta completa: una línea por producto, la factura que las agrupa,
 * y el descuento de stock. Todo en un batch para que no queden ventas sin factura
 * ni stock descontado dos veces si algo falla a mitad de camino.
 */
export async function registrarVenta({ carrito, formaPago, cliente, numeroFactura }) {
  const fecha = hoyISO();
  const ticket = `T-${Date.now().toString(36).toUpperCase()}`;
  const lote = writeBatch(db);

  const lineas = carrito.map((item) => {
    const ref = doc(collection(db, "ventas"));
    const linea = {
      ticket,
      fecha,
      formaPago,
      productoId: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      linea: item.linea || "",
      aroma: item.aroma || "",
      cantidad: Number(item.cantidad) || 0,
      precioVenta: Number(item.precioFinal ?? item.precioVenta) || 0,
      costoProduccion: Number(item.costoProduccion) || 0,
    };
    lote.set(ref, linea);
    return { id: ref.id, ...linea };
  });

  const total = lineas.reduce((suma, l) => suma + l.precioVenta * l.cantidad, 0);

  const facturaRef = doc(collection(db, "facturas"));
  const factura = {
    ticket,
    fecha,
    formaPago,
    numeroFactura,
    total,
    clienteNombre: cliente?.nombre || "",
    clienteTelefono: cliente?.telefono || "",
    estadoCredito: formaPago === "Crédito" ? "abierto" : "",
    items: lineas.map((l) => ({
      codigo: l.codigo,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precioVenta: l.precioVenta,
    })),
  };
  lote.set(facturaRef, factura);

  for (const item of carrito) {
    const restante = Math.max(0, (Number(item.stock) || 0) - (Number(item.cantidad) || 0));
    lote.update(doc(db, "productos", item.id), { stock: restante, actualizado: fecha });
  }

  await lote.commit();

  return {
    ventas: lineas,
    factura: { id: facturaRef.id, ...factura },
    stockPorProducto: Object.fromEntries(
      carrito.map((i) => [i.id, Math.max(0, (Number(i.stock) || 0) - (Number(i.cantidad) || 0))]),
    ),
  };
}

export async function cerrarCredito(facturaId) {
  await updateDoc(doc(db, "facturas", facturaId), { estadoCredito: "pagado" });
}

/** Consecutivo simple: el mayor número existente + 1. */
export const siguienteNumeroFactura = (facturas) => {
  const mayor = facturas.reduce((max, f) => Math.max(max, Number(f.numeroFactura) || 0), 0);
  return mayor + 1;
};

export { query, orderBy };

/* ---------- Portada ---------- */

const PORTADA = ["configuracion", "portada"];
const CACHE = "jabonesg:portada:v2";

/* La portada lleva la imagen dentro, en base64. Guardarla en sessionStorage
   evita volver a traer ese peso en cada navegación interna de la pestaña.

   La caché caduca: sin caducidad, una pestaña que cargó la tienda antes de un
   cambio seguiría mostrando lo viejo para siempre, y parecería que el panel no
   guardó nada. Diez minutos cubren la navegación interna sin congelar la vista. */
const VIDA_CACHE = 10 * 60 * 1000;

const leerCache = () => {
  try {
    const guardado = sessionStorage.getItem(CACHE);
    if (!guardado) return null;
    const { datos, momento } = JSON.parse(guardado);
    if (Date.now() - momento > VIDA_CACHE) return null;
    return datos;
  } catch {
    return null;
  }
};

const escribirCache = (datos) => {
  try {
    sessionStorage.setItem(CACHE, JSON.stringify({ datos, momento: Date.now() }));
  } catch {
    // Cupo lleno o almacenamiento deshabilitado: seguimos sin caché.
  }
};

export const olvidarPortadaCacheada = () => {
  try {
    sessionStorage.removeItem(CACHE);
  } catch {
    // Nada que hacer: si no se puede escribir, tampoco había caché.
  }
};

/**
 * Lee la portada. Si el documento no existe, o si la lectura falla, devuelve
 * los valores por defecto: la home tiene que pintar algo siempre, incluso sin
 * configuración y sin conexión.
 *
 * `sinCache` fuerza la ida a Firestore. El panel siempre lo usa: quien está
 * editando tiene que ver lo que hay de verdad, nunca una copia guardada.
 */
export async function leerPortada({ sinCache = false } = {}) {
  if (!sinCache) {
    const cacheada = leerCache();
    if (cacheada) return cacheada;
  }

  try {
    const snap = await getDoc(doc(db, ...PORTADA));
    const datos = snap.exists()
      ? { ...PORTADA_POR_DEFECTO, ...snap.data() }
      : { ...PORTADA_POR_DEFECTO };
    escribirCache(datos);
    return datos;
  } catch (error) {
    console.error("[portada] no se pudo leer la configuración", error);
    return { ...PORTADA_POR_DEFECTO };
  }
}

/**
 * Guarda la portada y devuelve lo que realmente quedó en Firestore, releído
 * desde el servidor. Así el formulario refleja el documento, no la intención.
 *
 * Antes de escribir comprueba el tamaño del data URL. Si se pasa, aborta sin
 * tocar el documento: vale más conservar la imagen anterior que dejar la
 * portada a medias o reventar el límite de 1 MB por documento de Firestore.
 */
export async function guardarPortada(datos) {
  const imagenData = datos.imagenData || "";

  console.log(
    `[portada] guardando · imagenData ${Math.round(imagenData.length / 1024)} KB ` +
      `(${imagenData.length} caracteres) · tope ${Math.round(PESO_MAXIMO_GUARDADO / 1024)} KB`,
  );

  if (imagenData.length > PESO_MAXIMO_GUARDADO) {
    throw new Error(
      `La imagen ocupa ${Math.round(imagenData.length / 1024)} KB y el máximo son ` +
        `${Math.round(PESO_MAXIMO_GUARDADO / 1024)} KB. No se guardó nada: la portada ` +
        "conserva la imagen anterior.",
    );
  }

  const limpio = Object.fromEntries(
    Object.keys(PORTADA_POR_DEFECTO).map((clave) => [
      clave,
      datos[clave] ?? PORTADA_POR_DEFECTO[clave],
    ]),
  );
  limpio.imagenPeso = imagenData.length;

  await setDoc(doc(db, ...PORTADA), { ...limpio, actualizado: serverTimestamp() }, { merge: true });

  // Releer confirma que quedó escrito y deja la caché al día en un solo paso.
  olvidarPortadaCacheada();
  const confirmado = await leerPortada({ sinCache: true });
  console.log("[portada] guardado y releído desde Firestore", confirmado);
  return confirmado;
}
