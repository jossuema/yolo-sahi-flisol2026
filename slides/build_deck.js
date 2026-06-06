/* Genera la presentacion YOLO + SAHI (FLISOL 2026).
   Graficos NATIVOS de PowerPoint (editables) + diagramas con formas.
   Imagenes reales generadas por los notebooks (galeria, segmentacion, slice-grid).

   Uso:  NODE_PATH=$(npm root -g) node slides/build_deck.js
*/
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "outputs");
const GT = path.join(ROOT, "data", "visdrone_val_coco.json");

// ---------- Paleta (coherente con las figuras) ----------
const C = {
  navy: "0F2A43", navy2: "14375E", panel: "F4F7FA", white: "FFFFFF",
  ink: "1E293B", mute: "64748B", sahi: "2E8B57", yolo: "E4572E",
  blue: "3A6EA5", gold: "E8A93B", line: "D8E0E8",
};
const HFONT = "Georgia";      // titulos (personalidad, formal)
const BFONT = "Calibri";      // cuerpo

const pres = new pptxgen();
pres.defineLayout({ name: "W", width: 13.333, height: 7.5 });
pres.layout = "W";
pres.author = "FLISOL 2026";
pres.title = "Mejorando YOLO con SAHI";
const PW = 13.333, PH = 7.5;

const mkShadow = () => ({ type: "outer", color: "000000", blur: 9, offset: 3, angle: 90, opacity: 0.18 });

// ---------- Helpers ----------
function footer(slide, dark) {
  const col = dark ? "9FB3C8" : C.mute;
  slide.addText("Computer Vision Open Source · YOLO + SAHI", { x: 0.5, y: 7.05, w: 8, h: 0.3, fontFace: BFONT, fontSize: 9, color: col, align: "left" });
  slide.addText("FLISOL 2026", { x: PW - 2.5, y: 7.05, w: 2, h: 0.3, fontFace: BFONT, fontSize: 9, color: col, align: "right" });
}

function kicker(slide, text, color) {
  slide.addText(text.toUpperCase(), { x: 0.7, y: 0.55, w: 11, h: 0.35, fontFace: BFONT, fontSize: 13, bold: true, color: color || C.sahi, charSpacing: 3, margin: 0 });
}
function title(slide, text) {
  slide.addText(text, { x: 0.7, y: 0.92, w: 12, h: 0.95, fontFace: HFONT, fontSize: 30, bold: true, color: C.ink, margin: 0 });
}
function footnote(slide, text) {
  slide.addText("◆ " + text, { x: 0.7, y: 6.72, w: 12, h: 0.3, fontFace: BFONT, fontSize: 9, italic: true, color: C.mute, margin: 0 });
}
function contentSlide() { const s = pres.addSlide(); s.background = { color: C.white }; return s; }

function sectionDivider(num, name, sub) {
  const s = pres.addSlide(); s.background = { color: C.navy };
  // chip numero
  s.addShape(pres.shapes.OVAL, { x: 0.9, y: 2.55, w: 1.5, h: 1.5, fill: { color: C.sahi }, line: { color: C.sahi } });
  s.addText(num, { x: 0.9, y: 2.55, w: 1.5, h: 1.5, align: "center", valign: "middle", fontFace: HFONT, fontSize: 44, bold: true, color: C.white, margin: 0 });
  s.addText(name, { x: 2.8, y: 2.75, w: 9.5, h: 1.0, fontFace: HFONT, fontSize: 40, bold: true, color: C.white, margin: 0 });
  if (sub) s.addText(sub, { x: 2.85, y: 3.75, w: 9.3, h: 0.6, fontFace: BFONT, fontSize: 16, color: "9FB3C8", margin: 0 });
  // motif: fila de slices
  const sx = 2.85; for (let i = 0; i < 8; i++) s.addShape(pres.shapes.RECTANGLE, { x: sx + i * 0.42, y: 4.6, w: 0.34, h: 0.34, fill: { color: i % 2 ? C.sahi : "1C4A73" }, line: { color: "1C4A73", width: 0.5 } });
  footer(s, true);
  return s;
}

function statCard(slide, x, y, w, big, label, color) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 1.55, fill: { color: C.panel }, line: { color: C.line, width: 1 }, rectRadius: 0.08, shadow: mkShadow() });
  slide.addText(big, { x, y: y + 0.12, w, h: 0.85, align: "center", valign: "middle", fontFace: HFONT, fontSize: 40, bold: true, color: color, margin: 0 });
  slide.addText(label, { x: x + 0.15, y: y + 0.98, w: w - 0.3, h: 0.5, align: "center", valign: "top", fontFace: BFONT, fontSize: 12, color: C.mute, margin: 0 });
}

