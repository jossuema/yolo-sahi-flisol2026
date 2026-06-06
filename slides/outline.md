# Computer Vision Open Source: Mejorando YOLO con SAHI
## Esquematización de la presentación — FLISOL 2026

> Duración objetivo: **35–40 min** + preguntas.
> Cada sección indica: **objetivo**, **contenido**, **figura/recurso** y **notas del orador**.
> Las figuras se generan con `notebooks/02_resultados_figuras.ipynb` → `outputs/figures/`.

---

## BLOQUE 0 — Apertura (2 min)

### Slide 1 — Portada
- Título, tu nombre, FLISOL 2026.
- Subtítulo: *"Detectando lo que YOLO no ve: objetos pequeños en cámaras urbanas"*.
- Imagen de fondo: una toma aérea urbana llena de objetos diminutos.

### Slide 2 — ¿Quién soy y de qué va esto?
- Una línea sobre ti.
- Promesa de la charla: *"Al final vas a saber cómo subir el mAP de objetos pequeños sin reentrenar nada raro, con puro open source."*
- Mención: todo el código y los datos son abiertos y reproducibles (QR al repo).

---

## BLOQUE 1 — El problema (6 min)

### Slide 3 — ¿Qué es la detección de objetos?
- Clasificación vs detección vs segmentación (imagen comparativa).
- Salida de un detector: cajas (bbox) + clase + score de confianza.
- Métrica estándar: **mAP** (mean Average Precision) e **IoU**.

### Slide 4 — Recordatorio: ¿qué es YOLO?
- "You Only Look Once": detección en **una sola pasada** (single-stage) → rápido.
- Breve línea de tiempo: YOLOv1 → v3 → v5 → v8 → **YOLO11** (Ultralytics, open source, AGPL).
- Grid, anchors/anchor-free, backbone-neck-head (a alto nivel, sin saturar).
- Por qué es el caballo de batalla del CV open source: fácil, rápido, buena comunidad.

### Slide 5 — El talón de Aquiles: objetos pequeños
- YOLO **redimensiona** la imagen completa a su tamaño de entrada (p. ej. 640×640).
- Una imagen 4K (3840×2160) → al reducirla, una moto lejana pasa de ~40px a ~6px.
- A 6px el objeto pierde casi toda su información → **el detector no lo ve**.
- **Figura:** ejemplo real donde YOLO se pierde la mitad de las motos/personas.
- Frase ancla: *"No es que YOLO sea malo; es que le estamos dando la imagen aplastada."*

### Slide 5b — Evidencia: el dataset es casi todo "objetos pequeños"
- **Figura:** `06_size_distribution.png` (histograma de √área con umbrales COCO 32/96 px).
- Dato de impacto: *"el X% de los objetos de VisDrone son < 32 px"* (small).
- **Figura:** `07_objects_per_image.png` — densidad altísima (promedio N objetos/imagen).
- Conclusión: este es exactamente el escenario donde YOLO clásico colapsa y SAHI ayuda.

### Slide 6 — ¿Dónde duele esto en la vida real?
- Seguridad ciudadana (cámaras urbanas, drones).
- Tráfico, conteo de personas, agricultura de precisión, inspección aérea, satélite.
- Conector al caso de estudio: **VisDrone** (vista aérea urbana, el peor caso para objetos pequeños).

---

## BLOQUE 2 — La solución: SAHI (10 min)

### Slide 7 — La idea central de SAHI
- **SAHI** = *Slicing Aided Hyper Inference* (open source, MIT, librería `sahi`).
- No reemplaza a YOLO: lo **envuelve**. Funciona con YOLO, MMDetection, Detectron2, etc.
- Intuición: en vez de aplastar la imagen, la **cortamos en pedazos** y detectamos en cada uno a resolución nativa.

