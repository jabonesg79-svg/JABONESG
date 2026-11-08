import { limitarCantidad, topeCantidad } from "../lib/dominio.js";
import { money } from "../lib/formato.js";
import { Icono } from "../ui/index.jsx";

/**
 * Selector − 1 + para elegir cuántos jabones pedir, con el total debajo.
 * No se muestra para agotados (quien llama decide). `conTotal` deja ver el
 * total aunque se pida uno solo; en la tarjeta del catálogo sobra.
 */
export default function SelectorCantidad({ producto: p, cantidad, alCambiar, conTotal = false, grande = false }) {
  const tope = topeCantidad(p);
  const precio = Number(p.precioVenta) || 0;
  const enTope = cantidad >= tope;

  return (
    <div className={`cantidad ${grande ? "cantidad--grande" : ""}`}>
      <div className="cantidad__control" role="group" aria-label={`Cantidad de ${p.nombre}`}>
        <button
          type="button"
          className="cantidad__boton"
          onClick={() => alCambiar(limitarCantidad(cantidad - 1, p))}
          disabled={cantidad <= 1}
          aria-label="Una unidad menos"
        >
          <Icono nombre="menos" tam={16} grosor={2} />
        </button>
        <output className="cantidad__valor" aria-live="polite">
          {cantidad}
        </output>
        <button
          type="button"
          className="cantidad__boton"
          onClick={() => alCambiar(limitarCantidad(cantidad + 1, p))}
          disabled={enTope}
          aria-label="Una unidad más"
        >
          <Icono nombre="mas" tam={16} grosor={2} />
        </button>
      </div>

      {enTope && <p className="cantidad__aviso">Solo quedan {tope}</p>}

      {(conTotal || cantidad > 1) && (
        <p className="cantidad__total">
          {cantidad} × {money(precio)} = <strong>{money(cantidad * precio)}</strong>
        </p>
      )}
    </div>
  );
}
