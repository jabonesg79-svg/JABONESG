import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ProveedorAvisos } from "./ui/index.jsx";
import { ProveedorSesion } from "./estado/Sesion.jsx";
import { ProveedorDatos } from "./estado/Datos.jsx";
import "./styles/base.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorAvisos>
        <ProveedorSesion>
          <ProveedorDatos>
            <App />
          </ProveedorDatos>
        </ProveedorSesion>
      </ProveedorAvisos>
    </BrowserRouter>
  </StrictMode>,
);
