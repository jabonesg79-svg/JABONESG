import { useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import { CONTACTO_POR_DEFECTO, MAX_TESTIMONIOS, TESTIMONIO_VACIO } from "../lib/dominio.js";
import { enlaceInstagram, enlaceWhatsApp, telefonoLegible } from "../lib/formato.js";
import { Area, Boton, Campo, Icono, Tarjeta } from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import "./panel.css";

export default function Contacto() {
  const { contacto, guardarContacto, testimonios, guardarTestimonios } = useDatos();
  const avisar = useAviso();
  const [form, setForm] = useState(contacto);
  const [guardando, setGuardando] = useState(false);
  const [lista, setLista] = useState(testimonios);
  const [guardandoLista, setGuardandoLista] = useState(false);

  const listaCambio = JSON.stringify(lista) !== JSON.stringify(testimonios);
  const aMedias = lista.filter((t) => !t.nombre.trim() || !t.texto.trim()).length;

  const cambiarTestimonio = (i, clave) => (e) =>
    setLista((l) => l.map((t, j) => (j === i ? { ...t, [clave]: e.target.value } : t)));

  const guardarLista = async () => {
    setGuardandoLista(true);
    try {
      setLista(await guardarTestimonios(lista));
      avisar("Testimonios actualizados", "exito");
    } catch (err) {
      console.error("[testimonios] falló el guardado", err);
      avisar(`No se pudo guardar: ${err?.code || err?.message || err}`, "peligro");
    } finally {
      setGuardandoLista(false);
    }
  };

  const campo = (clave) => (e) => setForm((f) => ({ ...f, [clave]: e.target.value }));

  const hayCambios = useMemo(
    () => Object.keys(CONTACTO_POR_DEFECTO).some((k) => (form[k] ?? "") !== (contacto[k] ?? "")),
    [form, contacto],
  );

  const whatsapp = enlaceWhatsApp(form.whatsapp);
  const instagram = enlaceInstagram(form.instagram);

  const guardar = async () => {
    setGuardando(true);
    try {
      setForm(await guardarContacto(form));
      avisar("Contacto actualizado", "exito");
    } catch (err) {
      console.error("[contacto] falló el guardado", err);
      avisar(`No se pudo guardar: ${err?.code || err?.message || err}`, "peligro");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <header className="cabecera-pagina">
        <div>
          <h1>Contacto</h1>
          <p>WhatsApp, Instagram y testimonios de la tienda.</p>
        </div>
        <div className="cabecera-pagina__acciones">
          <Boton onClick={guardar} disabled={guardando || !hayCambios} icono="chequeo">
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Boton>
        </div>
      </header>

      <Tarjeta className="bloque">
        <div className="bloque__cuerpo--aire portada__campos">
          <Campo
            etiqueta="WhatsApp"
            value={form.whatsapp || ""}
            onChange={campo("whatsapp")}
            placeholder="573113509187"
            inputMode="tel"
            pista={
              whatsapp ? (
                <>
                  Se abrirá un chat con {telefonoLegible(form.whatsapp)} ·{" "}
                  <a href={whatsapp} target="_blank" rel="noreferrer noopener">
                    probar
                  </a>
                </>
              ) : (
                "Sin número, la tienda no muestra botones de WhatsApp"
              )
            }
          />
          <Campo
            etiqueta="Instagram"
            value={form.instagram || ""}
            onChange={campo("instagram")}
            placeholder="@jabonesg"
            pista={
              instagram ? (
                <a href={instagram} target="_blank" rel="noreferrer noopener">
                  {instagram}
                </a>
              ) : (
                "Cuenta o enlace completo. Vacío, no aparece en el pie."
              )
            }
          />
        </div>
      </Tarjeta>

      <Tarjeta className="bloque" style={{ marginTop: 24 }}>
        <div className="bloque__cabecera">
          <h2 className="bloque__titulo">Testimonios</h2>
          <Boton
            tamano="pequeno"
            icono="chequeo"
            onClick={guardarLista}
            disabled={guardandoLista || !listaCambio}
          >
            {guardandoLista ? "Guardando..." : "Guardar testimonios"}
          </Boton>
        </div>

        <div className="bloque__cuerpo--aire portada__campos">
          <p className="campo__pista">
            Solo testimonios reales, con permiso de quien los dio. Mientras no haya ninguno
            guardado, la sección no aparece en la tienda. Máximo {MAX_TESTIMONIOS}.
          </p>

          {lista.map((t, i) => (
            <div key={i} className="testimonio-editor">
              <div className="portada__par">
                <Campo etiqueta="Nombre" value={t.nombre} onChange={cambiarTestimonio(i, "nombre")} />
                <Campo
                  etiqueta="Ciudad (opcional)"
                  value={t.ciudad}
                  onChange={cambiarTestimonio(i, "ciudad")}
                />
              </div>
              <Area
                etiqueta="Testimonio"
                value={t.texto}
                onChange={cambiarTestimonio(i, "texto")}
                maxLength={280}
                pista={`${t.texto.length} de 280 caracteres`}
              />
              <Boton
                variante="fantasma"
                tamano="pequeno"
                icono="basura"
                onClick={() => setLista((l) => l.filter((_, j) => j !== i))}
              >
                Quitar
              </Boton>
            </div>
          ))}

          {lista.length < MAX_TESTIMONIOS && (
            <Boton
              variante="contorno"
              icono="mas"
              style={{ alignSelf: "flex-start" }}
              onClick={() => setLista((l) => [...l, { ...TESTIMONIO_VACIO }])}
            >
              Agregar testimonio
            </Boton>
          )}

          {aMedias > 0 && (
            <p className="portada__error">
              <Icono nombre="alerta" tam={13} grosor={2.2} /> {aMedias}{" "}
              {aMedias === 1 ? "testimonio no tiene" : "testimonios no tienen"} nombre o texto y
              no se guardará.
            </p>
          )}
        </div>
      </Tarjeta>
    </>
  );
}
