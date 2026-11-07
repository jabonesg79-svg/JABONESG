import { useMemo, useState } from "react";
import { useDatos } from "../estado/contextos.js";
import { CONTACTO_POR_DEFECTO } from "../lib/dominio.js";
import { enlaceInstagram, enlaceWhatsApp, telefonoLegible } from "../lib/formato.js";
import { Boton, Campo, Tarjeta } from "../ui/index.jsx";
import { useAviso } from "../ui/contextoAvisos.js";
import "./panel.css";

export default function Contacto() {
  const { contacto, guardarContacto } = useDatos();
  const avisar = useAviso();
  const [form, setForm] = useState(contacto);
  const [guardando, setGuardando] = useState(false);

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
          <p>Los botones de WhatsApp y los enlaces del pie de la tienda salen de aquí.</p>
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
    </>
  );
}
