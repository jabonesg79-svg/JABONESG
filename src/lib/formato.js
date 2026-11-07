const pesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const numero = new Intl.NumberFormat("es-CO");

export const money = (valor) => pesos.format(Number(valor) || 0);

export const num = (valor) => numero.format(Number(valor) || 0);

export const fechaCorta = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
};

export const fechaLarga = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const hoyISO = () => new Date().toISOString();

export const diaISO = (iso = new Date().toISOString()) => String(iso).slice(0, 10);

/** Margen porcentual sobre el precio de venta. */
export const margen = (precioVenta, costo) => {
  const pv = Number(precioVenta) || 0;
  const c = Number(costo) || 0;
  if (!pv) return 0;
  return Math.round(((pv - c) / pv) * 100);
};

/** Slug corto y estable para códigos de producto. */
export const slug = (texto) =>
  String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* ---------- Contacto ---------- */

/** Solo dígitos, con indicativo de Colombia si llega un celular de 10 cifras. */
export const numeroWhatsApp = (numero) => {
  const digitos = String(numero || "").replace(/\D/g, "");
  return digitos.length === 10 && digitos.startsWith("3") ? `57${digitos}` : digitos;
};

/** Enlace a un chat de WhatsApp, con mensaje prellenado opcional. Vacío si no hay número. */
export const enlaceWhatsApp = (numero, mensaje = "") => {
  const destino = numeroWhatsApp(numero);
  if (!destino) return "";
  return `https://wa.me/${destino}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
};

/** "573113509187" se muestra como "+57 311 350 9187". */
export const telefonoLegible = (numero) => {
  const d = numeroWhatsApp(numero);
  if (d.length === 12 && d.startsWith("57")) {
    return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  }
  return d ? `+${d}` : "";
};

/** Acepta "@cuenta", "cuenta" o el enlace completo. */
export const enlaceInstagram = (valor) => {
  const v = String(valor || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://instagram.com/${v.replace(/^@/, "")}`;
};