function levelTag(slide, n) {
  slide.addShape(pres.shapes.OVAL, { x: 11.7, y: 0.55, w: 1.0, h: 1.0, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addText("N" + n, { x: 11.7, y: 0.55, w: 1.0, h: 1.0, align: "center", valign: "middle", fontFace: HFONT, fontSize: 22, bold: true, color: C.gold, margin: 0 });
}

function baseChartOpts(extra) {
  return Object.assign({
    chartArea: { fill: { color: C.white } },
    catAxisLabelColor: C.mute, valAxisLabelColor: C.mute,
    catAxisLabelFontFace: BFONT, valAxisLabelFontFace: BFONT,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 10,
    valGridLine: { color: "E6ECF2", size: 0.5 }, catGridLine: { style: "none" },
    showTitle: false,
  }, extra || {});
}

function imgFrame(slide, imgPath, x, y, w, h) {
  slide.addShape(pres.shapes.RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, fill: { color: C.white }, line: { color: C.line, width: 1 }, shadow: mkShadow() });
  slide.addImage({ path: imgPath, x, y, w, h, sizing: { type: "contain", w, h } });
}

// ---------- Datos reales del dataset (si existe el GT) ----------
function datasetStats() {
  if (!fs.existsSync(GT)) return null;
  const gt = JSON.parse(fs.readFileSync(GT, "utf8"));
  const sides = [], perImg = {};
  for (const a of gt.annotations) {
    if (a.area > 0) sides.push(Math.sqrt(a.area));
    perImg[a.image_id] = (perImg[a.image_id] || 0) + 1;
  }
  const total = sides.length;
  const small = sides.filter(s => s < 32).length;
  const medium = sides.filter(s => s >= 32 && s < 96).length;
  const large = sides.filter(s => s >= 96).length;
  const counts = Object.values(perImg);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  // histograma 0..150 step 10
  const bins = new Array(15).fill(0), labels = [];
  for (let i = 0; i < 15; i++) labels.push(String(i * 10));
  for (const s of sides) { let b = Math.min(14, Math.floor(s / 10)); bins[b]++; }
  // distribucion de clases
  const id2name = {}; for (const c of gt.categories) id2name[c.id] = c.name;
  const cls = {}; for (const a of gt.annotations) cls[a.category_id] = (cls[a.category_id] || 0) + 1;
  const clsArr = Object.keys(cls).map(k => ({ name: id2name[k] || k, n: cls[k] })).sort((a, b) => a.n - b.n);
  return { total, small, medium, large, avg, nImg: gt.images.length, bins, labels,
    pctSmall: Math.round(100 * small / total), clsArr };
}

function findImg(dir, pred) {
  const d = path.join(OUT, dir);
  if (!fs.existsSync(d)) return null;
  const files = fs.readdirSync(d).filter(pred);
  return files.length ? path.join(d, files[0]) : null;
}
function topByGain(dir, prefix) {
  const d = path.join(OUT, dir);
  if (!fs.existsSync(d)) return null;
  let best = null, bestG = -1;
  for (const f of fs.readdirSync(d)) {
    const m = f.match(/gain(-?\d+)/);
    if (m && +m[1] > bestG) { bestG = +m[1]; best = f; }
  }
  return best ? path.join(d, best) : (fs.readdirSync(d)[0] ? path.join(d, fs.readdirSync(d)[0]) : null);
}

const S = datasetStats();
const sliceGrid = path.join(OUT, "figures", "09_slice_grid.png");
const galleryImg = findImg("gallery", f => f.endsWith(".jpg")) || topByGain("gallery");
const segImg = topByGain("segmentation");

// ============================================================
// SLIDE 1 — Portada
// ============================================================
(function () {
  const s = pres.addSlide(); s.background = { color: C.navy };
  s.addText("COMPUTER VISION OPEN SOURCE", { x: 0.9, y: 1.4, w: 11, h: 0.4, fontFace: BFONT, fontSize: 15, bold: true, color: C.sahi, charSpacing: 4, margin: 0 });
  s.addText("Mejorando YOLO con SAHI", { x: 0.85, y: 1.95, w: 11.6, h: 1.2, fontFace: HFONT, fontSize: 52, bold: true, color: C.white, margin: 0 });
  s.addText("Detectando lo que YOLO no ve: objetos pequeños en cámaras urbanas", { x: 0.9, y: 3.25, w: 11, h: 0.6, fontFace: BFONT, fontSize: 19, italic: true, color: "CADCFC", margin: 0 });
  // motif slices
  for (let i = 0; i < 14; i++) s.addShape(pres.shapes.RECTANGLE, { x: 0.9 + i * 0.55, y: 4.35, w: 0.46, h: 0.46, fill: { color: i % 3 === 0 ? C.sahi : "16365A" }, line: { color: "1C4A73", width: 0.75 } });
  s.addText([
    { text: "Estudio de caso: ", options: { color: "9FB3C8" } },
    { text: "seguridad ciudadana — personas y motos en vista aérea (VisDrone)", options: { color: C.white } },
  ], { x: 0.9, y: 5.4, w: 11.5, h: 0.4, fontFace: BFONT, fontSize: 14, margin: 0 });
  s.addText("FLISOL 2026", { x: 0.9, y: 6.5, w: 6, h: 0.4, fontFace: BFONT, fontSize: 14, bold: true, color: C.gold, margin: 0 });
})();

// ============================================================
// SLIDE 2 — Ruta (agenda con rampa de complejidad)
// ============================================================
(function () {
  const s = contentSlide();
  kicker(s, "Ruta de la charla", C.blue);
  title(s, "De lo simple a lo avanzado");
  const items = [
    ["1", "El problema", "Por qué los objetos pequeños se pierden", C.yolo],
    ["2", "YOLO", "El detector single-shot open source", C.blue],
    ["3", "SAHI", "Slicing: la idea que lo cambia todo", C.sahi],
    ["4", "Configuraciones", "Slice · overlap · postproceso · modos · segmentación", C.gold],
    ["5", "Resultados", "mAP, AP_small y el caso de uso real", C.navy],
  ];
  let y = 2.1;
  for (const [n, t, d, col] of items) {
    s.addShape(pres.shapes.OVAL, { x: 0.9, y, w: 0.85, h: 0.85, fill: { color: col }, line: { color: col } });
    s.addText(n, { x: 0.9, y, w: 0.85, h: 0.85, align: "center", valign: "middle", fontFace: HFONT, fontSize: 26, bold: true, color: C.white, margin: 0 });
    s.addText([
      { text: t + "   ", options: { bold: true, fontSize: 20, color: C.ink } },
      { text: d, options: { fontSize: 14, color: C.mute } },
    ], { x: 2.0, y: y + 0.05, w: 10.5, h: 0.75, fontFace: BFONT, valign: "middle", margin: 0 });
    y += 0.97;
  }
  footer(s, false);
})();

// ============================================================
// SECCION 1 — El problema
// ============================================================
sectionDivider("01", "El problema", "Por qué la detección de objetos pequeños cuesta tanto");

// SLIDE — YOLO aplasta la imagen
(function () {
  const s = contentSlide();
  kicker(s, "La causa raíz", C.yolo);
  title(s, "YOLO “aplasta” la imagen");
  s.addText([
    { text: "Los detectores redimensionan toda la imagen a su entrada (p. ej. 640×640).", options: { bullet: true, breakLine: true } },
    { text: "En 4K, una moto de 40 px queda en ~7 px tras el reescalado.", options: { bullet: true, breakLine: true } },
    { text: "A esa resolución el objeto pierde casi toda su información.", options: { bullet: true, breakLine: true } },
    { text: "Resultado: lo lejano y pequeño simplemente no se detecta.", options: { bullet: true, color: C.yolo, bold: true } },
  ], { x: 0.7, y: 2.1, w: 6.4, h: 3, fontFace: BFONT, fontSize: 16, color: C.ink, paraSpaceAfter: 12, margin: 0 });
  // diagrama: imagen grande -> 640 -> puntos
  s.addShape(pres.shapes.RECTANGLE, { x: 7.6, y: 2.15, w: 3.0, h: 2.0, fill: { color: C.panel }, line: { color: C.blue, width: 1.5 } });
  s.addText("Imagen 4K", { x: 7.6, y: 2.15, w: 3.0, h: 0.4, align: "center", fontFace: BFONT, fontSize: 11, color: C.mute, margin: 0 });
  for (let i = 0; i < 18; i++) s.addShape(pres.shapes.OVAL, { x: 7.8 + (i % 6) * 0.45, y: 2.7 + Math.floor(i / 6) * 0.42, w: 0.1, h: 0.1, fill: { color: C.yolo }, line: { color: C.yolo } });
  s.addShape(pres.shapes.LINE, { x: 10.75, y: 3.15, w: 0.7, h: 0, line: { color: C.ink, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 11.5, y: 2.55, w: 1.2, h: 1.2, fill: { color: C.panel }, line: { color: C.yolo, width: 1.5 } });
  s.addText("640", { x: 11.5, y: 2.55, w: 1.2, h: 0.35, align: "center", fontFace: BFONT, fontSize: 10, color: C.mute, margin: 0 });
  for (let i = 0; i < 4; i++) s.addShape(pres.shapes.OVAL, { x: 11.75 + (i % 2) * 0.45, y: 3.05 + Math.floor(i / 2) * 0.35, w: 0.05, h: 0.05, fill: { color: C.yolo }, line: { color: C.yolo } });
  s.addText("Mismos objetos, una fracción de los píxeles", { x: 7.6, y: 4.4, w: 5.1, h: 0.5, align: "center", fontFace: BFONT, fontSize: 12, italic: true, color: C.mute, margin: 0 });
  s.addText("“No es que YOLO sea malo; le damos la imagen aplastada.”", { x: 0.7, y: 5.6, w: 9, h: 0.5, fontFace: HFONT, fontSize: 18, italic: true, bold: true, color: C.navy, margin: 0 });
  footer(s, false);
})();

// SLIDE — Evidencia: stats del dataset
(function () {
  const s = contentSlide();
  kicker(s, "Evidencia", C.blue);
  title(s, "VisDrone: un mar de objetos diminutos");
  if (S) {
    statCard(s, 0.7, 2.05, 2.7, S.pctSmall + "%", "objetos < 32 px (small)", C.yolo);
    statCard(s, 3.55, 2.05, 2.7, Math.round(S.avg).toString(), "objetos por imagen (prom.)", C.sahi);
    statCard(s, 6.4, 2.05, 2.7, (S.total / 1000).toFixed(1) + "k", "objetos anotados", C.blue);
    s.addChart(pres.charts.BAR, [{ name: "objetos", labels: S.labels, values: S.bins }],
      baseChartOpts({ x: 0.7, y: 3.95, w: 8.5, h: 2.6, barDir: "col", chartColors: [C.blue], showLegend: false,
        catAxisTitle: "√área (px)", showCatAxisTitle: true, catAxisTitleColor: C.mute, catAxisTitleFontSize: 10, catAxisTitleFontFace: BFONT }));
    s.addText("Distribución de tamaños — la masa está a la izquierda (objetos pequeños).",
      { x: 0.7, y: 6.5, w: 9, h: 0.3, fontFace: BFONT, fontSize: 11, italic: true, color: C.mute, margin: 0 });
    // panel lateral
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.5, y: 2.05, w: 3.15, h: 4.5, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.08 });
    s.addText("¿Por qué importa?", { x: 9.75, y: 2.3, w: 2.7, h: 0.4, fontFace: HFONT, fontSize: 16, bold: true, color: C.white, margin: 0 });
    s.addText([
      { text: "Vista aérea = todo lejano.", options: { bullet: true, breakLine: true } },
      { text: "Decenas de objetos por frame.", options: { bullet: true, breakLine: true } },
      { text: "El criterio COCO llama small a < 32 px.", options: { bullet: true, breakLine: true } },
      { text: "Es el peor caso para YOLO clásico… y el mejor para SAHI.", options: { bullet: true, bold: true, color: "9FE6C0" } },
    ], { x: 9.75, y: 2.85, w: 2.7, h: 3.5, fontFace: BFONT, fontSize: 13, color: "CADCFC", paraSpaceAfter: 10, margin: 0 });
  } else {
    s.addText("(Corre notebook 02 para generar las estadísticas reales del dataset)", { x: 0.7, y: 3, w: 10, h: 1, fontFace: BFONT, fontSize: 16, color: C.mute });
  }
  footer(s, false);
})();

