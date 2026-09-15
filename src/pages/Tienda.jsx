import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../estado/contextos.js";
import { LINEAS } from "../lib/dominio.js";
import { money } from "../lib/formato.js";
import {
  Boton,
  Buscador,
  Cargando,
  Icono,
  Insignia,
  Logotipo,
  Onda,
  Rama,
  Tarjeta,
  Vacio,
} from "../ui/index.jsx";
import "./tienda.css";

const VALORES = [
  { icono: "hoja", texto: "100% naturales" },
  { icono: "corazon", texto: "Hechos a mano" },
  { icono: "frasco", texto: "Ingredientes seleccionados" },
];

export default function Tienda() {
  const { productos, cargando } = useDatos();
  const [busqueda, setBusqueda] = useState("");
  const [linea, setLinea] = useState("todas");

  const publicados = useMemo(
    () => productos.filter((p) => p.publicado !== false),
    [productos],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return publicados
      .filter((p) => (linea === "todas" ? true : p.linea === linea))
      .filter((p) =>
        !q
          ? true
          : [p.nombre, p.descripcion, p.aroma, p.linea, p.codigo]
              .filter(Boolean)
              .some((campo) => String(campo).toLowerCase().includes(q)),
      );
  }, [publicados, busqueda, linea]);

  const lineasDisponibles = useMemo(
    () => LINEAS.filter((l) => publicados.some((p) => p.linea === l)),
    [publicados],
  );

  return (
    <div className="tienda">
      <header className="tienda__barra no-imprimir">
        <div className="contenedor">
          <Logotipo compacto />
          <Link to="/acceso">
            <Boton variante="contorno" tamano="pequeno" icono="candado">
              Panel
            </Boton>
          </Link>
        </div>
      </header>

      <section className="portada">
        <Rama tam={190} className="portada__rama portada__rama--izq" />
        <Rama tam={150} className="portada__rama portada__rama--der" />

        <div className="contenedor portada__inner">
          <span className="portada__sello">
            <Icono nombre="hoja" tam={13} />
            {publicados.length} jabones en catálogo
          </span>

          <h1 className="portada__titulo">Jabones artesanales</h1>
          <p className="script portada__firma">hechos con amor</p>

          <p className="portada__texto">
            Lotes pequeños, aceites vegetales y aromas naturales. Cada barra se corta, se cura y
            se empaca a mano, una por una.
          </p>

          <div className="portada__valores">
            {VALORES.map((v) => (
              <span key={v.texto}>
                <Icono nombre={v.icono} tam={14} />
                {v.texto}
              </span>
            ))}
          </div>
        </div>

        <Onda color="var(--marfil)" alto={52} />
      </section>

      <div className="contenedor catalogo">
        <div className="catalogo__cabecera">
          <div>
            <h2 className="catalogo__titulo">Nuestro catálogo</h2>
            <p className="catalogo__conteo">
              {visibles.length} {visibles.length === 1 ? "jabón" : "jabones"}
              {linea !== "todas" ? ` en ${linea.toLowerCase()}` : ""}
            </p>
          </div>
          <div style={{ minWidth: 260, flex: "0 1 340px" }}>
            <Buscador
              valor={busqueda}
              alCambiar={setBusqueda}
              placeholder="Buscar por nombre o aroma..."
            />
          </div>
        </div>

        {lineasDisponibles.length > 0 && (
          <div className="chips">
            <button
              className={`chip ${linea === "todas" ? "activo" : ""}`}
              onClick={() => setLinea("todas")}
            >
              Todos
            </button>
            {lineasDisponibles.map((l) => (
              <button
                key={l}
                className={`chip ${linea === l ? "activo" : ""}`}
                onClick={() => setLinea(l)}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {cargando ? (
          <Cargando texto="sacando los jabones del molde" />
        ) : visibles.length === 0 ? (
          <Vacio
            icono="caja"
            titulo="Todavía no hay jabones aquí"
            texto="Pronto publicaremos el próximo lote. Vuelve en unos días."
          />
        ) : (
          <div className="rejilla">
            {visibles.map((p) => (
              <Tarjeta key={p.id} className="pieza aparecer">
                <div className="pieza__foto">
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} loading="lazy" />
                  ) : (
                    <Icono nombre="gota" tam={46} grosor={1} />
                  )}
                  {Number(p.stock) <= 0 && (
                    <span className="pieza__marca">
                      <Insignia tono="peligro">Agotado</Insignia>
                    </span>
                  )}
                  {p.pesoGramos ? <span className="pieza__peso">{p.pesoGramos} g</span> : null}
                </div>

                <div className="pieza__cuerpo">
                  <div>
                    <p className="pieza__linea">{p.linea || "Artesanal"}</p>
                    <p className="pieza__nombre">{p.nombre}</p>
                  </div>
                  <p className="pieza__desc">
                    {p.descripcion || (p.aroma ? `Aroma ${p.aroma.toLowerCase()}.` : "")}
                  </p>
                  <div className="pieza__fila">
                    <span className="pieza__precio">{money(p.precioVenta)}</span>
                    {Number(p.stock) > 0 && <Insignia tono="salvia">Disponible</Insignia>}
                  </div>
                </div>
              </Tarjeta>
            ))}
          </div>
        )}
      </div>

      <footer className="tienda__pie">
        <div className="contenedor">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Logotipo tono="claro" />
          </div>
          <div className="filete">
            <Icono nombre="corazon" tam={13} />
          </div>
          <p className="script">Bienestar en cada detalle</p>
          <p style={{ marginTop: 10 }}>
            JabonesG · jabones artesanales © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
