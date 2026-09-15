/**
 * Recorta y optimiza el logo original hacia los dos activos que usa el sitio.
 *
 * El PNG que entrega el diseño pesa 1.2 MB y trae mucho margen en blanco.
 * Este script lo abre en el Chrome local, recorta las regiones útiles sobre
 * un canvas y las exporta en WebP. Se ejecuta a mano cuando cambie el logo:
 *   node scripts/preparar-marca.mjs
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ORIGEN = "marca-fuente/Logo_JabonesG.png";
const DESTINO = "public/marca";

// Regiones del PNG original (1536x1024).
const RECORTES = [
  {
    archivo: "logo-completo.webp",
    // Lockup entero, sin el margen sobrante.
    caja: { x: 56, y: 124, w: 1424, h: 736 },
    anchoSalida: 960,
  },
  {
    archivo: "monograma.webp",
    // Solo la G con el laurel y el corazón.
    caja: { x: 262, y: 122, w: 1012, h: 494 },
    anchoSalida: 560,
  },
];

const base64 = fs.readFileSync(ORIGEN).toString("base64");

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const pagina = await navegador.newPage();
await pagina.goto("about:blank");

fs.mkdirSync(DESTINO, { recursive: true });

for (const recorte of RECORTES) {
  const dataUrl = await pagina.evaluate(
    async (b64, caja, anchoSalida) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const escala = anchoSalida / caja.w;
          const lienzo = document.createElement("canvas");
          lienzo.width = Math.round(caja.w * escala);
          lienzo.height = Math.round(caja.h * escala);
          const ctx = lienzo.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            img,
            caja.x,
            caja.y,
            caja.w,
            caja.h,
            0,
            0,
            lienzo.width,
            lienzo.height,
          );

          // El arte es un trazo cacao sobre fondo marfil. Se recalcula cada
          // pixel como cacao puro con alfa según lo oscuro que sea, de modo
          // que el fondo desaparece y los bordes suavizados se conservan.
          const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
          const p = datos.data;
          const LUMA_FONDO = 244; // marfil del archivo original
          const LUMA_TRAZO = 70;  // cacao del logo
          for (let i = 0; i < p.length; i += 4) {
            const luma = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
            let alfa = (LUMA_FONDO - luma) / (LUMA_FONDO - LUMA_TRAZO);
            alfa = Math.max(0, Math.min(1, alfa));
            p[i] = 0x69;
            p[i + 1] = 0x37;
            p[i + 2] = 0x09;
            p[i + 3] = Math.round(alfa * 255);
          }
          ctx.putImageData(datos, 0, 0);

          resolve(lienzo.toDataURL("image/webp", 0.92));
        };
        img.onerror = reject;
        img.src = `data:image/png;base64,${b64}`;
      }),
    base64,
    recorte.caja,
    recorte.anchoSalida,
  );

  const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
  const salida = path.join(DESTINO, recorte.archivo);
  fs.writeFileSync(salida, bytes);
  console.log(`${salida} · ${(bytes.length / 1024).toFixed(0)} KB`);
}

await navegador.close();