// ============================================================
// SECCION 2 — YOLO
// ============================================================
sectionDivider("02", "YOLO", "You Only Look Once — el detector single-shot open source");

(function () {
  const s = contentSlide();
  kicker(s, "Fundamentos", C.blue);
  title(s, "¿Qué es YOLO?");
  s.addText([
    { text: "Detección en una sola pasada", options: { bold: true, breakLine: true, fontSize: 17, color: C.ink } },
    { text: "“You Only Look Once”: cajas + clase + confianza de un tirón → rápido.", options: { breakLine: true, fontSize: 14, color: C.mute } },
    { text: "", options: { breakLine: true, fontSize: 6 } },
    { text: "Open source", options: { bold: true, breakLine: true, fontSize: 17, color: C.ink } },
    { text: "Ultralytics YOLO11 (AGPL-3.0), comunidad enorme, fácil de usar.", options: { breakLine: true, fontSize: 14, color: C.mute } },
    { text: "", options: { breakLine: true, fontSize: 6 } },
    { text: "Versátil", options: { bold: true, breakLine: true, fontSize: 17, color: C.ink } },
    { text: "Detección, segmentación, pose y clasificación con la misma API.", options: { fontSize: 14, color: C.mute } },
  ], { x: 0.7, y: 2.05, w: 6.2, h: 3.4, fontFace: BFONT, margin: 0 });
  // pipeline backbone-neck-head
  const px = 7.3, py = 2.5, bw = 1.7, bh = 1.1, gap = 0.35;
  const blocks = [["Backbone", "extrae rasgos"], ["Neck", "fusiona escalas"], ["Head", "predice cajas"]];
  blocks.forEach((b, i) => {
    const x = px + i * (bw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: py, w: bw, h: bh, fill: { color: i === 2 ? C.blue : C.panel }, line: { color: C.blue, width: 1.5 }, rectRadius: 0.06 });
    s.addText(b[0], { x, y: py + 0.18, w: bw, h: 0.4, align: "center", fontFace: BFONT, fontSize: 14, bold: true, color: i === 2 ? C.white : C.ink, margin: 0 });
    s.addText(b[1], { x, y: py + 0.6, w: bw, h: 0.4, align: "center", fontFace: BFONT, fontSize: 10, color: i === 2 ? "DCE8F5" : C.mute, margin: 0 });
    if (i < 2) s.addShape(pres.shapes.LINE, { x: x + bw + 0.02, y: py + bh / 2, w: gap - 0.04, h: 0, line: { color: C.ink, width: 1.5, endArrowType: "triangle" } });
  });
  s.addText("Arquitectura (a vista de pájaro)", { x: px, y: py + bh + 0.15, w: bw * 3 + gap * 2, h: 0.3, align: "center", fontFace: BFONT, fontSize: 11, italic: true, color: C.mute, margin: 0 });
  // timeline
  s.addText("Evolución", { x: 0.7, y: 5.35, w: 4, h: 0.35, fontFace: BFONT, fontSize: 13, bold: true, color: C.ink, margin: 0 });
  const vs = ["v1", "v3", "v5", "v8", "11"]; const tx = 0.9, tw = 11.6;
  s.addShape(pres.shapes.LINE, { x: tx, y: 6.15, w: tw, h: 0, line: { color: C.line, width: 2 } });
  vs.forEach((v, i) => {
    const x = tx + i * (tw / (vs.length - 1));
    s.addShape(pres.shapes.OVAL, { x: x - 0.16, y: 5.99, w: 0.32, h: 0.32, fill: { color: i === vs.length - 1 ? C.sahi : C.blue }, line: { color: C.white, width: 1.5 } });
    s.addText(v, { x: x - 0.4, y: 6.35, w: 0.8, h: 0.3, align: "center", fontFace: BFONT, fontSize: 12, bold: true, color: C.ink, margin: 0 });
  });
  footer(s, false);
})();

// ============================================================
// SECCION 3 — SAHI
// ============================================================
sectionDivider("03", "SAHI", "Slicing Aided Hyper Inference — recuperar lo que se perdía");

// SLIDE — idea + pipeline (formas)
(function () {
  const s = contentSlide();
  kicker(s, "La idea central", C.sahi);
  title(s, "En vez de aplastar… rebanar");
  s.addText([
    { text: "SAHI no reemplaza a YOLO: lo ", options: {} },
    { text: "envuelve", options: { bold: true, color: C.sahi } },
    { text: ". Corta la imagen en mosaicos, detecta en cada uno a resolución nativa y fusiona los resultados.", options: {} },
  ], { x: 0.7, y: 1.95, w: 12, h: 0.7, fontFace: BFONT, fontSize: 16, color: C.ink, margin: 0 });
  // pipeline
  const y = 3.1, h = 1.5;
  function box(x, w, label, sub, fill, txt) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.07, shadow: mkShadow() });
    s.addText(label, { x, y: y + 0.35, w, h: 0.5, align: "center", fontFace: BFONT, fontSize: 15, bold: true, color: txt, margin: 0 });
    s.addText(sub, { x: x + 0.1, y: y + 0.85, w: w - 0.2, h: 0.5, align: "center", fontFace: BFONT, fontSize: 10, color: txt, margin: 0 });
  }
  function arrow(x) { s.addShape(pres.shapes.LINE, { x, y: y + h / 2, w: 0.5, h: 0, line: { color: C.ink, width: 2, endArrowType: "triangle" } }); }
  box(0.7, 2.0, "Imagen", "alta resolución", C.blue, C.white); arrow(2.75);
  box(3.3, 2.4, "Slices", "con solapamiento", C.navy, C.white); arrow(5.75);
  box(6.3, 2.4, "YOLO ×N", "uno por slice", C.yolo, C.white); arrow(8.75);
  box(9.3, 2.0, "Merge", "NMS / NMM", C.sahi, C.white); arrow(11.35);
  box(11.9, 1.1, "Salida", "", C.blue, C.white);
  s.addText([
    { text: "Cada objeto pequeño ocupa ahora una fracción MUCHO mayor de su slice → ", options: { color: C.ink } },
    { text: "se detecta.", options: { bold: true, color: C.sahi } },
  ], { x: 0.7, y: 5.25, w: 12, h: 0.5, fontFace: BFONT, fontSize: 16, align: "center", margin: 0 });
  s.addText("Compatible con YOLO, MMDetection, Detectron2, Hugging Face… (licencia MIT)", { x: 0.7, y: 5.95, w: 12, h: 0.4, fontFace: BFONT, fontSize: 12, italic: true, align: "center", color: C.mute, margin: 0 });
  footer(s, false);
})();

// SLIDE — antes/despues real (galeria)
(function () {
  const s = contentSlide();
  kicker(s, "Antes / Después", C.sahi);
  title(s, "La misma imagen, el mismo modelo");
  if (galleryImg && fs.existsSync(galleryImg)) {
    imgFrame(s, galleryImg, 0.9, 2.15, 11.5, 4.0);
    s.addText("Izquierda YOLO · Derecha YOLO + SAHI — el conteo de detecciones salta sobre la misma escena.",
      { x: 0.7, y: 6.35, w: 12, h: 0.35, align: "center", fontFace: BFONT, fontSize: 12, italic: true, color: C.mute, margin: 0 });
  } else {
    s.addText("(Genera la galería con notebook 02 → outputs/gallery/)", { x: 0.7, y: 3, w: 11, h: 1, fontFace: BFONT, fontSize: 16, color: C.mute });
  }
  footer(s, false);
})();

// ============================================================
// SECCION 4 — Escalando configuraciones
// ============================================================
sectionDivider("04", "Configuraciones", "Escalando por complejidad: de un parámetro a entrenar el modelo");

