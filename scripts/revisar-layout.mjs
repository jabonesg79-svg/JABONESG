import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = process.argv[2] || "http://localhost:5175/";
const ANCHOS = [
  { nombre: "1440px", width: 1440, height: 900 },
  { nombre: "375px", width: 375, height: 812 },
];

const seSolapan = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const vista of ANCHOS) {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: vista.width, height: vista.height, deviceScaleFactor: 1 });
  await pagina.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));

  const datos = await pagina.evaluate(() => {
    const caja = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const e = getComputedStyle(el);
      return {
        sel,
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
        fontSize: e.fontSize,
        color: e.color,
        zIndex: e.zIndex,
      };
    };

    const hero = document.querySelector(".hero");
    const catalogo = document.querySelector("#catalogo");
    const heroR = hero?.getBoundingClientRect();
    const catR = catalogo?.getBoundingClientRect();

    return {
      scrollLateral: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport: window.innerWidth,
      palabra: caja(".hero__palabra"),
      subtitular: caja(".hero__subtitular"),
      parrafo: caja(".hero__parrafo"),
      boton: caja(".hero__accion"),
      eyebrow: caja(".hero__eyebrow"),
      foto: caja(".hero__foto"),
      heroFin: heroR ? Math.round(heroR.bottom) : null,
      catalogoInicio: catR ? Math.round(catR.top) : null,
      heroAlto: heroR ? Math.round(heroR.height) : null,
      fotoTocaDerecha: (() => {
        const f = document.querySelector(".hero__foto");
        if (!f) return null;
        const r = f.getBoundingClientRect();
        return Math.round(window.innerWidth - r.right);
      })(),
    };
  });

  console.log(`\n===== ${vista.nombre} =====`);
  console.log("scroll lateral (0 = sin desbordamiento):", datos.scrollLateral);
  console.log("foto: separación al borde derecho:", datos.fotoTocaDerecha, "px");
  console.log("hero alto:", datos.heroAlto, "px · fin hero:", datos.heroFin, "· inicio catálogo:", datos.catalogoInicio);

  const textos = ["eyebrow", "subtitular", "parrafo", "boton"];
  for (const t of textos) {
    const a = datos.palabra;
    const b = datos[t];
    if (!a || !b) { console.log(`  ${t}: NO ENCONTRADO`); continue; }
    console.log(`  palabra vs ${t}: ${seSolapan(a, b) ? "SOLAPA ***" : "ok"}`);
  }

  if (datos.palabra) {
    console.log("  palabra:", datos.palabra.fontSize, datos.palabra.color,
      `x=${datos.palabra.x} ancho=${datos.palabra.width} derecha=${datos.palabra.x + datos.palabra.width}`);
  }
  if (datos.subtitular) console.log("  subtitular:", datos.subtitular.fontSize);
  if (datos.parrafo) console.log("  parrafo:", datos.parrafo.fontSize);
  if (datos.foto) console.log("  foto:", `x=${datos.foto.x} ancho=${datos.foto.width} alto=${datos.foto.height} y=${datos.foto.y}`);

  await pagina.close();
}

await navegador.close();
