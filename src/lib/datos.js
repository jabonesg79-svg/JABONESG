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

/**
 * Lee la portada una sola vez. Si el documento no existe, o si la lectura
 * falla, devuelve los valores por defecto: la home tiene que pintar algo
 * siempre, incluso sin configuración y sin conexión.
 */
export async function leerPortada() {
  try {
    const snap = await getDoc(doc(db, ...PORTADA));
    if (!snap.exists()) return { ...PORTADA_POR_DEFECTO };
    return { ...PORTADA_POR_DEFECTO, ...snap.data() };
  } catch {
    return { ...PORTADA_POR_DEFECTO };
  }
}

export async function guardarPortada(datos) {
  const limpio = Object.fromEntries(
    Object.keys(PORTADA_POR_DEFECTO).map((clave) => [clave, datos[clave] ?? PORTADA_POR_DEFECTO[clave]]),
  );
  await setDoc(doc(db, ...PORTADA), { ...limpio, actualizado: serverTimestamp() }, { merge: true });
  return limpio;
}