### Slide 8 — El pipeline de slicing
- **Figura:** `00_pipeline_sahi.png` (diagrama imagen → slices → YOLO por slice → merge → salida).
- Pasos:
  1. Cortar la imagen en mosaicos (*slices*) con **solapamiento**.
  2. Correr YOLO en cada slice (el objeto ahora ocupa más píxeles).
  3. Reproyectar las cajas a coordenadas globales.
  4. **Fusionar** detecciones duplicadas (postprocesamiento).

### Slide 9 — Parámetro clave 1: tamaño de slice
- `slice_height` / `slice_width` (p. ej. 512, 640).
- Slice más pequeño → objetos relativos más grandes → detectas más pequeños, **pero más slices = más lento**.
- Debe ser coherente con el `imgsz` con el que se entrenó el modelo.

### Slide 10 — Parámetro clave 2: solapamiento (overlap)
- `overlap_height_ratio` / `overlap_width_ratio` (p. ej. 0.2 = 20%).
- Sin solape, un objeto en el borde se **parte en dos** y ninguna mitad se detecta bien.
- El solape garantiza que cada objeto aparezca completo en al menos un slice.
- Trade-off: más solape → más slices redundantes → más lento.

### Slide 10b — Cómo se reparten los slices (visual)
- **Figura:** `09_slice_grid.png` (rejilla de slices con overlap 0.0 / 0.2 / 0.4 sobre una imagen real).
- Las zonas oscuras = solapamiento. Se ve cómo sube el nº de slices con el overlap.
- Mensaje: *"el overlap es el seguro contra objetos cortados por el borde del slice."*

### Slide 11 — Modos de inferencia de SAHI
- **Standard prediction**: imagen completa, sin cortar (= YOLO normal). Bueno para objetos grandes.
- **Sliced prediction**: solo los slices. Bueno para objetos pequeños.
- **Combinado (full + sliced)**: corre ambos y fusiona → cubre objetos grandes Y pequeños. Lo más robusto, lo más lento.
- En código: `get_prediction()` vs `get_sliced_prediction()`.

### Slide 12 — El paso crítico: POSTPROCESAMIENTO (fusión)
- Problema: con solape, **el mismo objeto se detecta varias veces** (en slices vecinos y en la pasada completa).
- Hay que fusionar esas cajas duplicadas. SAHI ofrece 3 estrategias:

| Tipo | Qué hace | Cuándo usarlo |
|---|---|---|
| **NMS** (Non-Maximum Suppression) | Si dos cajas se solapan demasiado, **descarta** la de menor score | Rápido, clásico; puede perder objetos pegados |
| **NMM** (Non-Maximum Merging) | En vez de descartar, **fusiona** las cajas solapadas en una sola | Mejor para objetos partidos por el corte |
| **GREEDYNMM** (Greedy NMM) | Variante voraz de NMM, **valor por defecto** de SAHI | Buen balance general |

### Slide 13 — Métrica y umbral de match
- **Match metric**: cómo se mide si dos cajas son "la misma":
  - **IoU** (Intersection over Union): solape clásico.
  - **IOS** (Intersection over Smaller): solape relativo a la caja más pequeña → mejor cuando una caja está contenida en otra (típico al cortar). Default de SAHI.
- **Match threshold** (p. ej. 0.5): qué tan solapadas deben estar para considerarse duplicadas.
- **Figura:** `04_postprocess.png` (mAP / AP_small por tipo de postprocesamiento).
- Mensaje: *"NMM/GREEDYNMM suelen ganar a NMS en escenas densas porque fusionan en lugar de descartar."*

---

## BLOQUE 2.5 — SAHI más allá de las cajas: segmentación (5 min)

### Slide 13b — Detección vs segmentación de instancias
- Recordatorio: detección = cajas; **segmentación de instancias = máscara por objeto** (contorno a nivel de píxel).
- YOLO también tiene variante **-seg** (`yolo11s-seg.pt`), open source.
- Mismo talón de Aquiles: en objetos pequeños la máscara es burda o no existe.

