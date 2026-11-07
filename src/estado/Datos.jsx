import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actualizarProducto,
  anularComprobante as anularComprobanteEnFirestore,
  borrarProducto,
  crearProducto,
  borrarPedidoEvento,
  guardarConfigEventos as guardarConfigEventosEnFirestore,
  guardarContacto as guardarContactoEnFirestore,
  guardarPedidoEvento as guardarPedidoEventoEnFirestore,
  guardarPortada as guardarPortadaEnFirestore,
  guardarTestimonios as guardarTestimoniosEnFirestore,
  leerConfigEventos,
  leerContacto,
  leerPedidosEventos,
  leerTestimonios,
  leerFacturas,
  leerPortada,
  leerProductos,
  leerVentas,
  registrarVenta,
} from "../lib/datos.js";
import {
  CONFIG_EVENTOS_POR_DEFECTO,
  CONTACTO_POR_DEFECTO,
  PORTADA_POR_DEFECTO,
} from "../lib/dominio.js";
import { DatosCtx, useSesion } from "./contextos.js";

/** El visitante solo lee lo que pinta la tienda; el panel carga además
    ventas, comprobantes y pedidos de eventos. */
const traerTodo = async (hayUsuario) => {
  const [productos, portada, contacto, testimonios, configEventos] = await Promise.all([
    leerProductos(),
    // En el panel se lee siempre del servidor: quien edita debe ver el
    // documento real, no una copia guardada en la pestaña.
    leerPortada({ sinCache: hayUsuario }),
    leerContacto(),
    leerTestimonios(),
    leerConfigEventos(),
  ]);
  if (!hayUsuario) {
    return { productos, portada, contacto, testimonios, configEventos, ventas: [], facturas: [], pedidosEventos: [] };
  }
  const [ventas, facturas, pedidosEventos] = await Promise.all([
    leerVentas(),
    leerFacturas(),
    leerPedidosEventos(),
  ]);
  return { productos, portada, contacto, testimonios, configEventos, ventas, facturas, pedidosEventos };
};

