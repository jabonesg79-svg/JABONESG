/* Vocabulario del negocio: jabones artesanales.
   Estas listas alimentan formularios y filtros; ampliarlas aquí las propaga a toda la app. */

export const LINEAS = [
  "Glicerina",
  "Avena y miel",
  "Carbón activado",
  "Arcilla",
  "Aceite de oliva",
  "Exfoliante",
  "Infantil",
  "Obsequio",
];

export const AROMAS = [
  "Lavanda",
  "Citronela",
  "Naranja dulce",
  "Menta",
  "Romero",
  "Coco",
  "Canela",
  "Eucalipto",
  "Rosas",
  "Sin aroma",
];

/** Lo que filtra el catálogo: para qué sirve el jabón, no cómo se llama. */
export const BENEFICIOS = ["Hidratante", "Exfoliante", "Piel grasa", "Piel sensible", "Aromático"];

export const TIPOS_PIEL = [
  "Todo tipo de piel",
  "Piel seca",
  "Piel grasa",
  "Piel mixta",
  "Piel sensible",
];

export const PRESENTACIONES = [
  { id: "barra", etiqueta: "Barra" },
  { id: "mini", etiqueta: "Mini barra" },
  { id: "kit", etiqueta: "Kit" },
  { id: "liquido", etiqueta: "Jabón líquido" },
];

export const FORMAS_PAGO = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Crédito"];

/* ---------- Ventas ---------- */

/** Un comprobante anulado (y sus líneas) no cuenta en ninguna cifra. */
export const vigente = (registro) => !registro?.anulada;

/** Lo que de verdad entró por una línea de venta: precio × cantidad menos su
    parte del descuento del comprobante. */
export const ingresoLinea = (v) =>
  (Number(v.precioVenta) || 0) * (Number(v.cantidad) || 0) - (Number(v.descuento) || 0);

/** Monto del descuento en pesos, nunca negativo ni mayor que el subtotal. */
export const montoDescuento = (subtotal, tipo, valor) => {
  const v = Math.max(0, Number(valor) || 0);
  const monto = tipo === "porcentaje" ? Math.round((subtotal * Math.min(v, 100)) / 100) : Math.round(v);
  return Math.min(monto, Math.max(0, subtotal));
};

export const PRODUCTO_VACIO = {
  codigo: "",
  nombre: "",
  descripcion: "",
  linea: LINEAS[0],
  aroma: AROMAS[0],
  presentacion: "barra",
  pesoGramos: "",
  ingredientes: "",
  lote: "",
  fechaElaboracion: "",
  costoProduccion: "",
  precioVenta: "",
  stock: "",
  stockMinimo: "3",
  imagen: "",
  publicado: true,
  // Ficha de la tienda
  beneficioCorto: "",
  beneficios: [],
  tipoPiel: TIPOS_PIEL[0],
  modoUso: "",
  fotos: [],
  miniatura: "",
  nuevo: false,
};

export const etiquetaPresentacion = (id) =>
  PRESENTACIONES.find((p) => p.id === id)?.etiqueta || "Barra";

/** Un producto está agotado o por agotarse según su propio mínimo. */
export const estadoStock = (producto) => {
  const stock = Number(producto?.stock) || 0;
  const minimo = Number(producto?.stockMinimo) || 0;
  if (stock <= 0) return "agotado";
  if (stock <= minimo) return "bajo";
  return "ok";
};

/** Cómo se presenta un producto en la tienda: el stock manda sobre "nuevo". */
export const estadoTienda = (producto) => {
  if ((Number(producto?.stock) || 0) <= 0) return "agotado";
  return producto?.nuevo ? "nuevo" : "disponible";
};

/** Unidades que se pueden pedir de un jabón: de 1 al stock disponible. */
export const topeCantidad = (p) => Math.max(0, Math.floor(Number(p?.stock) || 0));

export const limitarCantidad = (cantidad, p) =>
  Math.min(Math.max(1, Math.floor(Number(cantidad) || 1)), Math.max(1, topeCantidad(p)));

export const ETIQUETA_ESTADO = { disponible: "Disponible", nuevo: "Nuevo", agotado: "Agotado" };

const PESO_ESTADO = { nuevo: 0, disponible: 1, agotado: 2 };

/** Nuevos primero, agotados siempre al final; dentro de cada grupo se respeta el orden de llegada. */
export const ordenarParaTienda = (productos) =>
  productos
    .map((p, i) => ({ p, i }))
    .sort((a, b) => PESO_ESTADO[estadoTienda(a.p)] - PESO_ESTADO[estadoTienda(b.p)] || a.i - b.i)
    .map(({ p }) => p);

