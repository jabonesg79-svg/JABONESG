import { Navigate, Route, Routes } from "react-router-dom";
import { useSesion } from "./estado/contextos.js";
import { Cargando } from "./ui/index.jsx";
import Shell from "./pages/Shell.jsx";
import Tienda from "./pages/Tienda.jsx";
import Acceso from "./pages/Acceso.jsx";
import Resumen from "./pages/Resumen.jsx";
import Inventario from "./pages/Inventario.jsx";
import Ventas from "./pages/Ventas.jsx";
import Facturas from "./pages/Facturas.jsx";

function Privado({ children }) {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/acceso" replace />;
  return children;
}

export default function App() {
  const { usuario, cargando } = useSesion();

  return (
    <Routes>
      <Route path="/" element={<Tienda />} />
      {/* /admin es la entrada publicada; /acceso se mantiene para no romper
          enlaces anteriores. */}
      {["/admin", "/acceso"].map((ruta) => (
        <Route
          key={ruta}
          path={ruta}
          element={cargando ? <Cargando /> : usuario ? <Navigate to="/panel" replace /> : <Acceso />}
        />
      ))}
      <Route
        path="/panel"
        element={
          <Privado>
            <Shell />
          </Privado>
        }
      >
        <Route index element={<Resumen />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="facturas" element={<Facturas />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
