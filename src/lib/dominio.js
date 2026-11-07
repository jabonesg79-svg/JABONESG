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

export const FORMAS_PAGO = ["Efectivo", "Transferencia", "Crédito"];

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
  galeria: [],
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

export const ETIQUETA_ESTADO = { disponible: "Disponible", nuevo: "Nuevo", agotado: "Agotado" };

const PESO_ESTADO = { nuevo: 0, disponible: 1, agotado: 2 };

/** Nuevos primero, agotados siempre al final; dentro de cada grupo se respeta el orden de llegada. */
export const ordenarParaTienda = (productos) =>
  productos
    .map((p, i) => ({ p, i }))
    .sort((a, b) => PESO_ESTADO[estadoTienda(a.p)] - PESO_ESTADO[estadoTienda(b.p)] || a.i - b.i)
    .map(({ p }) => p);

/** Las fotos subidas desde el panel viven en `imagenes/{id}`; el producto solo
    guarda "img:<id>". Las que vienen por URL se guardan tal cual. */
export const PREFIJO_IMAGEN = "img:";
export const esRefImagen = (valor) => String(valor || "").startsWith(PREFIJO_IMAGEN);

/** Foto principal y galería en una sola lista, sin vacíos ni repetidas. */
export const fotosDe = (producto) => [
  ...new Set([producto?.imagen, ...(producto?.galeria || [])].filter(Boolean)),
];

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

/** Largo sugerido del párrafo del hero, no impuesto. */
export const LARGO_PARRAFO_PORTADA = 160;

/* Las fotos de producto no van en el documento del producto: un catálogo que
   trae el base64 de cada foto en cada consulta se vuelve lento enseguida. Van en
   `imagenes/{id}` y el producto guarda "img:<id>" (ver PREFIJO_IMAGEN). */
