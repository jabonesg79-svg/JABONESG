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