/** Lo que le falta a un jabón para verse completo en la tienda. Vacío = listo. */
export const faltaParaTienda = (producto) =>
  [
    fotosDe(producto).length === 0 && "foto",
    !String(producto?.descripcion || "").trim() && "descripción",
    !(producto?.beneficios || []).length && "beneficios",
    !(Number(producto?.precioVenta) > 0) && "precio",
  ].filter(Boolean);

/* ---------- Fotos ----------

   `fotos` es la lista ordenada del producto; la primera es la principal. Cada
   entrada es el id de un documento de `productos/{id}/imagenes` (fotos subidas
   desde el panel) o una URL (enlaces viejos o los ejemplos). El producto guarda
   además `miniatura`, la de la principal, para que el catálogo no tenga que
   leer ningún otro documento. */

export const esUrlFoto = (entrada) => /^(https?:|data:)/.test(String(entrada || ""));

/** Productos guardados antes de `fotos` usan `imagen` y `galeria`. */
export const fotosDe = (producto) => {
  if (Array.isArray(producto?.fotos) && producto.fotos.length) return producto.fotos;
  return [...new Set([producto?.imagen, ...(producto?.galeria || [])].filter(Boolean))];
};

/** Lo que muestra la tarjeta: la miniatura guardada o, si no hay, la primera URL. */
export const miniaturaDe = (producto) =>
  producto?.miniatura || fotosDe(producto).find(esUrlFoto) || "";

/* ---------- Portada de la tienda ---------- */

/** Valores con los que arranca la home si el documento aún no existe.
    La home nunca debe quedar en blanco por falta de configuración. */
export const PORTADA_POR_DEFECTO = {
  eyebrow: "100% NATURALES · HECHOS A MANO · INGREDIENTES SELECCIONADOS",
  marca: "jabonesg",
  subtitulo: "jabón hecho a mano, en lotes pequeños",
  parrafo:
    "Aceites vegetales, arcillas y aromas naturales. Cada barra se corta, se cura y se empaca una por una.",
  textoBoton: "Ver el catálogo",
  linkBoton: "#catalogo",
  textoBoton2: "Jabones para tu evento",
  linkBoton2: "#eventos",
  imagenData: "",
  imagenAlt: "",
  imagenPeso: 0,
};

/* ---------- Contacto de la tienda ---------- */

/** El número de WhatsApp viene de fábrica para que la tienda tenga contacto
    aunque el documento aún no exista. Instagram queda vacío hasta tener cuenta. */
export const CONTACTO_POR_DEFECTO = {
  whatsapp: "573113509187",
  instagram: "",
};

/* ---------- Mensajes de WhatsApp ---------- */

/** Plantillas de los mensajes que la tienda deja escritos en WhatsApp. Se
    editan en Panel → Contacto; una plantilla vacía usa la de aquí. */
export const MENSAJES_POR_DEFECTO = {
  pedido:
    "¡Hola, JabonesG! 🌿 Me interesa el *{jabon}*.\nCantidad: {cantidad} ({total})\n¿Me cuentas cómo hago el pedido?\nCiudad: ",
  agotado:
    "Hola 🌿 Vi que el *{jabon}* está agotado. ¿Me avisas cuando vuelva a estar disponible?",
  evento:
    "¡Hola, JabonesG! 🌿 Quiero cotizar recordatorios para mi *{evento}*.\nFecha del evento: \nCantidad aproximada: \nCiudad: ",
  general: "¡Hola, JabonesG! 🌿 Quiero información sobre sus jabones.",
};

export const MENSAJES_WHATSAPP = [
  { id: "pedido", titulo: "Pedir un jabón", variables: ["jabon", "cantidad", "total"] },
  { id: "agotado", titulo: "Jabón agotado", variables: ["jabon"] },
  { id: "evento", titulo: "Cotizar evento", variables: ["evento"] },
  { id: "general", titulo: "Consulta general (botón flotante)", variables: [] },
];

/** Datos de ejemplo para la vista previa del panel. */
export const EJEMPLO_MENSAJE = {
  jabon: "Jabón de avena y miel",
  cantidad: 2,
  total: 30000,
  evento: "Baby shower",
};

/** Arma el mensaje: plantilla guardada (o la de por defecto si está vacía) con
    las {variables} reemplazadas. Una variable desconocida queda tal cual. */
export const armarMensaje = (mensajes, id, valores = {}) => {
  const guardada = mensajes?.[id];
  const plantilla = guardada && guardada.trim() ? guardada : MENSAJES_POR_DEFECTO[id] || "";
  return plantilla.replace(/\{(\w+)\}/g, (todo, clave) =>
    clave in valores ? String(valores[clave]) : todo,
  );
};

/** Testimonios de clientes. Arrancan vacíos: la sección no se muestra hasta
    que se cargue uno real desde el panel. */
export const MAX_TESTIMONIOS = 6;
export const TESTIMONIO_VACIO = { nombre: "", ciudad: "", texto: "" };