// N1 — tamaño de slice
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 1 · Tamaño de slice", C.gold); levelTag(s, 1);
  title(s, "El trade-off fundamental");
  s.addText([
    { text: "Slice más pequeño → objetos relativos más grandes → detectas más diminutos.", options: { bullet: true, breakLine: true } },
    { text: "Pero más slices = más inferencias = más tiempo.", options: { bullet: true, breakLine: true } },
    { text: "Regla: ajusta el slice al tamaño típico de tus objetos.", options: { bullet: true, bold: true, color: C.ink } },
  ], { x: 0.7, y: 2.05, w: 4.5, h: 3, fontFace: BFONT, fontSize: 15, color: C.ink, paraSpaceAfter: 12, margin: 0 });
  const SLICES = ["320", "512", "640", "768", "1024"];
  s.addText("Detecciones  (más = mejor)", { x: 5.6, y: 1.95, w: 7.1, h: 0.3, fontFace: BFONT, fontSize: 12, bold: true, color: C.sahi, margin: 0 });
  s.addChart(pres.charts.BAR, [{ name: "Detecciones", labels: SLICES, values: [4200, 3500, 3050, 2700, 2100] }],
    baseChartOpts({ x: 5.5, y: 2.25, w: 7.2, h: 1.95, barDir: "col", chartColors: [C.sahi], showLegend: false }));
  s.addText("Tiempo de inferencia (s)  ·  menos = mejor", { x: 5.6, y: 4.35, w: 7.1, h: 0.3, fontFace: BFONT, fontSize: 12, bold: true, color: C.yolo, margin: 0 });
  s.addChart(pres.charts.LINE, [{ name: "Tiempo (s)", labels: SLICES, values: [2.6, 1.5, 1.1, 0.85, 0.6] }],
    baseChartOpts({ x: 5.5, y: 4.65, w: 7.2, h: 1.95, chartColors: [C.yolo], lineSize: 3, lineSmooth: true, showLegend: false,
      catAxisTitle: "tamaño de slice (px)", showCatAxisTitle: true, catAxisTitleColor: C.mute, catAxisTitleFontSize: 10 }));
  footnote(s, "Valores de referencia; reemplaza con tu corrida (notebook 02 · slice_sweep).");
  footer(s, false);
})();

// N2 — overlap (slice grid real)
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 2 · Solapamiento", C.gold); levelTag(s, 2);
  title(s, "Overlap: el seguro contra objetos cortados");
  if (fs.existsSync(sliceGrid)) {
    imgFrame(s, sliceGrid, 0.9, 2.05, 11.5, 3.5);
  }
  s.addText([
    { text: "Sin solape, un objeto en el borde se parte en dos y ninguna mitad se detecta. ", options: { color: C.ink } },
    { text: "El overlap garantiza que cada objeto aparezca completo en al menos un slice", options: { bold: true, color: C.sahi } },
    { text: " — a costa de más slices (zonas oscuras = solapamiento).", options: { color: C.ink } },
  ], { x: 0.7, y: 5.8, w: 12, h: 0.8, fontFace: BFONT, fontSize: 14, align: "center", margin: 0 });
  footer(s, false);
})();

// N3 — postprocesamiento
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 3 · Postprocesamiento", C.gold); levelTag(s, 3);
  title(s, "Fusionar los duplicados del solape");
  const rows = [
    [{ text: "Tipo", options: { bold: true, color: C.white, fill: { color: C.navy }, fontFace: BFONT } }, { text: "Qué hace", options: { bold: true, color: C.white, fill: { color: C.navy }, fontFace: BFONT } }],
    ["NMS", "Descarta la caja de menor score cuando dos se solapan demasiado."],
    ["NMM", "Fusiona las cajas solapadas en una sola (mejor para objetos partidos)."],
    ["GREEDYNMM", "Variante voraz de NMM — el valor por defecto de SAHI."],
  ];
  s.addTable(rows, { x: 0.7, y: 2.1, w: 6.3, h: 2.4, colW: [1.9, 4.4], fontFace: BFONT, fontSize: 12, color: C.ink,
    border: { type: "solid", pt: 1, color: C.line }, valign: "middle", rowH: [0.4, 0.65, 0.65, 0.65], fill: { color: C.white } });
  s.addText([
    { text: "Métrica de match: ", options: { bold: true } },
    { text: "IOU (solape clásico) o IOS (Intersection over Smaller, mejor al cortar).", options: { color: C.mute } },
  ], { x: 0.7, y: 4.7, w: 6.3, h: 0.8, fontFace: BFONT, fontSize: 13, color: C.ink, margin: 0 });
  s.addChart(pres.charts.BAR, [
    { name: "mAP", labels: ["NMS", "NMM", "GREEDYNMM"], values: [0.285, 0.298, 0.305] },
    { name: "AP_small", labels: ["NMS", "NMM", "GREEDYNMM"], values: [0.220, 0.235, 0.242] },
  ], baseChartOpts({ x: 7.3, y: 2.05, w: 5.4, h: 4.2, barDir: "col", chartColors: [C.blue, C.sahi],
    showLegend: true, legendPos: "b", legendFontFace: BFONT, legendColor: C.mute, showValue: false }));
  footnote(s, "Valores de referencia; reemplaza con tu corrida (notebook 02 · compare_postprocess).");
  footer(s, false);
})();

// N3b — Tecnicas de fusion (deep dive)
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 3 · En profundidad", C.gold); levelTag(s, 3);
  title(s, "Fusión: ¿suprimir o combinar?");
  s.addText("El solape hace que un mismo objeto aparezca en varias cajas. Hay tres formas de resolver los duplicados:",
    { x: 0.7, y: 1.92, w: 12, h: 0.4, fontFace: BFONT, fontSize: 14, color: C.ink, margin: 0 });

  const cards = [
    { name: "NMS", sub: "Non-Maximum Suppression", kind: "sup", desc: "Conserva la caja de mayor score y descarta las que se solapan demasiado.", tag: "Rápido · puede borrar vecinos", col: C.navy },
    { name: "NMM", sub: "Non-Maximum Merging", kind: "mrg", desc: "En vez de descartar, fusiona las cajas solapadas en una sola.", tag: "Mejor para objetos partidos", col: C.navy },
    { name: "GREEDYNMM", sub: "Greedy NMM", kind: "grd", desc: "NMM en cascada, de mayor a menor score. Valor por defecto de SAHI.", tag: "Buen balance general", col: C.sahi },
  ];
  cards.forEach((c, i) => {
    const x = 0.7 + i * 4.15, y = 2.45, w = 3.85, h = 4.05;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.white }, line: { color: C.line, width: 1 }, rectRadius: 0.08, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.9, fill: { color: c.col }, line: { color: c.col } });
    s.addText(c.name, { x: x + 0.25, y: y + 0.1, w: w - 0.5, h: 0.45, fontFace: HFONT, fontSize: 18, bold: true, color: C.white, margin: 0 });
    s.addText(c.sub, { x: x + 0.25, y: y + 0.55, w: w - 0.5, h: 0.3, fontFace: BFONT, fontSize: 10.5, color: "CADCFC", margin: 0 });
    const cx = x + 0.45, cy = y + 1.1, cw = w - 0.9, ch = 1.25;
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: C.panel }, line: { color: C.line, width: 1 } });
    if (c.kind === "sup") {
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.35, y: cy + 0.3, w: 1.25, h: 0.65, fill: { color: C.sahi, transparency: 70 }, line: { color: C.sahi, width: 2 } });
      s.addText("0.91 ✓", { x: cx + 0.2, y: cy + 0.08, w: 1.55, h: 0.2, align: "center", fontFace: BFONT, fontSize: 9, bold: true, color: C.sahi, margin: 0 });
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 1.2, y: cy + 0.55, w: 1.25, h: 0.55, fill: { color: C.white, transparency: 100 }, line: { color: C.yolo, width: 1.5, dashType: "dash" } });
      s.addText("0.86 ✕", { x: cx + 1.1, y: cy + ch - 0.22, w: 1.5, h: 0.2, align: "center", fontFace: BFONT, fontSize: 9, bold: true, color: C.yolo, margin: 0 });
    } else if (c.kind === "mrg") {
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.35, y: cy + 0.3, w: 1.2, h: 0.65, fill: { color: C.white, transparency: 100 }, line: { color: C.mute, width: 1, dashType: "dash" } });
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 1.15, y: cy + 0.5, w: 1.2, h: 0.55, fill: { color: C.white, transparency: 100 }, line: { color: C.mute, width: 1, dashType: "dash" } });
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.35, y: cy + 0.3, w: 2.0, h: 0.75, fill: { color: C.sahi, transparency: 60 }, line: { color: C.sahi, width: 2.5 } });
      s.addText("→ una sola caja", { x: cx, y: cy + ch - 0.22, w: cw, h: 0.2, align: "center", fontFace: BFONT, fontSize: 9, bold: true, color: C.sahi, margin: 0 });
    } else {
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.3, y: cy + 0.32, w: 0.95, h: 0.55, fill: { color: C.white, transparency: 100 }, line: { color: C.mute, width: 1, dashType: "dash" } });
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.85, y: cy + 0.42, w: 0.95, h: 0.55, fill: { color: C.white, transparency: 100 }, line: { color: C.mute, width: 1, dashType: "dash" } });
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 1.4, y: cy + 0.3, w: 0.95, h: 0.55, fill: { color: C.white, transparency: 100 }, line: { color: C.mute, width: 1, dashType: "dash" } });
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.3, y: cy + 0.3, w: 2.05, h: 0.75, fill: { color: C.sahi, transparency: 60 }, line: { color: C.sahi, width: 2.5 } });
      s.addText("ordena por score → fusiona", { x: cx, y: cy + ch - 0.22, w: cw, h: 0.2, align: "center", fontFace: BFONT, fontSize: 8.5, bold: true, color: C.sahi, margin: 0 });
    }
    s.addText(c.desc, { x: x + 0.25, y: y + 2.55, w: w - 0.5, h: 1.0, fontFace: BFONT, fontSize: 12.5, color: C.ink, margin: 0 });
    s.addText(c.tag, { x: x + 0.25, y: y + 3.55, w: w - 0.5, h: 0.35, fontFace: BFONT, fontSize: 11, italic: true, bold: true, color: c.col === C.sahi ? C.sahi : C.blue, margin: 0 });
  });
  footer(s, false);
})();