### Slide 13c — SAHI con segmentación
- SAHI funciona **igual** con modelos de segmentación: cada slice produce máscaras a resolución nativa y se fusionan.
- En código solo cambia el modelo (`yolo11s-seg.pt`); el resto del pipeline es idéntico.
  ```python
  seg = AutoDetectionModel.from_pretrained(model_type='ultralytics', model_path='yolo11s-seg.pt')
  result = get_sliced_prediction(img, seg, slice_height=640, slice_width=640, overlap_height_ratio=0.2)
  ```
- **Figura:** `outputs/segmentation/seg_*.jpg` (máscaras YOLO-seg vs YOLO-seg+SAHI).
- Mensaje: *"SAHI no es solo para cajas; mejora también las máscaras de instancias pequeñas."*
- Nota honesta: VisDrone no trae máscaras de ground truth, así que esto se muestra **cualitativamente** (no medimos mAP de segmentación). El benchmark mAP es sobre detección.

---

## BLOQUE 3 — Demo y caso de estudio (8 min)

### Slide 14 — Caso de estudio: seguridad ciudadana
- Dataset **VisDrone2019-DET**: imágenes de dron urbanas, 10 clases (pedestrian, people, bicycle, car, van, truck, tricycle, awning-tricycle, bus, **motor**).
- Foco de la charla: **personas y motos** (relevante para seguridad).
- Todo open source y reproducible.

### Slide 15 — El pipeline en código (mínimo)
- Mostrar el bloque esencial (10 líneas):
  ```python
  from sahi import AutoDetectionModel
  from sahi.predict import get_sliced_prediction
  model = AutoDetectionModel.from_pretrained(
      model_type="ultralytics", model_path="best.pt", device="cuda:0")
  result = get_sliced_prediction(img, model, slice_height=640, slice_width=640,
              overlap_height_ratio=0.2, overlap_width_ratio=0.2,
              postprocess_type="GREEDYNMM")
  ```
- Enfatizar: *"Esto es todo. Tu YOLO ya entrenado, envuelto en SAHI."*

### Slide 16 — DEMO EN VIVO
- Notebook `01_demo_colab.ipynb` en Colab (GPU T4).
- Secuencia: imagen aérea → YOLO solo (pocas cajas) → YOLO+SAHI (muchas más cajas).
- **Plan B grabado**: tener el video/galería listos por si falla el internet.

### Slide 17 — Galería antes/después
- **Figura:** `outputs/gallery/01_*.jpg` (las de mayor ganancia de detecciones).
- "YOLO: 23 objetos" vs "YOLO+SAHI: 78 objetos" sobre la misma imagen.

---

## BLOQUE 4 — Resultados (6 min)

### Slide 18 — El experimento
- Mismo modelo, evaluado de dos formas sobre VisDrone val.
- Métrica: mAP COCO (mAP@.5:.95, mAP@.5) + **AP por tamaño** (small/medium/large).
- Herramienta: `pycocotools`. Todo en `src/evaluate.py`.

### Slide 19 — Resultados globales de mAP
- **Figura:** `01_map_comparison.png` (barras YOLO vs YOLO+SAHI).
- Leer los números clave en voz alta (Δ%).

### Slide 20 — Donde SAHI brilla: objetos pequeños
- **Figura:** `02_ap_por_tamano.png` (AP_small / medium / large).
- Mensaje central: *"El salto grande está en AP_small. SAHI es para objetos pequeños."*

### Slide 20b — ¿En qué clases ayuda más? (caso seguridad ciudadana)
- **Figura:** `05_per_class.png` (detecciones por clase) y `10_per_class_ap.png` (AP por clase).
- Resaltar el salto en **pedestrian / people / motor** — justo las clases del caso de uso.
- `05` = cuántos objetos más encuentra; `10` = cuánto mejora la precisión (AP) por clase.

### Slide 21 — El costo: precisión vs velocidad
- **Figura:** `03_slice_tradeoff.png` (detecciones y tiempo vs tamaño de slice).
- Honestidad técnica: SAHI es **N veces más lento** (N = nº de slices). No es gratis.
- Cuándo vale la pena: cuando la precisión en objetos pequeños importa más que el tiempo real.

