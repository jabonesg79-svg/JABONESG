import { useCallback, useEffect, useState } from "react";
import { DATOS_PEDIDO_VACIOS, MAX_LINEAS_PEDIDO } from "../lib/dominio.js";

const CLAVE = "jabonesg-carrito";

/** El navegador puede negar el almacenamiento (modo privado, datos
    bloqueados): entonces el carrito vive solo mientras la página está abierta. */
function leerGuardado() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (!crudo || !Array.isArray(crudo.lineas)) return null;
    return {
      lineas: crudo.lineas
        .filter((l) => l && typeof l.id === "string" && Number(l.cantidad) > 0)
        .slice(0, MAX_LINEAS_PEDIDO)
        .map((l) => ({ id: l.id, cantidad: Math.floor(Number(l.cantidad)), precioVisto: Number(l.precioVisto) || 0 })),
      datos: { ...DATOS_PEDIDO_VACIOS, ...(crudo.datos || {}) },
    };
  } catch {
    return null;
  }
}

/**
 * Carrito de la tienda. Cada línea guarda el id del jabón, la cantidad y el
 * precio que la clienta vio al agregarlo; ese precio solo sirve para avisarle
 * si cambió: los totales siempre salen del precio publicado.
 */
export function useCarrito() {
  const [estado, setEstado] = useState(() => leerGuardado() || { lineas: [], datos: { ...DATOS_PEDIDO_VACIOS } });

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      // Sin almacenamiento: el carrito sigue funcionando en esta visita.
    }
  }, [estado]);

  /** Suma `cantidad` sin pasar del stock. Devuelve cuántas unidades entraron.
      Lee el estado del render actual: se llama desde un toque, nunca dos veces
      en el mismo evento. */
  const agregar = (producto, cantidad) => {
    const e = estado;
    const tope = Math.max(0, Math.floor(Number(producto.stock) || 0));
    const actual = e.lineas.find((l) => l.id === producto.id);
    const yaLleva = actual?.cantidad || 0;
    const nueva = Math.min(tope, yaLleva + cantidad);
    if (nueva <= yaLleva) return 0;
    if (!actual && e.lineas.length >= MAX_LINEAS_PEDIDO) return 0;
    const precioVisto = Number(producto.precioVenta) || 0;
    const siguiente = {
      ...e,
      lineas: actual
        ? e.lineas.map((l) => (l.id === producto.id ? { ...l, cantidad: nueva, precioVisto } : l))
        : [...e.lineas, { id: producto.id, cantidad: nueva, precioVisto }],
    };
    setEstado(siguiente);
    return nueva - yaLleva;
  };

  const cambiarCantidad = useCallback((id, cantidad) => {
    setEstado((e) => ({
      ...e,
      lineas: e.lineas.map((l) => (l.id === id ? { ...l, cantidad } : l)),
    }));
  }, []);

  const quitar = useCallback((id) => {
    setEstado((e) => ({ ...e, lineas: e.lineas.filter((l) => l.id !== id) }));
  }, []);

  /** Reemplaza las líneas tras revisar stock y precios en el servidor. */
  const ajustar = useCallback((lineas) => setEstado((e) => ({ ...e, lineas })), []);

  const cambiarDato = useCallback((clave, valor) => {
    setEstado((e) => ({ ...e, datos: { ...e.datos, [clave]: valor } }));
  }, []);

  /** Tras enviar se vacían las líneas; nombre, teléfono y ciudad se quedan
      para el próximo pedido. */
  const vaciar = useCallback(({ conservarDatos = false } = {}) => {
    setEstado((e) => {
      const vacio = {
        lineas: [],
        datos: conservarDatos ? { ...e.datos, notas: "" } : { ...DATOS_PEDIDO_VACIOS },
      };
      // Se guarda ya, sin esperar al efecto: en el celular la página sale
      // hacia WhatsApp enseguida.
      try {
        localStorage.setItem(CLAVE, JSON.stringify(vacio));
      } catch {
        // Sin almacenamiento no hay nada que limpiar.
      }
      return vacio;
    });
  }, []);

  return { ...estado, agregar, cambiarCantidad, quitar, ajustar, cambiarDato, vaciar };
}

const CLAVE_ENVIO = "jabonesg-ultimo-envio";

/** Un envío por minuto desde el mismo navegador. */
export function puedeEnviar() {
  try {
    return Date.now() - Number(localStorage.getItem(CLAVE_ENVIO) || 0) > 60_000;
  } catch {
    return true;
  }
}

export function marcarEnvio() {
  try {
    localStorage.setItem(CLAVE_ENVIO, String(Date.now()));
  } catch {
    // Sin almacenamiento no hay límite; el campo trampa sigue activo.
  }
}