// N3c — Metricas de match (IoU vs IOS)
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 3 · Métrica de match", C.gold); levelTag(s, 3);
  title(s, "¿Son la misma caja? IoU vs IOS");
  s.addText("Antes de fusionar hay que decidir si dos cajas son el mismo objeto. Dos maneras de medir el solape:",
    { x: 0.7, y: 1.92, w: 12, h: 0.4, fontFace: BFONT, fontSize: 14, color: C.ink, margin: 0 });

  function panel(x, name, formula, shadeCol, note, value, valueSub, valueCol) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.45, w: 5.85, h: 3.2, fill: { color: C.white }, line: { color: C.line, width: 1 }, rectRadius: 0.08, shadow: mkShadow() });
    s.addText(name, { x: x + 0.3, y: 2.6, w: 5.3, h: 0.4, fontFace: HFONT, fontSize: 19, bold: true, color: C.ink, margin: 0 });
    s.addText(formula, { x: x + 0.3, y: 3.05, w: 3.0, h: 0.4, fontFace: "Consolas", fontSize: 13, bold: true, color: C.blue, margin: 0 });
    // diagrama: caja grande con caja pequena contenida
    const dx = x + 0.35, dy = 3.6, bw = 2.3, bh = 1.5;
    if (shadeCol === C.blue) s.addShape(pres.shapes.RECTANGLE, { x: dx, y: dy, w: bw, h: bh, fill: { color: C.blue, transparency: 86 }, line: { color: C.navy, width: 2 } });
    else s.addShape(pres.shapes.RECTANGLE, { x: dx, y: dy, w: bw, h: bh, fill: { color: C.white, transparency: 100 }, line: { color: C.navy, width: 2 } });
    s.addShape(pres.shapes.RECTANGLE, { x: dx + 0.35, y: dy + 0.4, w: 0.95, h: 0.7, fill: { color: shadeCol, transparency: 35 }, line: { color: shadeCol, width: 2 } });
    s.addText("menor", { x: dx + 0.3, y: dy + 0.62, w: 1.05, h: 0.25, align: "center", fontFace: BFONT, fontSize: 8, bold: true, color: shadeCol, margin: 0 });
    s.addText("grande", { x: dx + bw - 1.0, y: dy + bh - 0.28, w: 0.95, h: 0.22, align: "right", fontFace: BFONT, fontSize: 8, color: C.mute, margin: 0 });
    // texto + valor
    s.addText(note, { x: x + 2.95, y: 3.55, w: 2.65, h: 1.25, fontFace: BFONT, fontSize: 12, color: C.ink, margin: 0 });
    s.addText(value, { x: x + 2.95, y: 4.85, w: 2.65, h: 0.45, fontFace: HFONT, fontSize: 22, bold: true, color: valueCol, margin: 0 });
    s.addText(valueSub, { x: x + 2.95, y: 5.28, w: 2.65, h: 0.3, fontFace: BFONT, fontSize: 11, italic: true, color: valueCol, margin: 0 });
  }
  panel(0.7, "IoU — Intersection over Union", "IoU = ∩ / ∪", C.blue,
    "Solape respecto al área total. Una caja pequeña dentro de una grande da un valor bajo.",
    "IoU ≈ 0.25", "→ no las fusiona", C.yolo);
  panel(6.8, "IOS — Intersection over Smaller", "IOS = ∩ / menor", C.sahi,
    "Solape respecto a la caja MENOR. Si la pequeña está contenida, el valor es máximo.",
    "IOS = 1.0", "→ sí las fusiona", C.sahi);

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 5.85, w: 11.95, h: 0.82, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.06 });
  s.addText([
    { text: "Al rebanar, ", options: { color: "CADCFC" } },
    { text: "un objeto suele quedar como caja pequeña dentro de otra", options: { bold: true, color: C.white } },
    { text: " → IoU lo subestima, IOS lo capta. Por eso SAHI usa ", options: { color: "CADCFC" } },
    { text: "IOS por defecto.", options: { bold: true, color: "9FE6C0" } },
  ], { x: 1.0, y: 5.85, w: 11.4, h: 0.82, fontFace: BFONT, fontSize: 13, valign: "middle", margin: 0 });
  footer(s, false);
})();

// N4 — modos + match
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 4 · Modos de inferencia", C.gold); levelTag(s, 4);
  title(s, "Sliced, standard o combinado");
  const cards = [
    ["Sliced", "Solo mosaicos.", "Mejor para objetos pequeños.", C.sahi],
    ["Standard", "Imagen completa.", "Mejor para objetos grandes.", C.blue],
    ["Combinado", "Ambos + fusión.", "Lo más robusto, lo más lento.", C.navy],
  ];
  cards.forEach((c, i) => {
    const x = 0.7 + i * 4.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.2, w: 3.8, h: 2.7, fill: { color: C.panel }, line: { color: c[3], width: 1.5 }, rectRadius: 0.08, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.2, w: 3.8, h: 0.7, fill: { color: c[3] }, line: { color: c[3] } });
    s.addText(c[0], { x, y: 2.2, w: 3.8, h: 0.7, align: "center", valign: "middle", fontFace: HFONT, fontSize: 19, bold: true, color: C.white, margin: 0 });
    s.addText([
      { text: c[1], options: { bold: true, breakLine: true, fontSize: 15, color: C.ink } },
      { text: c[2], options: { fontSize: 13, color: C.mute } },
    ], { x: x + 0.25, y: 3.15, w: 3.3, h: 1.5, fontFace: BFONT, valign: "top", margin: 0 });
  });
  s.addText([
    { text: "En código solo cambia un flag:  ", options: { color: C.ink } },
    { text: "perform_standard_pred=True", options: { fontFace: "Consolas", color: C.navy, bold: true } },
    { text: "  activa el modo combinado.", options: { color: C.ink } },
  ], { x: 0.7, y: 5.5, w: 12, h: 0.5, fontFace: BFONT, fontSize: 14, align: "center", margin: 0 });
  footer(s, false);
})();

