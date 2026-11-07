/* Seis jabones de muestra para ver el catálogo lleno mientras se desarrolla.

   Solo existen en `npm run dev`: Tienda.jsx los suma únicamente cuando
   import.meta.env.DEV es verdadero, y nunca se escriben en Firestore. En la
   tienda publicada no aparecen, así que no hay nada que borrar después. */

/** Ilustración de una barra de jabón con los colores de marca, en lugar de una foto. */
const barra = (fondo, jabon, sello) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'>` +
      `<rect width='400' height='500' fill='${fondo}'/>` +
      `<ellipse cx='200' cy='362' rx='150' ry='20' fill='#693709' opacity='.10'/>` +
      `<rect x='70' y='170' width='260' height='180' rx='34' fill='${jabon}'/>` +
      `<rect x='84' y='180' width='232' height='44' rx='22' fill='#f8f4ef' opacity='.18'/>` +
      `<text x='200' y='296' text-anchor='middle' font-family='Georgia,serif' font-size='92' fill='${sello}' opacity='.5'>G</text>` +
      `</svg>`,
  )}`;

const base = {
  presentacion: "barra",
  publicado: true,
  stockMinimo: 3,
  ejemplo: true,
  galeria: [],
};

export const EJEMPLOS = [
  {
    ...base,
    id: "ejemplo-1",
    codigo: "EJ-AVENA",
    nombre: "Avena y miel",
    beneficioCorto: "Calma y exfolia suave, ideal para uso diario.",
    descripcion: "Barra cremosa con avena molida y miel de abejas.",
    beneficios: ["Hidratante", "Exfoliante", "Piel sensible"],
    tipoPiel: "Piel sensible",
    aroma: "Sin aroma",
    pesoGramos: 100,
    ingredientes: "Base de glicerina vegetal, avena coloidal, miel, aceite de almendras.",
    modoUso: "Humedece la piel, haz espuma entre las manos y masajea en círculos. Enjuaga.",
    precioVenta: 12000,
    stock: 14,
    imagen: barra("#f2eae1", "#e6cfa8", "#b9701c"),
    galeria: [barra("#ead9c6", "#e6cfa8", "#8a6645")],
  },
  {
    ...base,
    id: "ejemplo-2",
    codigo: "EJ-CARBON",
    nombre: "Carbón activado",
    beneficioCorto: "Limpia a fondo y ayuda a controlar el brillo.",
    descripcion: "Jabón negro de carbón activado con árbol de té.",
    beneficios: ["Piel grasa"],
    tipoPiel: "Piel grasa",
    aroma: "Menta",
    pesoGramos: 90,
    ingredientes: "Glicerina vegetal, carbón activado de bambú, aceite de árbol de té, menta.",
    modoUso: "Úsalo en rostro y cuerpo una vez al día. Evita el contorno de ojos.",
    precioVenta: 14000,
    stock: 8,
    nuevo: true,
    imagen: barra("#efe6dc", "#5b4a3d", "#d4b9a1"),
  },
  {
    ...base,
    id: "ejemplo-3",
    codigo: "EJ-LAVANDA",
    nombre: "Lavanda relajante",
    beneficioCorto: "Aroma suave para el baño de la noche.",
    descripcion: "Con flores de lavanda y aceite esencial puro.",
    beneficios: ["Aromático", "Hidratante"],
    tipoPiel: "Todo tipo de piel",
    aroma: "Lavanda",
    pesoGramos: 100,
    ingredientes: "Aceite de oliva, aceite de coco, flores de lavanda, aceite esencial de lavanda.",
    modoUso: "Ideal en la ducha de la noche. Deja secar la barra entre usos.",
    precioVenta: 13000,
    stock: 20,
    imagen: barra("#f3ece6", "#c9b6cf", "#6b8f6b"),
  },
  {
    ...base,
    id: "ejemplo-4",
    codigo: "EJ-CAFE",
    nombre: "Café exfoliante",
    beneficioCorto: "Exfolia y despierta la piel con cada uso.",
    descripcion: "Café molido de origen colombiano y manteca de cacao.",
    beneficios: ["Exfoliante", "Aromático"],
    tipoPiel: "Piel mixta",
    aroma: "Canela",
    pesoGramos: 110,
    ingredientes: "Glicerina vegetal, café molido, manteca de cacao, canela.",
    modoUso: "Masajea sobre la piel húmeda dos o tres veces por semana.",
    precioVenta: 13500,
    stock: 0,
    imagen: barra("#efe4d8", "#8a6645", "#f2eae1"),
  },
  {
    ...base,
    id: "ejemplo-5",
    codigo: "EJ-ARCILLA",
    nombre: "Arcilla rosada",
    beneficioCorto: "Purifica sin resecar, para pieles delicadas.",
    descripcion: "Arcilla rosada francesa y aceite de rosa mosqueta.",
    beneficios: ["Piel sensible", "Hidratante"],
    tipoPiel: "Piel sensible",
    aroma: "Rosas",
    pesoGramos: 95,
    ingredientes: "Aceite de oliva, arcilla rosada, rosa mosqueta, aceite esencial de rosas.",
    modoUso: "Uso diario en rostro y cuerpo. Enjuaga con agua tibia.",
    precioVenta: 15000,
    stock: 6,
    nuevo: true,
    imagen: barra("#f6ece6", "#e3b8a8", "#b9701c"),
  },
  {
    ...base,
    id: "ejemplo-6",
    codigo: "EJ-CITRICO",
    nombre: "Naranja y citronela",
    beneficioCorto: "Fresco y energizante para empezar el día.",
    descripcion: "Cáscara de naranja rallada y citronela.",
    beneficios: ["Aromático", "Piel grasa"],
    tipoPiel: "Piel grasa",
    aroma: "Naranja dulce",
    pesoGramos: 100,
    ingredientes: "Glicerina vegetal, cáscara de naranja, aceite esencial de citronela.",
    modoUso: "Úsalo en la ducha de la mañana. Haz espuma y enjuaga.",
    precioVenta: 12500,
    stock: 11,
    imagen: barra("#f6eee2", "#f0b77a", "#693709"),
  },
];