export function ProveedorDatos({ children }) {
  const { usuario } = useSesion();
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [facturas, setFacturas] = useState([]);
  // Arranca con los valores por defecto para que el hero pinte desde el
  // primer frame y no salte cuando llegue la configuración.
  const [portada, setPortada] = useState(PORTADA_POR_DEFECTO);
  const [contacto, setContacto] = useState(CONTACTO_POR_DEFECTO);
  const [testimonios, setTestimonios] = useState([]);
  const [pedidosEventos, setPedidosEventos] = useState([]);
  const [configEventos, setConfigEventos] = useState(CONFIG_EVENTOS_POR_DEFECTO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (usuario === undefined) return undefined;

    let vigente = true;

    traerTodo(Boolean(usuario))
      .then((d) => {
        if (!vigente) return;
        setProductos(d.productos);
        setVentas(d.ventas);
        setFacturas(d.facturas);
        if (d.portada) setPortada(d.portada);
        if (d.contacto) setContacto(d.contacto);
        setTestimonios(d.testimonios || []);
        setPedidosEventos(d.pedidosEventos || []);
        if (d.configEventos) setConfigEventos(d.configEventos);
        setError(null);
        setCargando(false);
      })
      .catch((e) => {
        if (!vigente) return;
        setError(e);
        setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [usuario, intento]);

  /** Vuelve a pedir todo. Lo dispara la interfaz, nunca un efecto. */
  const recargar = useCallback(() => {
    setCargando(true);
    setError(null);
    setIntento((n) => n + 1);
  }, []);

  /** `esNuevo` con `id`: crea el producto con un id reservado de antemano (el
      de sus fotos). Sin `id`: lo crea con uno nuevo. Con `id` solo: lo actualiza. */
  const guardarProducto = useCallback(async (datos, id, esNuevo = false) => {
    if (id && !esNuevo) {
      const cambios = await actualizarProducto(id, datos);
      setProductos((lista) => lista.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
      return id;
    }
    const nuevo = await crearProducto(datos, id);
    setProductos((lista) => [nuevo, ...lista]);
    return nuevo.id;
  }, []);

  const eliminarProducto = useCallback(async (id) => {
    await borrarProducto(id);
    setProductos((lista) => lista.filter((p) => p.id !== id));
  }, []);

  const guardarPortada = useCallback(async (datos) => {
    const guardada = await guardarPortadaEnFirestore(datos);
    setPortada(guardada);
    return guardada;
  }, []);

  const guardarContacto = useCallback(async (datos) => {
    const guardado = await guardarContactoEnFirestore(datos);
    setContacto(guardado);
    return guardado;
  }, []);

  const guardarTestimonios = useCallback(async (lista) => {
    const guardados = await guardarTestimoniosEnFirestore(lista);
    setTestimonios(guardados);
    return guardados;
  }, []);

  const guardarPedidoEvento = useCallback(async (datos, id) => {
    const guardado = await guardarPedidoEventoEnFirestore(datos, id);
    setPedidosEventos((lista) =>
      id ? lista.map((p) => (p.id === id ? { ...p, ...guardado } : p)) : [guardado, ...lista],
    );
    return guardado;
  }, []);

  const eliminarPedidoEvento = useCallback(async (id) => {
    await borrarPedidoEvento(id);
    setPedidosEventos((lista) => lista.filter((p) => p.id !== id));
  }, []);

  const guardarConfigEventos = useCallback(async (datos) => {
    const guardada = await guardarConfigEventosEnFirestore(datos);
    setConfigEventos(guardada);
    return guardada;
  }, []);

  const anularComprobante = useCallback(
    async (factura, motivo) => {
      const lineas = ventas.filter((v) => v.ticket === factura.ticket && !v.anulada);
      const { fechaAnulacion, devuelto } = await anularComprobanteEnFirestore({
        factura,
        lineas,
        idsProductos: new Set(productos.map((p) => p.id)),
        motivo,
      });
      const cambios = {
        anulada: true,
        motivoAnulacion: motivo,
        fechaAnulacion,
        ...(factura.estadoCredito === "abierto" ? { estadoCredito: "anulado" } : {}),
      };
      setFacturas((lista) => lista.map((f) => (f.id === factura.id ? { ...f, ...cambios } : f)));
      setVentas((lista) => lista.map((v) => (v.ticket === factura.ticket ? { ...v, anulada: true } : v)));
      setProductos((lista) =>
        lista.map((p) => (p.id in devuelto ? { ...p, stock: (Number(p.stock) || 0) + devuelto[p.id] } : p)),
      );
      return { ...factura, ...cambios, devuelto };
    },
    [ventas, productos],
  );

  const venderCarrito = useCallback(async (datos) => {
    const resultado = await registrarVenta(datos);
    setVentas((lista) => [...resultado.ventas, ...lista]);
    setFacturas((lista) => [resultado.factura, ...lista]);
    setProductos((lista) =>
      lista.map((p) =>
        p.id in resultado.stockPorProducto ? { ...p, stock: resultado.stockPorProducto[p.id] } : p,
      ),
    );
    return resultado;
  }, []);

  const valor = useMemo(
    () => ({
      productos,
      ventas,
      facturas,
      portada,
      contacto,
      testimonios,
      pedidosEventos,
      configEventos,
      cargando,
      error,
      recargar,
      guardarProducto,
      eliminarProducto,
      guardarPortada,
      guardarContacto,
      guardarTestimonios,
      guardarPedidoEvento,
      eliminarPedidoEvento,
      guardarConfigEventos,
      anularComprobante,
      venderCarrito,
      setFacturas,
    }),
    [
      productos,
      ventas,
      facturas,
      portada,
      contacto,
      testimonios,
      pedidosEventos,
      configEventos,
      cargando,
      error,
      recargar,
      guardarProducto,
      eliminarProducto,
      guardarPortada,
      guardarContacto,
      guardarTestimonios,
      guardarPedidoEvento,
      eliminarPedidoEvento,
      guardarConfigEventos,
      anularComprobante,
      venderCarrito,
    ],
  );

  return <DatosCtx.Provider value={valor}>{children}</DatosCtx.Provider>;
}
