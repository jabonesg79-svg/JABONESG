import { NavLink, Outlet } from "react-router-dom";
import { useSesion } from "../estado/contextos.js";
import { useDatos } from "../estado/contextos.js";
import { Boton, Cargando, Icono, Logotipo, Rama, Vacio } from "../ui/index.jsx";
import "./shell.css";

const SECCIONES = [
  { a: "/panel", icono: "inicio", texto: "Resumen", exacto: true },
  { a: "/panel/portada", icono: "imagen", texto: "Portada" },
  { a: "/panel/inventario", icono: "inventario", texto: "Inventario" },
  { a: "/panel/ventas", icono: "ventas", texto: "Vender" },
  { a: "/panel/facturas", icono: "facturas", texto: "Facturas" },
];

export default function Shell() {
  const { usuario, salir } = useSesion();
  const { cargando, error, recargar } = useDatos();

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

      <nav className="barra-movil no-imprimir">
        {SECCIONES.map((s) => (
          <NavLink
            key={s.a}
            to={s.a}
            end={s.exacto}
            className={({ isActive }) => `barra-movil__enlace ${isActive ? "activo" : ""}`}
          >
            <Icono nombre={s.icono} tam={20} />
            {s.texto}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
