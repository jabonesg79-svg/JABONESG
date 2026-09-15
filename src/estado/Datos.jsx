import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actualizarProducto,
  borrarProducto,
  crearProducto,
  leerFacturas,
  leerProductos,
  leerVentas,
  registrarVenta,
} from "../lib/datos.js";
import { DatosCtx, useSesion } from "./contextos.js";

/** El visitante solo puede (y solo necesita) leer el catálogo;
    el panel carga además ventas y facturas. */
const traerTodo = (hayUsuario) =>
  hayUsuario
    ? Promise.all([leerProductos(), leerVentas(), leerFacturas()])
    : leerProductos().then((productos) => [productos, [], []]);

export function ProveedorDatos({ children }) {
  const { usuario } = useSesion();
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (usuario === undefined) return undefined;

    let vigente = true;

    traerTodo(Boolean(usuario))
      .then(([p, v, f]) => {
        if (!vigente) return;
        setProductos(p);
        setVentas(v);
        setFacturas(f);
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

  const guardarProducto = useCallback(async (datos, id) => {
    if (id) {
      const cambios = await actualizarProducto(id, datos);
      setProductos((lista) => lista.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
      return id;
    }
    const nuevo = await crearProducto(datos);
    setProductos((lista) => [nuevo, ...lista]);
    return nuevo.id;
  }, []);

  const eliminarProducto = useCallback(async (id) => {
    await borrarProducto(id);
    setProductos((lista) => lista.filter((p) => p.id !== id));
  }, []);

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
      cargando,
      error,
      recargar,
      guardarProducto,
      eliminarProducto,
      venderCarrito,
      setFacturas,
    }),
    [
      productos,
      ventas,
      facturas,
      cargando,
      error,
      recargar,
      guardarProducto,
      eliminarProducto,
      venderCarrito,
    ],
  );

  return <DatosCtx.Provider value={valor}>{children}</DatosCtx.Provider>;
}
