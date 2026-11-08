import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSesion } from "../estado/contextos.js";
import { useDatos } from "../estado/contextos.js";
import { Boton, Cargando, Icono, Logotipo, Rama, Vacio } from "../ui/index.jsx";
import "./shell.css";

const SECCIONES = [
  { a: "/panel", icono: "inicio", texto: "Resumen", exacto: true },
  { a: "/panel/portada", icono: "imagen", texto: "Portada" },
  { a: "/panel/contacto", icono: "whatsapp", texto: "Contacto" },
  { a: "/panel/inventario", icono: "inventario", texto: "Inventario" },
  { a: "/panel/ventas", icono: "ventas", texto: "Vender" },
  { a: "/panel/pedidos-web", icono: "caja", texto: "Pedidos web" },
  { a: "/panel/eventos", icono: "regalo", texto: "Eventos" },
  { a: "/panel/comprobantes", icono: "facturas", texto: "Comprobantes" },
];

/** En el celular caben cinco botones: estos cuatro y "Más" con el resto. */
const EN_BARRA = ["/panel", "/panel/ventas", "/panel/inventario", "/panel/eventos"];
const EN_MAS = SECCIONES.filter((s) => !EN_BARRA.includes(s.a));

export default function Shell() {
  const { usuario, salir } = useSesion();
  const { cargando, error, recargar, pedidosWeb } = useDatos();
  // Contador de pendientes por sección (hoy solo pedidos web nuevos).
  const pendientes = {
    "/panel/pedidos-web": pedidosWeb.filter((p) => (p.estado || "nuevo") === "nuevo").length,
  };
  const pendientesEnMas = EN_MAS.reduce((s, x) => s + (pendientes[x.a] || 0), 0);
  const contador = (n) => (n > 0 ? <span className="menu__contador">{n > 99 ? "99+" : n}</span> : null);
  const { pathname } = useLocation();
  const [masAbierto, setMasAbierto] = useState(false);
  const enMas = EN_MAS.some((s) => pathname.startsWith(s.a));

  return (
    <div className="shell">
      <aside className="shell__lateral no-imprimir">
        <Rama tam={210} color="var(--beige)" className="shell__rama" />

        <Logotipo tono="claro" compacto />

        <nav className="menu">
          <p className="menu__titulo">Gestión</p>
          {SECCIONES.map((s) => (
            <NavLink
              key={s.a}
              to={s.a}
              end={s.exacto}
              className={({ isActive }) => `menu__enlace ${isActive ? "activo" : ""}`}
            >
              <Icono nombre={s.icono} tam={18} />
              {s.texto}
              {contador(pendientes[s.a])}
            </NavLink>
          ))}
        </nav>

        <div className="shell__pie">
          <NavLink to="/" className="menu__enlace">
            <Icono nombre="tienda" tam={18} />
            Ver la tienda
          </NavLink>
          <p className="shell__correo">{usuario?.email}</p>
          <button className="shell__salir" onClick={salir}>
            <Icono nombre="salir" tam={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="shell__contenido">
        {cargando ? (
          <Cargando texto="ordenando el taller" />
        ) : error ? (
          <Vacio
            icono="alerta"
            titulo="No pudimos leer los datos"
            texto={error.message}
            accion={
              <Boton variante="suave" onClick={recargar}>
                Reintentar
              </Boton>
            }
          />
        ) : (
          <Outlet />
        )}
      </main>

      {masAbierto && (
        <div className="hoja-mas__velo no-imprimir" onClick={() => setMasAbierto(false)}>
          <nav className="hoja-mas" aria-label="Más secciones" onClick={(e) => e.stopPropagation()}>
            {EN_MAS.map((s) => (
              <NavLink
                key={s.a}
                to={s.a}
                className={({ isActive }) => `hoja-mas__enlace ${isActive ? "activo" : ""}`}
                onClick={() => setMasAbierto(false)}
              >
                <Icono nombre={s.icono} tam={20} />
                {s.texto}
                {contador(pendientes[s.a])}
              </NavLink>
            ))}
            <NavLink to="/" className="hoja-mas__enlace">
              <Icono nombre="tienda" tam={20} />
              Ver la tienda
            </NavLink>
            <button className="hoja-mas__enlace" onClick={salir}>
              <Icono nombre="salir" tam={20} />
              Cerrar sesión
            </button>
            <p className="hoja-mas__correo">{usuario?.email}</p>
          </nav>
        </div>
      )}

      <nav className="barra-movil no-imprimir">
        {EN_BARRA.map((a) => SECCIONES.find((s) => s.a === a)).map((s) => (
          <NavLink
            key={s.a}
            to={s.a}
            end={s.exacto}
            onClick={() => setMasAbierto(false)}
            className={({ isActive }) => `barra-movil__enlace ${isActive ? "activo" : ""}`}
          >
            <Icono nombre={s.icono} tam={20} />
            {s.texto}
          </NavLink>
        ))}
        <button
          className={`barra-movil__enlace ${enMas || masAbierto ? "activo" : ""}`}
          aria-expanded={masAbierto}
          onClick={() => setMasAbierto((v) => !v)}
        >
          <span className="barra-movil__icono">
            <Icono nombre={masAbierto ? "cerrar" : "menu"} tam={20} />
            {!masAbierto && pendientesEnMas > 0 && <span className="barra-movil__punto" aria-label={`${pendientesEnMas} pendientes`} />}
          </span>
          Más
        </button>
      </nav>
    </div>
  );
}
