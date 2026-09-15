const TRAZOS = {
  inicio: "M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z",
  inventario: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  ventas: "M6 2h12l1 6H5zM5 8h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z",
  facturas: "M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  tienda: "M4 9h16l-1 11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 9V6a3 3 0 0 1 6 0v3",
  buscar: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4",
  mas: "M12 5v14M5 12h14",
  menos: "M5 12h14",
  lapiz: "M4 20h4L20 8l-4-4L4 16z",
  basura: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  cerrar: "M6 6l12 12M18 6L6 18",
  chequeo: "M4 12l5 5L20 6",
  alerta: "M12 3l9 17H3zM12 10v4M12 17v.5",
  gota: "M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z",
  hoja: "M20 4C10 4 4 9 4 16c0 2 1 4 1 4s3-9 15-11c0 0-6 3-9 11 8 1 13-4 9-16z",
  grafico: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  caja: "M3 8h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 8l2-5h14l2 5M12 8v14",
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  candado: "M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4",
  correo: "M3 6h18v12H3zM3 7l9 6 9-6",
  flecha: "M5 12h14M13 6l6 6-6 6",
  descarga: "M12 4v12M7 11l5 5 5-5M4 20h16",
  reloj: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2",
  corazon: "M12 20c-6-4.4-9-7.6-9-11a4.9 4.9 0 0 1 9-2.2A4.9 4.9 0 0 1 21 9c0 3.4-3 6.6-9 11z",
  etiqueta: "M3 12V4h8l9 9-8 8-9-9zM7.5 7.5h.01",
  balanza: "M12 4v16M6 8h12M6 8l-3 6h6zM18 8l3 6h-6zM8 20h8",
  frasco: "M9 3h6v5l4 9a3 3 0 0 1-3 4H8a3 3 0 0 1-3-4l4-9z",
};

export default function Icono({ nombre, tam = 20, grosor = 1.7, ...resto }) {
  const d = TRAZOS[nombre] || TRAZOS.gota;
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...resto}
    >
      <path d={d} />
    </svg>
  );
}
