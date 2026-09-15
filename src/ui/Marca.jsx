/* Elementos gráficos de marca: el monograma con laurel, el logotipo completo
   y los adornos orgánicos (ondas y ramas) que separan secciones. */

export function Monograma({ tam = 44, color = "currentColor" }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 100 100"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Rama izquierda */}
      <path d="M26 34c-8 6-11 15-10 26" strokeWidth="2.4" />
      <path
        d="M22 44c-4-2-8-1-10 2 3 2 7 2 10-2zM19 52c-4-1-8 1-9 4 4 1 7 0 9-4zM18 60c-4 0-7 2-8 6 4 0 7-2 8-6z"
        strokeWidth="1.8"
      />
      {/* Rama derecha */}
      <path d="M74 34c8 6 11 15 10 26" strokeWidth="2.4" />
      <path
        d="M78 44c4-2 8-1 10 2-3 2-7 2-10-2zM81 52c4-1 8 1 9 4-4 1-7 0-9-4zM82 60c4 0 7 2 8 6-4 0-7-2-8-6z"
        strokeWidth="1.8"
      />
      {/* Corazón al pie */}
      <path
        d="M50 82c-5-4-9-7-9-11a4.4 4.4 0 0 1 9-1.6A4.4 4.4 0 0 1 59 71c0 4-4 7-9 11z"
        strokeWidth="2"
      />
      {/* G */}
      <path
        d="M64 32a20 20 0 1 0 0 22h-12"
        strokeWidth="5"
        fill="none"
      />
    </svg>
  );
}

export function Logotipo({ tono = "cacao", compacto = false }) {
  const color = tono === "claro" ? "var(--marfil)" : "var(--cacao)";
  const suave = tono === "claro" ? "rgba(248,244,239,0.72)" : "var(--taupe)";
  const acento = tono === "claro" ? "var(--beige)" : "var(--caramelo)";

  return (
    <div className="logotipo" style={{ color }}>
      <Monograma tam={compacto ? 38 : 46} />
      <div>
        <p className="logotipo__nombre">JabonesG</p>
        {compacto ? (
          <p className="logotipo__sub" style={{ color: suave }}>
            Artesanales
          </p>
        ) : (
          <p className="script logotipo__frase" style={{ color: acento }}>
            hechos con amor
          </p>
        )}
      </div>
    </div>
  );
}

/** Onda inferior para cerrar bloques de color sin un borde recto. */
export function Onda({ color = "var(--marfil)", alto = 54, volteada = false }) {
  return (
    <svg
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      style={{
        display: "block",
        width: "100%",
        height: alto,
        transform: volteada ? "rotate(180deg)" : "none",
      }}
      aria-hidden="true"
    >
      <path
        d="M0 42c180-44 360 24 540 24s360-60 540-42c120 20 240 44 360 36v20H0z"
        fill={color}
      />
    </svg>
  );
}

/** Rama suelta, para marcas de agua y esquinas. */
export function Rama({ tam = 120, color = "var(--beige)", ...resto }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 120 120"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      {...resto}
    >
      <path d="M18 104C36 76 58 54 100 30" />
      <path d="M44 74c-3-9-1-17 5-22 4 7 3 16-5 22zM58 60c-4-8-3-17 3-22 5 6 5 15-3 22zM72 48c-4-8-4-17 1-22 6 6 6 15-1 22z" />
      <path d="M50 78c8-2 16 1 20 7-8 3-16 1-20-7zM64 64c8-2 16 2 19 8-8 3-16 0-19-8z" />
    </svg>
  );
}
