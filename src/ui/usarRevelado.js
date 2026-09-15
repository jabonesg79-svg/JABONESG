import { useEffect } from "react";

/**
 * Revela los elementos marcados con la clase `revelar` cuando entran en pantalla.
 * Cada elemento se anima una sola vez: al revelarse deja de observarse.
 *
 * Se apoya en una clase CSS en vez de estado de React para no re-renderizar
 * la lista completa en cada scroll.
 */
export function usarRevelado(dependencias = []) {
  useEffect(() => {
    const objetivos = document.querySelectorAll(".revelar:not(.visible)");
    if (objetivos.length === 0) return undefined;

    // Sin soporte o con movimiento reducido, se muestra todo de una vez.
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sinMovimiento || typeof IntersectionObserver === "undefined") {
      objetivos.forEach((el) => el.classList.add("visible"));
      return undefined;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    objetivos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);
}