---

## BLOQUE 5 — Llevándolo a producción (4 min)

### Slide 22 — Optimizaciones prácticas
- Ajustar tamaño de slice al tamaño típico de objeto.
- Usar **solo sliced** (sin full) si todos los objetos son pequeños → menos cómputo.
- **FP16 / half precision**, batch de slices, modelo más pequeño (yolo11n/s).
- Exportar a ONNX/TensorRT para inferencia.
- Procesar 1 de cada N frames en video.

### Slide 23 — Cuándo NO usar SAHI
- Objetos grandes que ocupan buena parte del frame → SAHI no aporta y solo cuesta.
- Necesidad estricta de tiempo real sin GPU.
- Regla: *"SAHI es un bisturí para objetos pequeños, no un martillo para todo."*

### Slide 24 — El ecosistema open source
- **Ultralytics YOLO11** (detección/segmentación/pose) — AGPL.
- **SAHI** (slicing) — MIT.
- **Supervision** (anotación/tracking), **pycocotools** (eval), **Roboflow / FiftyOne** (datos).
- Todos compatibles entre sí.

---

## BLOQUE 6 — Cierre (3 min)

### Slide 25 — Conclusiones
- YOLO es excelente pero **aplasta** la imagen → falla en objetos pequeños.
- SAHI **rebana** la imagen y recupera esos objetos, sin reentrenar.
- Ganancia real medible en **AP_small**; costo: tiempo de inferencia.
- 100% open source y reproducible.

### Slide 26 — Recursos y repo
- QR al repositorio del proyecto.
- Links: Ultralytics, SAHI, VisDrone, el paper de SAHI (Akyon et al., 2022).
- Invitación a contribuir / probar con sus propias cámaras.

### Slide 27 — ¡Gracias! / Preguntas
- Tu contacto.

---

## Anexo — Preguntas frecuentes que pueden caer

- **¿SAHI necesita reentrenar el modelo?** No, envuelve tu modelo ya entrenado. (Aunque entrenar en el dominio + SAHI da lo mejor.)
- **¿Funciona en video en tiempo real?** Depende; con GPU, slices grandes y frame-skip, sí en muchos casos.
- **¿Sirve para segmentación?** Sí, SAHI soporta máscaras además de cajas.
- **¿Por qué IOS y no IoU?** Porque al cortar, una caja suele quedar contenida en otra; IOS lo captura mejor.
- **¿Qué diferencia NMM de NMS?** NMS descarta duplicados; NMM los fusiona (mejor para objetos partidos por el corte).
- **¿Cuánto más lento?** Aproximadamente proporcional al número de slices (+ la pasada full si la usas).

---

## Checklist de figuras a generar (para las slides)

| Slide | Figura | Script |
|---|---|---|
| 5b | `06_size_distribution.png`, `07_objects_per_image.png` | `stats_dataset.py` |
| 8 | `00_pipeline_sahi.png` | `figures.py` |
| 10b | `09_slice_grid.png` | `viz_slices.py` |
| 13 | `04_postprocess.png` | `compare_postprocess.py` → `figures.py` |
| 13c | `segmentation/seg_*.jpg` | `segment.py` |
| 14 | `08_class_distribution.png` | `stats_dataset.py` |
| 17 | `gallery/*.jpg` | `gallery.py` |
| 19 | `01_map_comparison.png` | `evaluate.py` → `figures.py` |
| 20 | `02_ap_por_tamano.png` | `evaluate.py` → `figures.py` |
| 20b | `05_per_class.png`, `10_per_class_ap.png` | `analyze_classes.py` / `evaluate.py` → `figures.py` |
| 21 | `03_slice_tradeoff.png` | `slice_sweep.py` → `figures.py` |

Genera todo de una con `notebooks/02_resultados_figuras.ipynb`.
