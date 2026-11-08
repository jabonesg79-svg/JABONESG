import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { diaISO, hoyISO } from "./formato.js";
import {
  CONFIG_EVENTOS_POR_DEFECTO,
  CONTACTO_POR_DEFECTO,
  MAX_TESTIMONIOS,
  MENSAJES_POR_DEFECTO,
  PORTADA_POR_DEFECTO,
} from "./dominio.js";
import { PESO_MAXIMO_GUARDADO } from "./imagenes.js";

const conId = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

/* ---------- Productos ---------- */

export async function leerProductos() {
  const snap = await getDocs(collection(db, "productos"));
  return conId(snap).sort((a, b) => (b.creado || "").localeCompare(a.creado || ""));
}

/** Id para un producto que aún no existe: las fotos se suben antes que el
    producto y necesitan saber bajo qué documento van. */
export const nuevoIdProducto = () => doc(collection(db, "productos")).id;

export async function crearProducto(datos, id) {
  const payload = { ...datos, creado: hoyISO(), actualizado: hoyISO() };
  if (id) {
    await setDoc(doc(db, "productos", id), payload);
    return { id, ...payload };
  }
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

/* ---------- Fotos de producto ----------
   Una foto por documento en `productos/{id}/imagenes/{fotoId}`, con la versión
   grande y la miniatura. Nunca dentro del documento del producto. */

/** Una promesa por foto: la misma se pide una sola vez por pestaña aunque la
    muestren la ficha y el panel. */
const fotosEnMemoria = new Map();

const refFoto = (productoId, fotoId) => doc(db, "productos", productoId, "imagenes", fotoId);

/** Devuelve { grande, miniatura }, vacíos si la foto no existe o falla la lectura. */
export function leerFoto(productoId, fotoId) {
  const clave = `${productoId}/${fotoId}`;
  if (!fotosEnMemoria.has(clave)) {
    fotosEnMemoria.set(
      clave,
      getDoc(refFoto(productoId, fotoId))
        .then((snap) => {
          const d = snap.exists() ? snap.data() : {};
          return { grande: d.grande || "", miniatura: d.miniatura || "" };
        })
        .catch((error) => {
          // Sin caché del fallo: el próximo intento vuelve a preguntar.
          fotosEnMemoria.delete(clave);
          console.error("[fotos] no se pudo leer", clave, error);
          return { grande: "", miniatura: "" };
        }),
    );
  }
  return fotosEnMemoria.get(clave);
}

/** Margen bajo el 1 MB por documento para nombres de campo y metadatos. */
const TOPE_DOCUMENTO_FOTO = 1000000;

export async function guardarFoto(productoId, { grande, miniatura, ancho, alto, pesoOriginal }) {
  const total = grande.length + miniatura.length;
  if (total > TOPE_DOCUMENTO_FOTO) {
    throw new Error(
      `La foto ocupa ${Math.round(total / 1024)} KB y el documento admite hasta ` +
        `${Math.round(TOPE_DOCUMENTO_FOTO / 1024)} KB.`,
    );
  }
  const ref = doc(collection(db, "productos", productoId, "imagenes"));
  await setDoc(ref, { grande, miniatura, ancho, alto, pesoOriginal, creado: hoyISO() });
  fotosEnMemoria.set(`${productoId}/${ref.id}`, Promise.resolve({ grande, miniatura }));
  return ref.id;
}

/** Borra sin frenar el flujo: si una falla queda huérfana, pero lo demás sigue. */
export async function borrarFotos(productoId, ids) {
  await Promise.all(
    ids.map((id) => {
      fotosEnMemoria.delete(`${productoId}/${id}`);
      return deleteDoc(refFoto(productoId, id)).catch((e) =>
        console.error("[fotos] no se borró", productoId, id, e),
      );
    }),
  );
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
export async function registrarVenta({ carrito, formaPago, cliente, numeroFactura, descuento }) {
  const fecha = hoyISO();
  const ticket = `T-${Date.now().toString(36).toUpperCase()}`;
  const lote = writeBatch(db);

  // El descuento del comprobante se reparte entre las líneas según su peso,
  // para que las cifras por jabón sumen exactamente lo cobrado. La última
  // línea se lleva el redondeo.
  const subtotales = carrito.map(
    (i) => (Number(i.precioFinal ?? i.precioVenta) || 0) * (Number(i.cantidad) || 0),
  );
  const subtotal = subtotales.reduce((s, x) => s + x, 0);
  const montoDesc = Math.min(Math.max(0, Number(descuento?.monto) || 0), subtotal);
  let repartido = 0;
  const descuentoDe = (indice) => {
    if (!montoDesc || !subtotal) return 0;
    if (indice === carrito.length - 1) return montoDesc - repartido;
    const parte = Math.round((montoDesc * subtotales[indice]) / subtotal);
    repartido += parte;
    return parte;
  };

  const lineas = carrito.map((item, indice) => {
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
      descuento: descuentoDe(indice),
    };
    lote.set(ref, linea);
    return { id: ref.id, ...linea };
  });

  const total = subtotal - montoDesc;

  const facturaRef = doc(collection(db, "facturas"));
  const factura = {
    ticket,
    fecha,
    formaPago,
    numeroFactura,
    subtotal,
    ...(montoDesc
      ? { descuento: { tipo: descuento.tipo, valor: Number(descuento.valor) || 0, monto: montoDesc } }
      : {}),
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

/**
 * Anula un comprobante registrado por error. En un solo lote: marca el
 * comprobante y sus líneas como anulados (dejan de contar en las cifras) y
 * devuelve al stock lo vendido. Nada se borra, para que quede el rastro.
 *
 * `lineas` son las ventas del comprobante (mismo ticket). `idsProductos` son
 * los productos que todavía existen: actualizar uno borrado haría fallar el
 * lote entero, y a un jabón eliminado no hay a dónde devolverle stock.
 */
export async function anularComprobante({ factura, lineas, idsProductos, motivo }) {
  const fechaAnulacion = hoyISO();
  const lote = writeBatch(db);

  lote.update(doc(db, "facturas", factura.id), {
    anulada: true,
    motivoAnulacion: motivo,
    fechaAnulacion,
    // Un crédito anulado ya no se cobra.
    ...(factura.estadoCredito === "abierto" ? { estadoCredito: "anulado" } : {}),
  });

  const devuelto = {};
  for (const l of lineas) {
    lote.update(doc(db, "ventas", l.id), { anulada: true });
    if (l.productoId && idsProductos.has(l.productoId)) {
      devuelto[l.productoId] = (devuelto[l.productoId] || 0) + (Number(l.cantidad) || 0);
    }
  }
  for (const [id, cantidad] of Object.entries(devuelto)) {
    lote.update(doc(db, "productos", id), { stock: increment(cantidad), actualizado: fechaAnulacion });
  }

  await lote.commit();
  return { fechaAnulacion, devuelto };
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

/* ---------- Contacto ---------- */

const CONTACTO = ["configuracion", "contacto"];

/** Igual que la portada: si falla o no existe, la tienda sigue con los valores
    por defecto y nunca se queda sin botón de WhatsApp. */
export async function leerContacto() {
  try {
    const snap = await getDoc(doc(db, ...CONTACTO));
    return snap.exists()
      ? { ...CONTACTO_POR_DEFECTO, mensajes: {}, ...snap.data() }
      : { ...CONTACTO_POR_DEFECTO, mensajes: {} };
  } catch (error) {
    console.error("[contacto] no se pudo leer la configuración", error);
    return { ...CONTACTO_POR_DEFECTO };
  }
}

export async function guardarContacto(datos) {
  const limpio = Object.fromEntries(
    Object.keys(CONTACTO_POR_DEFECTO).map((clave) => [clave, String(datos[clave] ?? "").trim()]),
  );
  // Las plantillas se guardan tal cual (los espacios y saltos son parte del
  // mensaje); solo una hecha de puros espacios queda vacía.
  limpio.mensajes = Object.fromEntries(
    Object.keys(MENSAJES_POR_DEFECTO).map((clave) => {
      const texto = String(datos.mensajes?.[clave] ?? "");
      return [clave, texto.trim() ? texto : ""];
    }),
  );
  await setDoc(doc(db, ...CONTACTO), { ...limpio, actualizado: serverTimestamp() }, { merge: true });
  return leerContacto();
}

/* ---------- Testimonios ---------- */

const TESTIMONIOS = ["configuracion", "testimonios"];

/** Solo los que tienen texto y nombre: uno a medio llenar no se publica. */
const limpiarTestimonios = (lista = []) =>
  lista
    .map((t) => ({
      nombre: String(t.nombre || "").trim(),
      ciudad: String(t.ciudad || "").trim(),
      texto: String(t.texto || "").trim(),
    }))
    .filter((t) => t.nombre && t.texto)
    .slice(0, MAX_TESTIMONIOS);

export async function leerTestimonios() {
  try {
    const snap = await getDoc(doc(db, ...TESTIMONIOS));
    return snap.exists() ? limpiarTestimonios(snap.data().lista) : [];
  } catch (error) {
    console.error("[testimonios] no se pudieron leer", error);
    return [];
  }
}

export async function guardarTestimonios(lista) {
  await setDoc(doc(db, ...TESTIMONIOS), {
    lista: limpiarTestimonios(lista),
    actualizado: serverTimestamp(),
  });
  return leerTestimonios();
}

/* ---------- Eventos ----------
   Pedidos de recordatorios: solo el panel los lee y escribe. La configuración
   (precios, mínimo, anticipación, empaques) la lee también la tienda. */

/** Si no se pueden leer (por ejemplo, reglas aún sin desplegar), el panel
    sigue funcionando con la lista vacía en vez de caerse entero. */
export async function leerPedidosEventos() {
  try {
    const snap = await getDocs(collection(db, "eventos"));
    return conId(snap);
  } catch (error) {
    console.error("[eventos] no se pudieron leer los pedidos", error);
    return [];
  }
}

/** Los números llegan del formulario como texto; los abonos, también. */
const limpiarPedido = (datos) => ({
  ...datos,
  cliente: String(datos.cliente || "").trim(),
  telefono: String(datos.telefono || "").trim(),
  cantidad: Number(datos.cantidad) || 0,
  precioUnitario: Number(datos.precioUnitario) || 0,
  abonos: (datos.abonos || []).map((a) => ({
    fecha: a.fecha || diaISO(),
    monto: Number(a.monto) || 0,
    metodo: a.metodo || "",
  })),
});

export async function guardarPedidoEvento(datos, id) {
  const payload = { ...limpiarPedido(datos), actualizado: hoyISO() };
  delete payload.id;
  if (id) {
    await updateDoc(doc(db, "eventos", id), payload);
    return { id, ...payload };
  }
  payload.creado = hoyISO();
  const ref = await addDoc(collection(db, "eventos"), payload);
  return { id: ref.id, ...payload };
}

export async function borrarPedidoEvento(id) {
  await deleteDoc(doc(db, "eventos", id));
}

const CONFIG_EVENTOS = ["configuracion", "eventos"];

export async function leerConfigEventos() {
  try {
    const snap = await getDoc(doc(db, ...CONFIG_EVENTOS));
    return snap.exists()
      ? { ...CONFIG_EVENTOS_POR_DEFECTO, ...snap.data() }
      : { ...CONFIG_EVENTOS_POR_DEFECTO };
  } catch (error) {
    console.error("[eventos] no se pudo leer la configuración", error);
    return { ...CONFIG_EVENTOS_POR_DEFECTO };
  }
}

export async function guardarConfigEventos(datos) {
  const limpio = {
    precios: (datos.precios || [])
      .map((t) => ({ desde: Number(t.desde) || 0, precio: Number(t.precio) || 0 }))
      .filter((t) => t.precio > 0)
      .sort((a, b) => a.desde - b.desde),
    pedidoMinimo: Number(datos.pedidoMinimo) || 0,
    diasAnticipacion: Number(datos.diasAnticipacion) || 0,
    empaques: [...new Set((datos.empaques || []).map((e) => String(e).trim()).filter(Boolean))],
  };
  await setDoc(doc(db, ...CONFIG_EVENTOS), { ...limpio, actualizado: serverTimestamp() });
  return leerConfigEventos();
}

/* ---------- Carrito de la tienda ---------- */

/**
 * Lee del servidor, uno por uno, los jabones del carrito: stock y precio al
 * día justo antes de mostrar el total o enviar. Devuelve { id: producto | null }
 * (null si el jabón ya no existe). Si falla la red, `null` en vez del mapa:
 * quien llama sigue con lo que ya tenía.
 */
export async function leerProductosPorId(ids) {
  try {
    const snaps = await Promise.all(
      ids.map((id) => getDoc(doc(db, "productos", id))),
    );
    return Object.fromEntries(
      snaps.map((s, i) => [ids[i], s.exists() ? { id: s.id, ...s.data() } : null]),
    );
  } catch (error) {
    console.error("[carrito] no se pudo revisar el stock", error);
    return null;
  }
}

/* ---------- Pedidos web ----------
   Lo que la clienta envía desde el carrito. El público solo crea; el panel
   los lee, los convierte en venta o los descarta. */

export async function crearPedidoWeb({ lineas, total, datos }) {
  const ref = await addDoc(collection(db, "pedidosWeb"), {
    lineas: lineas.map((l) => ({
      productoId: l.productoId,
      nombre: l.nombre,
      cantidad: Math.floor(Number(l.cantidad) || 0),
      precio: Math.round(Number(l.precio) || 0),
    })),
    // Las reglas exigen un entero.
    total: Math.round(Number(total) || 0),
    nombre: datos.nombre,
    telefono: datos.telefono,
    ciudad: datos.ciudad,
    entrega: datos.entrega,
    notas: datos.notas,
    estado: "nuevo",
    creado: serverTimestamp(),
  });
  return ref.id;
}

export async function leerPedidosWeb() {
  try {
    const snap = await getDocs(collection(db, "pedidosWeb"));
    return conId(snap)
      .map((p) => ({ ...p, creado: p.creado?.toDate ? p.creado.toDate().toISOString() : p.creado || "" }))
      .sort((a, b) => b.creado.localeCompare(a.creado));
  } catch (error) {
    console.error("[pedidos web] no se pudieron leer", error);
    return [];
  }
}

export async function actualizarPedidoWeb(id, cambios) {
  await updateDoc(doc(db, "pedidosWeb", id), cambios);
  return cambios;
}