/* ---------- Eventos: pedidos de recordatorios ---------- */

export const ESTADOS_EVENTO = [
  "Cotizado",
  "Confirmado",
  "En producción",
  "Listo",
  "Entregado",
  "Cancelado",
];

/** Los que todavía piden trabajo o cobro. */
export const ESTADOS_EVENTO_ACTIVOS = ["Cotizado", "Confirmado", "En producción", "Listo"];

export const TIPOS_EVENTO = [
  "Matrimonio",
  "Bautizo",
  "Baby shower",
  "Primera comunión",
  "Cumpleaños",
  "Empresarial",
  "Otro",
];

export const METODOS_PAGO = ["Efectivo", "Nequi", "Daviplata", "Transferencia"];

export const PEDIDO_EVENTO_VACIO = {
  cliente: "",
  telefono: "",
  tipoEvento: TIPOS_EVENTO[0],
  fechaEvento: "",
  fechaEntrega: "",
  cantidad: "",
  aroma: "",
  tamano: "",
  empaque: "",
  textoEtiqueta: "",
  colores: "",
  precioUnitario: "",
  abonos: [],
  notas: "",
  estado: ESTADOS_EVENTO[0],
};

/** Lo que la sección Eventos de la tienda muestra. Vacío = la tienda no
    muestra precios ni condiciones, solo la invitación a cotizar. */
export const CONFIG_EVENTOS_POR_DEFECTO = {
  precios: [],
  pedidoMinimo: 0,
  diasAnticipacion: 0,
  empaques: [],
};

export const totalPedido = (p) =>
  (Number(p?.cantidad) || 0) * (Number(p?.precioUnitario) || 0);

export const abonadoPedido = (p) =>
  (p?.abonos || []).reduce((s, a) => s + (Number(a.monto) || 0), 0);

export const saldoPedido = (p) => Math.max(0, totalPedido(p) - abonadoPedido(p));

/** Precio por unidad según la cantidad: el tramo más alto que la cantidad alcanza. */
export const precioPorCantidad = (config, cantidad) => {
  const n = Number(cantidad) || 0;
  const tramos = [...(config?.precios || [])]
    .filter((t) => Number(t.precio) > 0)
    .sort((a, b) => Number(a.desde) - Number(b.desde));
  const aplica = tramos.filter((t) => n >= (Number(t.desde) || 0)).pop();
  return aplica ? Number(aplica.precio) : 0;
};

/** El precio más bajo de la tabla: lo que la tienda anuncia como "desde". */
export const precioDesde = (config) => {
  const precios = (config?.precios || []).map((t) => Number(t.precio)).filter((p) => p > 0);
  return precios.length ? Math.min(...precios) : 0;
};

/** Días que faltan para una fecha "AAAA-MM-DD" (negativo si ya pasó). */
export const diasHasta = (fechaISO) => {
  if (!fechaISO) return null;
  const [a, m, d] = String(fechaISO).split("-").map(Number);
  if (!a || !m || !d) return null;
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((new Date(a, m - 1, d) - inicioHoy) / 86400000);
};

/** Secciones de la tienda a las que puede llevar un botón del hero. */
export const ENLACES_TIENDA = [
  { id: "#catalogo", etiqueta: "Catálogo" },
  { id: "#nosotros", etiqueta: "Por qué JabonesG" },
  { id: "#eventos", etiqueta: "Eventos" },
  { id: "#como-comprar", etiqueta: "Cómo comprar" },
  { id: "#contacto", etiqueta: "Contacto" },
];

/** "/catalogo" fue el valor por defecto antiguo y nunca existió como página:
    llevaba al inicio en vez de bajar al catálogo. */
export const normalizarEnlace = (valor, porDefecto) => {
  const v = String(valor || "").trim();
  if (!v) return porDefecto;
  return v === "/catalogo" ? "#catalogo" : v;
};

/** null si el enlace lleva a algún lado; si no, por qué no. */
export const problemaEnlace = (valor) => {
  const v = String(valor || "").trim();
  if (ENLACES_TIENDA.some((e) => e.id === v)) return null;
  if (/^https:\/\/[^\s/]+\.[^\s]+$/.test(v)) return null;
  if (!v) return "Elige una sección o pega un enlace.";
  return "Ese enlace no existe en la tienda. Elige una sección o pega uno que empiece por https://";
};

/** Largo sugerido del párrafo del hero, no impuesto. */
export const LARGO_PARRAFO_PORTADA = 160;

/* Las fotos de producto no van en el documento del producto: un catálogo que
   trae el base64 de cada foto en cada consulta se vuelve lento enseguida. Van en
   `productos/{id}/imagenes` y el producto guarda solo los ids y la miniatura
   principal (ver fotosDe). */
