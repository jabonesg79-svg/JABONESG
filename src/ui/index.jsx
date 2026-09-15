import { useCallback, useEffect, useMemo, useState } from "react";
import Icono from "./Icono.jsx";
import { Monograma } from "./Marca.jsx";
import { AvisosCtx } from "./contextoAvisos.js";
import "./ui.css";

export { default as Icono } from "./Icono.jsx";
export { LogoImagen, Logotipo, Monograma, Onda, Rama } from "./Marca.jsx";

export function Boton({ variante = "primario", tamano, bloque, icono, children, ...resto }) {
  const clases = [
    "boton",
    `boton--${variante}`,
    tamano === "pequeno" ? "boton--pequeno" : "",
    bloque ? "boton--bloque" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={clases} {...resto}>
      {icono && <Icono nombre={icono} tam={tamano === "pequeno" ? 15 : 17} />}
      {children}
    </button>
  );
}

export function Campo({ etiqueta, pista, children, ...resto }) {
  return (
    <label className="campo">
      {etiqueta && <span className="campo__etiqueta">{etiqueta}</span>}
      {children || <input className="campo__control" {...resto} />}
      {pista && <span className="campo__pista">{pista}</span>}
    </label>
  );
}

export function Area({ etiqueta, pista, ...resto }) {
  return (
    <Campo etiqueta={etiqueta} pista={pista}>
      <textarea className="campo__control campo__control--area" {...resto} />
    </Campo>
  );
}

export function Selector({ etiqueta, opciones = [], pista, ...resto }) {
  return (
    <Campo etiqueta={etiqueta} pista={pista}>
      <select className="campo__control" {...resto}>
        {opciones.map((o) => {
          const valor = typeof o === "string" ? o : o.id;
          const texto = typeof o === "string" ? o : o.etiqueta;
          return (
            <option key={valor} value={valor}>
              {texto}
            </option>
          );
        })}
      </select>
    </Campo>
  );
}

export function Buscador({ valor, alCambiar, placeholder = "Buscar..." }) {
  return (
    <div className="buscador">
      <Icono nombre="buscar" tam={18} />
      <input
        className="campo__control"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </div>
  );
}

export function Insignia({ tono = "neutra", icono, children }) {
  return (
    <span className={`insignia insignia--${tono}`}>
      {icono && <Icono nombre={icono} tam={12} grosor={2} />}
      {children}
    </span>
  );
}

export function Tarjeta({ relieve, plana, className = "", children, ...resto }) {
  const clases = [
    "tarjeta",
    relieve ? "tarjeta--relieve" : "",
    plana ? "tarjeta--plana" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={clases} {...resto}>
      {children}
    </div>
  );
}

export function Modal({ titulo, ancho, alCerrar, pie, children }) {
  useEffect(() => {
    const alTeclear = (e) => e.key === "Escape" && alCerrar?.();
    window.addEventListener("keydown", alTeclear);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = previo;
    };
  }, [alCerrar]);

  return (
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar?.()}>
      <div className={`modal ${ancho ? "modal--ancho" : ""}`} role="dialog" aria-modal="true">
        <header className="modal__cabecera">
          <h2 className="modal__titulo">{titulo}</h2>
          <Boton variante="fantasma" onClick={alCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tam={18} />
          </Boton>
        </header>
        <div className="modal__cuerpo">{children}</div>
        {pie && <footer className="modal__pie">{pie}</footer>}
      </div>
    </div>
  );
}

export function Vacio({ icono = "gota", titulo, texto, accion }) {
  return (
    <div className="vacio">
      <div className="vacio__icono">
        <Icono nombre={icono} tam={26} />
      </div>
      <p className="vacio__titulo">{titulo}</p>
      {texto && <p className="vacio__texto">{texto}</p>}
      {accion}
    </div>
  );
}

export function Cargando({ texto = "preparando la mezcla" }) {
  return (
    <div className="cargando">
      <div className="cargando__marca">
        <Monograma tam={62} />
      </div>
      <p className="cargando__texto">{texto}</p>
    </div>
  );
}

/* ---------- Avisos ---------- */

export function ProveedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([]);

  const avisar = useCallback((texto, tono = "neutro") => {
    const id = Math.random().toString(36).slice(2);
    setAvisos((a) => [...a, { id, texto, tono }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3600);
  }, []);

  const valor = useMemo(() => avisar, [avisar]);

  return (
    <AvisosCtx.Provider value={valor}>
      {children}
      <div className="avisos no-imprimir">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso aviso--${a.tono}`}>
            <Icono nombre={a.tono === "peligro" ? "alerta" : "chequeo"} tam={16} grosor={2.2} />
            {a.texto}
          </div>
        ))}
      </div>
    </AvisosCtx.Provider>
  );
}