// N4b — Modo combinado (deep dive)
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 4 · Modo combinado", C.gold); levelTag(s, 4);
  title(s, "Lo mejor de ambos: global + slices");
  s.addText("El modo combinado corre la imagen COMPLETA y los SLICES, y fusiona todo en un único resultado.",
    { x: 0.7, y: 1.92, w: 12, h: 0.4, fontFace: BFONT, fontSize: 14, color: C.ink, margin: 0 });

  function srcBox(x, y, t1, t2, col) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.3, h: 0.85, fill: { color: col }, line: { color: col }, rectRadius: 0.06 });
    s.addText([{ text: t1, options: { bold: true, fontSize: 12, color: C.white, breakLine: true } }, { text: t2, options: { fontSize: 9.5, color: "DCE8F5" } }],
      { x: x + 0.1, y: y + 0.08, w: 2.1, h: 0.7, align: "center", valign: "middle", fontFace: BFONT, margin: 0 });
  }
  srcBox(1.0, 2.65, "Pasada GLOBAL", "imagen completa → grandes", C.blue);
  s.addText("+", { x: 1.0, y: 3.5, w: 2.3, h: 0.4, align: "center", fontFace: HFONT, fontSize: 20, bold: true, color: C.mute, margin: 0 });
  srcBox(1.0, 3.95, "Pasadas por SLICES", "mosaicos → pequeños", C.navy);
  s.addShape(pres.shapes.LINE, { x: 3.3, y: 3.07, w: 0.25, h: 0, line: { color: C.ink, width: 1.5 } });
  s.addShape(pres.shapes.LINE, { x: 3.3, y: 4.37, w: 0.25, h: 0, line: { color: C.ink, width: 1.5 } });
  s.addShape(pres.shapes.LINE, { x: 3.55, y: 3.07, w: 0, h: 1.3, line: { color: C.ink, width: 1.5 } });
  s.addShape(pres.shapes.LINE, { x: 3.55, y: 3.72, w: 0.6, h: 0, line: { color: C.ink, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.2, y: 3.25, w: 2.0, h: 0.95, fill: { color: C.sahi }, line: { color: C.sahi }, rectRadius: 0.06, shadow: mkShadow() });
  s.addText([{ text: "Merge (NMM · IOS)", options: { bold: true, fontSize: 12, color: C.white, breakLine: true } }, { text: "grandes + pequeños", options: { fontSize: 10, color: "DFF3E7" } }],
    { x: 4.25, y: 3.3, w: 1.9, h: 0.8, align: "center", valign: "middle", fontFace: BFONT, margin: 0 });

  const rows = [
    [{ text: "Modo", options: { bold: true, color: C.white, fill: { color: C.navy } } }, { text: "Pequeños", options: { bold: true, color: C.white, fill: { color: C.navy } } }, { text: "Grandes", options: { bold: true, color: C.white, fill: { color: C.navy } } }, { text: "Velocidad", options: { bold: true, color: C.white, fill: { color: C.navy } } }],
    ["Sliced", "✓ ✓", "~", "media"],
    ["Standard", "✗", "✓ ✓", "rápida"],
    [{ text: "Combinado", options: { bold: true, fill: { color: "E3F2EA" } } }, { text: "✓ ✓", options: { fill: { color: "E3F2EA" } } }, { text: "✓ ✓", options: { fill: { color: "E3F2EA" } } }, { text: "lenta", options: { fill: { color: "E3F2EA" } } }],
  ];
  s.addTable(rows, { x: 6.7, y: 2.65, w: 5.95, colW: [1.9, 1.5, 1.3, 1.25], rowH: [0.45, 0.55, 0.55, 0.55], fontFace: BFONT, fontSize: 13, color: C.ink, align: "center", valign: "middle", border: { type: "solid", pt: 1, color: C.line } });
  s.addText("Combinado = cobertura total (cualquier tamaño), a cambio de la pasada global + N slices.",
    { x: 6.7, y: 5.15, w: 5.95, h: 0.7, fontFace: BFONT, fontSize: 12.5, italic: true, color: C.mute, margin: 0 });
  s.addText([{ text: "Se activa con  ", options: { color: C.ink } }, { text: "perform_standard_pred=True", options: { fontFace: "Consolas", bold: true, color: C.navy } }],
    { x: 0.7, y: 5.55, w: 6, h: 0.4, fontFace: BFONT, fontSize: 13, margin: 0 });
  footer(s, false);
})();

// N5 — segmentacion
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 5 · Segmentación", C.gold); levelTag(s, 5);
  title(s, "SAHI también mejora las máscaras");
  if (segImg && fs.existsSync(segImg)) {
    imgFrame(s, segImg, 0.9, 2.1, 8.3, 4.0);
  } else {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 2.1, w: 8.3, h: 4.0, fill: { color: C.panel }, line: { color: C.line, width: 1 }, rectRadius: 0.08 });
    s.addText("(Genera con notebook 02 → outputs/segmentation/)", { x: 0.9, y: 3.9, w: 8.3, h: 0.5, align: "center", fontFace: BFONT, fontSize: 13, color: C.mute, margin: 0 });
  }
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.5, y: 2.1, w: 3.15, h: 4.0, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.08 });
  s.addText("YOLO-seg + SAHI", { x: 9.75, y: 2.35, w: 2.7, h: 0.4, fontFace: HFONT, fontSize: 16, bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: "Mismo pipeline, modelo -seg.", options: { bullet: true, breakLine: true } },
    { text: "Máscaras a resolución nativa por slice.", options: { bullet: true, breakLine: true } },
    { text: "Instancias pequeñas que antes no se segmentaban.", options: { bullet: true, breakLine: true } },
    { text: "Cualitativo: VisDrone no trae máscaras GT.", options: { bullet: true, italic: true, color: "9FB3C8" } },
  ], { x: 9.75, y: 2.9, w: 2.7, h: 3, fontFace: BFONT, fontSize: 12.5, color: "CADCFC", paraSpaceAfter: 9, margin: 0 });
  footer(s, false);
})();

// N6 — entrenar
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 6 · Entrenar en el dominio", C.gold); levelTag(s, 6);
  title(s, "El paso que desbloquea el mAP real");
  s.addText([
    { text: "Un modelo COCO evaluado en VisDrone da mAP ≈ 0", options: { bold: true, color: C.yolo, breakLine: true, fontSize: 16 } },
    { text: "Las 80 clases de COCO no coinciden con las 10 de VisDrone (zero-shot).", options: { color: C.mute, breakLine: true, fontSize: 13 } },
    { text: "", options: { breakLine: true, fontSize: 8 } },
    { text: "Fine-tune en VisDrone alinea las clases", options: { bold: true, color: C.sahi, breakLine: true, fontSize: 16 } },
    { text: "Una línea: yolo train data=VisDrone.yaml. Luego SAHI exprime el AP_small.", options: { color: C.mute, fontSize: 13 } },
  ], { x: 0.7, y: 2.1, w: 6.3, h: 3, fontFace: BFONT, margin: 0 });
  // before/after numbers
  statCard(s, 7.4, 2.3, 2.5, "≈ 0.00", "mAP zero-shot (COCO)", C.yolo);
  s.addShape(pres.shapes.LINE, { x: 10.05, y: 3.05, w: 0.55, h: 0, line: { color: C.ink, width: 2, endArrowType: "triangle" } });
  statCard(s, 10.2, 2.3, 2.5, "0.22+", "mAP fine-tuned", C.sahi);
  s.addText("Por eso el notebook 00 entrena ANTES de medir.", { x: 7.4, y: 4.2, w: 5.3, h: 0.5, align: "center", fontFace: BFONT, fontSize: 13, italic: true, color: C.mute, margin: 0 });
  s.addText([
    { text: "Tip objetos pequeños: ", options: { bold: true, color: C.ink } },
    { text: "entrena con imgsz mayor (960/1024) para afinar aún más lo diminuto.", options: { color: C.mute } },
  ], { x: 0.7, y: 5.7, w: 12, h: 0.5, fontFace: BFONT, fontSize: 13, margin: 0 });
  footer(s, false);
})();

// ============================================================
// SECCION 5 — Resultados
// ============================================================
// N6b — entrenar es distinto
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 6 · Entrenar para SAHI", C.gold); levelTag(s, 6);
  title(s, "Entrenar para SAHI es distinto");
  s.addText("En inferencia el modelo NO ve la imagen completa: ve SLICES a resolución nativa. El entrenamiento debería verlos también.",
    { x: 0.7, y: 1.92, w: 12, h: 0.45, fontFace: BFONT, fontSize: 14, color: C.ink, margin: 0 });

  function col(x, head, headcol, para, srcLabel, note) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.6, w: 5.85, h: 3.45, fill: { color: C.white }, line: { color: headcol, width: 1.5 }, rectRadius: 0.08, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.6, w: 5.85, h: 0.7, fill: { color: headcol }, line: { color: headcol } });
    s.addText(head, { x: x + 0.25, y: 2.6, w: 5.35, h: 0.7, valign: "middle", fontFace: HFONT, fontSize: 17, bold: true, color: C.white, margin: 0 });
    s.addText(para, { x: x + 0.3, y: 3.45, w: 5.25, h: 0.8, fontFace: BFONT, fontSize: 13.5, color: C.ink, margin: 0 });
    const dy = 4.55;
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.55, y: dy, w: 1.5, h: 0.95, fill: { color: C.panel }, line: { color: C.mute, width: 1 } });
    s.addText(srcLabel, { x: x + 0.55, y: dy + 0.33, w: 1.5, h: 0.3, align: "center", fontFace: BFONT, fontSize: 10, color: C.ink, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: x + 2.15, y: dy + 0.475, w: 0.5, h: 0, line: { color: C.ink, width: 2, endArrowType: "triangle" } });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 2.75, y: dy + 0.2, w: 0.75, h: 0.55, fill: { color: C.panel }, line: { color: headcol, width: 1.5 } });
    s.addText("640", { x: x + 2.75, y: dy + 0.33, w: 0.75, h: 0.3, align: "center", fontFace: BFONT, fontSize: 9, color: C.mute, margin: 0 });
    s.addText(note, { x: x + 3.7, y: dy + 0.1, w: 1.95, h: 0.85, valign: "middle", fontFace: BFONT, fontSize: 11.5, italic: true, bold: true, color: headcol, margin: 0 });
  }
  col(0.7, "YOLO normal", C.yolo, "Entrenas con imágenes completas reescaladas a 640.",
    "imagen completa", "objeto diminuto → se pierde");
  col(6.8, "YOLO + SAHI (bien)", C.sahi, "Entrenas con SLICES: el objeto llega grande al modelo.",
    "slice nativo", "objeto grande → se detecta");
  s.addText("Entrenar con imágenes completas pero inferir con slices = desajuste de escala (train ≠ test). El sliced fine-tuning lo cierra.",
    { x: 0.7, y: 6.2, w: 12, h: 0.5, fontFace: BFONT, fontSize: 13, bold: true, color: C.navy, align: "center", margin: 0 });
  footer(s, false);
})();

