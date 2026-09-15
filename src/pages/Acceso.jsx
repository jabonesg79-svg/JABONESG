import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSesion } from "../estado/contextos.js";
import { Boton, Campo, Logotipo, Rama } from "../ui/index.jsx";
import "./acceso.css";

const MENSAJES = {
  "auth/invalid-email": "Ese correo no tiene un formato válido.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "No existe una cuenta con ese correo.",
  "auth/too-many-requests": "Demasiados intentos. Espera un momento antes de reintentar.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
};

export default function Acceso() {
  const { entrar } = useSesion();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await entrar(correo.trim(), clave);
      navegar("/panel", { replace: true });
    } catch (err) {
      setError(MENSAJES[err.code] || "No pudimos iniciar sesión. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="acceso">
      <section className="acceso__relato">
        <Rama tam={230} color="var(--beige)" className="acceso__rama acceso__rama--a" />
        <Rama tam={180} color="var(--beige)" className="acceso__rama acceso__rama--b" />

        <div className="acceso__centro">
          <Logotipo tono="claro" />
          <h1 className="acceso__titular">Jabón hecho despacio,</h1>
          <p className="script acceso__firma">con amor</p>
          <p className="acceso__bajada">
            Lotes pequeños, ingredientes contados y un inventario que sabe exactamente cuántas
            barras quedan curando.
          </p>
        </div>

        <p className="acceso__nota">Panel de gestión · solo para el equipo</p>
      </section>

      <section className="acceso__panel">
        <div className="acceso__caja">
          <div className="acceso__volver">
            <Link to="/">
              <Boton variante="fantasma" tamano="pequeno">
                ← Volver a la tienda
              </Boton>
            </Link>
          </div>

          <h2 className="acceso__titulo">Entrar al panel</h2>
          <p className="acceso__sub">Usa el correo con el que administras JabonesG.</p>

          <form className="acceso__campos" onSubmit={enviar}>
            <Campo
              etiqueta="Correo"
              type="email"
              autoComplete="username"
              placeholder="nombre@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
            <Campo
              etiqueta="Contraseña"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
            />
            {error && <p className="acceso__error">{error}</p>}
            <Boton type="submit" bloque disabled={enviando} icono={enviando ? undefined : "flecha"}>
              {enviando ? "Entrando..." : "Entrar"}
            </Boton>
          </form>
        </div>
      </section>
    </div>
  );
}