// N6c — receta sliced fine-tuning
(function () {
  const s = contentSlide();
  kicker(s, "Nivel 6 · Receta", C.gold); levelTag(s, 6);
  title(s, "Receta: sliced fine-tuning");
  const steps = [
    ["1", "Corta el dataset en slices", "con el MISMO slice_size y overlap que usarás al inferir."],
    ["2", "Entrena con imgsz = tamaño de slice", "slices de 640 → entrena a imgsz 640."],
    ["3", "Mezcla slices + imágenes completas", "para que rinda también en la pasada global (combinado)."],
    ["4", "Infiere con la MISMA config", "mismo slice / overlap / postproceso."],
  ];
  let y = 2.25;
  steps.forEach(([n, t, d]) => {
    s.addShape(pres.shapes.OVAL, { x: 0.7, y, w: 0.68, h: 0.68, fill: { color: C.sahi }, line: { color: C.sahi } });
    s.addText(n, { x: 0.7, y, w: 0.68, h: 0.68, align: "center", valign: "middle", fontFace: HFONT, fontSize: 19, bold: true, color: C.white, margin: 0 });
    s.addText([{ text: t, options: { bold: true, fontSize: 15, color: C.ink, breakLine: true } }, { text: d, options: { fontSize: 12, color: C.mute } }],
      { x: 1.55, y: y - 0.02, w: 6.7, h: 0.75, valign: "middle", fontFace: BFONT, margin: 0 });
    y += 0.9;
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.5, y: 2.25, w: 4.15, h: 2.45, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.06 });
  s.addText([
    { text: "from sahi.slicing import slice_coco", options: { color: "9FE6C0", breakLine: true } },
    { text: "slice_coco(", options: { color: C.white, breakLine: true } },
    { text: "  coco_annotation_file_path=...,", options: { color: "CADCFC", breakLine: true } },
    { text: "  image_dir=..., output_dir=...,", options: { color: "CADCFC", breakLine: true } },
    { text: "  slice_height=640, slice_width=640,", options: { color: "CADCFC", breakLine: true } },
    { text: "  overlap_height_ratio=0.2,", options: { color: "CADCFC", breakLine: true } },
    { text: "  overlap_width_ratio=0.2)", options: { color: "CADCFC", breakLine: true } },
    { text: "# luego: yolo train data=sliced.yaml", options: { color: "9FB3C8" } },
  ], { x: 8.7, y: 2.4, w: 3.8, h: 2.15, fontFace: "Consolas", fontSize: 10, valign: "top", margin: 0 });
  s.addText("Tips", { x: 8.5, y: 4.9, w: 4.15, h: 0.35, fontFace: HFONT, fontSize: 15, bold: true, color: C.ink, margin: 0 });
  s.addText([
    { text: "Conserva algunos slices sin objetos (negativos) → menos falsos positivos.", options: { bullet: true, breakLine: true } },
    { text: "Usa overlap al cortar para no perder objetos en bordes.", options: { bullet: true, breakLine: true } },
    { text: "Evalúa con la misma config de slicing.", options: { bullet: true } },
  ], { x: 8.5, y: 5.25, w: 4.15, h: 1.4, fontFace: BFONT, fontSize: 11, color: C.ink, paraSpaceAfter: 5, margin: 0 });
  s.addText([{ text: "Atajo CLI:  ", options: { bold: true, color: C.ink } }, { text: "sahi coco slice --slice_size 640 ...", options: { fontFace: "Consolas", color: C.navy } }],
    { x: 0.7, y: 5.95, w: 7.5, h: 0.4, fontFace: BFONT, fontSize: 12, margin: 0 });
  footnote(s, "El fine-tuning estándar ya funciona; el sliced fine-tuning exprime el AP_small al máximo.");
  footer(s, false);
})();

sectionDivider("05", "Resultados", "Lo que ganamos, medido contra el ground truth");

// mAP global
(function () {
  const s = contentSlide();
  kicker(s, "Benchmark", C.sahi);
  title(s, "YOLO vs YOLO + SAHI (mAP COCO)");
  s.addChart(pres.charts.BAR, [
    { name: "YOLO", labels: ["mAP@.5:.95", "mAP@.5", "mAP@.75"], values: [0.22, 0.38, 0.21] },
    { name: "YOLO + SAHI", labels: ["mAP@.5:.95", "mAP@.5", "mAP@.75"], values: [0.30, 0.50, 0.30] },
  ], baseChartOpts({ x: 0.7, y: 2.1, w: 8.0, h: 4.2, barDir: "col", chartColors: [C.yolo, C.sahi],
    showLegend: true, legendPos: "b", legendFontFace: BFONT, legendColor: C.mute, showValue: true, dataLabelColor: C.ink, dataLabelFontFace: BFONT, dataLabelFontSize: 9, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00" }));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.1, y: 2.3, w: 3.55, h: 3.7, fill: { color: C.panel }, line: { color: C.line, width: 1 }, rectRadius: 0.08 });
  s.addText("Lectura rápida", { x: 9.35, y: 2.5, w: 3.1, h: 0.4, fontFace: HFONT, fontSize: 16, bold: true, color: C.ink, margin: 0 });
  s.addText([
    { text: "Mejora en todas las métricas.", options: { bullet: true, breakLine: true } },
    { text: "El salto más grande está en el umbral estricto (.75).", options: { bullet: true, breakLine: true } },
    { text: "SAHI = más recall sin perder precisión.", options: { bullet: true, bold: true, color: C.sahi } },
  ], { x: 9.35, y: 3.05, w: 3.1, h: 2.7, fontFace: BFONT, fontSize: 13, color: C.ink, paraSpaceAfter: 10, margin: 0 });
  footnote(s, "Valores de referencia (yolo11s fine-tuned en VisDrone); reemplaza con tu corrida (notebook 02).");
  footer(s, false);
})();

// AP por tamano (estrella)
(function () {
  const s = contentSlide();
  kicker(s, "El resultado estrella", C.sahi);
  title(s, "Donde SAHI brilla: objetos pequeños");
  s.addChart(pres.charts.BAR, [
    { name: "YOLO", labels: ["Pequeños", "Medianos", "Grandes"], values: [0.12, 0.33, 0.46] },
    { name: "YOLO + SAHI", labels: ["Pequeños", "Medianos", "Grandes"], values: [0.24, 0.40, 0.42] },
  ], baseChartOpts({ x: 0.7, y: 2.1, w: 8.2, h: 4.2, barDir: "col", chartColors: [C.yolo, C.sahi],
    showLegend: true, legendPos: "b", legendFontFace: BFONT, legendColor: C.mute, showValue: true, dataLabelColor: C.ink, dataLabelFontFace: BFONT, dataLabelFontSize: 10, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00" }));
  statCard(s, 9.3, 2.6, 3.3, "+100%", "AP en objetos pequeños", C.sahi);
  s.addText("El AP_small casi se duplica. En objetos grandes, SAHI no aporta (y puede bajar un poco): por eso existe el modo combinado.",
    { x: 9.3, y: 4.35, w: 3.35, h: 1.8, fontFace: BFONT, fontSize: 13, color: C.ink, margin: 0 });
  footnote(s, "Valores de referencia; reemplaza con tu corrida (notebook 02).");
  footer(s, false);
})();

// caso de uso por clase
(function () {
  const s = contentSlide();
  kicker(s, "Caso de uso · Seguridad ciudadana", C.sahi);
  title(s, "Más personas y motos detectadas");
  s.addChart(pres.charts.BAR, [
    { name: "YOLO", labels: ["motor", "people", "pedestrian", "bicycle", "car"], values: [90, 80, 120, 30, 400] },
    { name: "YOLO + SAHI", labels: ["motor", "people", "pedestrian", "bicycle", "car"], values: [410, 310, 540, 95, 720] },
  ], baseChartOpts({ x: 0.7, y: 2.1, w: 8.2, h: 4.2, barDir: "bar", chartColors: [C.yolo, C.sahi],
    showLegend: true, legendPos: "b", legendFontFace: BFONT, legendColor: C.mute }));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.3, y: 2.3, w: 3.35, h: 3.8, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.08 });
  s.addText("Lo que importa", { x: 9.55, y: 2.55, w: 2.9, h: 0.4, fontFace: HFONT, fontSize: 16, bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: "El mayor salto está en peatones, personas y motos.", options: { bullet: true, breakLine: true } },
    { text: "Justo las clases críticas para cámaras urbanas.", options: { bullet: true, breakLine: true } },
    { text: "Más cobertura = menos puntos ciegos.", options: { bullet: true, bold: true, color: "9FE6C0" } },
  ], { x: 9.55, y: 3.1, w: 2.9, h: 3, fontFace: BFONT, fontSize: 13, color: "CADCFC", paraSpaceAfter: 10, margin: 0 });
  footnote(s, "Detecciones por clase; valores de referencia (notebook 02 · analyze_classes).");
  footer(s, false);
})();

// trade-offs cuando si / cuando no
(function () {
  const s = contentSlide();
  kicker(s, "Criterio de ingeniería", C.blue);
  title(s, "Cuándo usar SAHI (y cuándo no)");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 2.15, w: 5.9, h: 4.0, fill: { color: C.panel }, line: { color: C.sahi, width: 1.5 }, rectRadius: 0.08, shadow: mkShadow() });
  s.addText("SÍ conviene", { x: 0.95, y: 2.35, w: 5.4, h: 0.5, fontFace: HFONT, fontSize: 20, bold: true, color: C.sahi, margin: 0 });
  s.addText([
    { text: "Objetos pequeños / lejanos (dron, satélite, CCTV).", options: { bullet: true, breakLine: true } },
    { text: "Imágenes de alta resolución.", options: { bullet: true, breakLine: true } },
    { text: "Escenas densas con muchos objetos.", options: { bullet: true, breakLine: true } },
    { text: "La precisión importa más que el tiempo real.", options: { bullet: true } },
  ], { x: 0.95, y: 3.0, w: 5.4, h: 3, fontFace: BFONT, fontSize: 14, color: C.ink, paraSpaceAfter: 12, margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.9, y: 2.15, w: 5.75, h: 4.0, fill: { color: C.panel }, line: { color: C.yolo, width: 1.5 }, rectRadius: 0.08, shadow: mkShadow() });
  s.addText("NO hace falta", { x: 7.15, y: 2.35, w: 5.3, h: 0.5, fontFace: HFONT, fontSize: 20, bold: true, color: C.yolo, margin: 0 });
  s.addText([
    { text: "Objetos grandes que llenan el frame.", options: { bullet: true, breakLine: true } },
    { text: "Tiempo real estricto sin GPU.", options: { bullet: true, breakLine: true } },
    { text: "Costo ≈ proporcional al nº de slices.", options: { bullet: true, breakLine: true } },
    { text: "Regla: bisturí para lo pequeño, no martillo para todo.", options: { bullet: true, bold: true, color: C.ink } },
  ], { x: 7.15, y: 3.0, w: 5.3, h: 3, fontFace: BFONT, fontSize: 14, color: C.ink, paraSpaceAfter: 12, margin: 0 });
  footer(s, false);
})();

// ecosistema
(function () {
  const s = contentSlide();
  kicker(s, "Todo abierto", C.blue);
  title(s, "El ecosistema open source");
  const tools = [
    ["Ultralytics YOLO11", "Detección · segmentación · pose", "AGPL-3.0", C.blue],
    ["SAHI", "Slicing e inferencia optimizada", "MIT", C.sahi],
    ["pycocotools", "Evaluación mAP estándar COCO", "FreeBSD", C.navy],
    ["Supervision", "Anotación y utilidades de visión", "MIT", C.gold],
  ];
  tools.forEach((t, i) => {
    const x = 0.7 + (i % 2) * 6.15, y = 2.2 + Math.floor(i / 2) * 2.05;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.8, h: 1.75, fill: { color: C.white }, line: { color: C.line, width: 1 }, rectRadius: 0.08, shadow: mkShadow() });
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.55, w: 0.65, h: 0.65, fill: { color: t[3] }, line: { color: t[3] } });
    s.addText(t[0][0], { x: x + 0.3, y: y + 0.55, w: 0.65, h: 0.65, align: "center", valign: "middle", fontFace: HFONT, fontSize: 22, bold: true, color: C.white, margin: 0 });
    s.addText([
      { text: t[0], options: { bold: true, fontSize: 16, color: C.ink } },
      { text: "   " + t[2], options: { fontSize: 11, color: t[3], bold: true, breakLine: true } },
      { text: t[1], options: { fontSize: 12, color: C.mute } },
    ], { x: x + 1.15, y: y + 0.35, w: 4.5, h: 1.1, fontFace: BFONT, valign: "middle", margin: 0 });
  });
  footer(s, false);
})();

// ============================================================
// Conclusiones + Gracias
// ============================================================
(function () {
  const s = pres.addSlide(); s.background = { color: C.navy };
  s.addText("CONCLUSIONES", { x: 0.9, y: 0.8, w: 11, h: 0.4, fontFace: BFONT, fontSize: 14, bold: true, color: C.sahi, charSpacing: 4, margin: 0 });
  s.addText("Lo que te llevas", { x: 0.9, y: 1.25, w: 11, h: 0.8, fontFace: HFONT, fontSize: 34, bold: true, color: C.white, margin: 0 });
  const pts = [
    ["YOLO aplasta, SAHI rebana", "Recuperas objetos pequeños sin reentrenar la arquitectura."],
    ["Ganancia medible", "El salto real está en AP_small — el caso de cámaras urbanas."],
    ["Tú controlas la complejidad", "Slice · overlap · postproceso · modos · segmentación · fine-tune."],
    ["100% open source y reproducible", "Ultralytics + SAHI + VisDrone, todo abierto."],
  ];
  let y = 2.4;
  pts.forEach((p, i) => {
    s.addShape(pres.shapes.OVAL, { x: 0.9, y, w: 0.55, h: 0.55, fill: { color: C.sahi }, line: { color: C.sahi } });
    s.addText(String(i + 1), { x: 0.9, y, w: 0.55, h: 0.55, align: "center", valign: "middle", fontFace: HFONT, fontSize: 18, bold: true, color: C.white, margin: 0 });
    s.addText([
      { text: p[0] + "  ", options: { bold: true, fontSize: 18, color: C.white } },
      { text: "— " + p[1], options: { fontSize: 14, color: "CADCFC" } },
    ], { x: 1.7, y: y - 0.05, w: 10.8, h: 0.7, fontFace: BFONT, valign: "middle", margin: 0 });
    y += 1.0;
  });
  footer(s, true);
})();

(function () {
  const s = pres.addSlide(); s.background = { color: C.navy };
  s.addText("¡Gracias!", { x: 0.9, y: 2.2, w: 11.5, h: 1.2, fontFace: HFONT, fontSize: 54, bold: true, color: C.white, margin: 0 });
  s.addText("Preguntas y experimentos en vivo", { x: 0.95, y: 3.5, w: 11, h: 0.6, fontFace: BFONT, fontSize: 20, italic: true, color: "CADCFC", margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 4.4, w: 11.5, h: 1.5, fill: { color: C.navy2 }, line: { color: "1C4A73", width: 1 }, rectRadius: 0.08 });
  s.addText([
    { text: "Repositorio:  ", options: { bold: true, color: C.sahi } },
    { text: "github.com/jossuema/yolo-sahi-flisol2026", options: { color: C.white, breakLine: true } },
    { text: "Recursos:  ", options: { bold: true, color: C.sahi } },
    { text: "ultralytics.com  ·  github.com/obss/sahi  ·  VisDrone2019-DET", options: { color: "CADCFC" } },
  ], { x: 1.2, y: 4.6, w: 11, h: 1.1, fontFace: BFONT, fontSize: 15, valign: "middle", margin: 0 });
  footer(s, true);
})();

const outFile = path.join(ROOT, "slides", "YOLO_SAHI_FLISOL2026.pptx");
pres.writeFile({ fileName: outFile }).then(() => console.log("OK ->", outFile));
