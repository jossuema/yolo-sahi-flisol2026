# Computer Vision Open Source: Mejorando YOLO con SAHI

> Charla **FLISOL 2026** — Detección de objetos pequeños en vista aérea urbana con **YOLO + SAHI**, evaluado sobre **VisDrone** con métricas reales de mAP.

Caso de estudio: **seguridad ciudadana** — detección de personas, motos y vehículos en imágenes de dron/cámaras urbanas, usando herramientas 100% open source.

---

## La idea

Los detectores como YOLO redimensionan la imagen completa a su tamaño de entrada (p. ej. 640px). En una imagen aérea, una persona o moto puede quedar en unos pocos píxeles y **no se detecta**.

**SAHI** (Slicing Aided Hyper Inference) parte la imagen en mosaicos con solapamiento, corre el detector en cada uno y fusiona las detecciones. Los objetos pequeños ocupan ahora una fracción mayor de cada mosaico → **se detectan**. El costo: mayor tiempo de inferencia.

```
Imagen ──► [slice][slice][slice] ──► YOLO en cada slice ──► merge (NMM) ──► detecciones
```

**Lo que demostramos con números:** el mismo modelo, evaluado con y sin SAHI sobre VisDrone val, mejora el mAP — y sobre todo el **AP de objetos pequeños** (`AP_small`).

---

## Flujo del proyecto

```
                 train_visdrone.py            evaluate.py
 VisDrone.yaml ──────────────────► best.pt ──────────────► tabla mAP (YOLO vs SAHI)
 (auto-descarga)                      │
                                      └────► gallery.py ──► imágenes antes/después
```

| Paso | Script | Cuándo |
|---|---|---|
| 1. Datos val + COCO GT | `scripts/download_visdrone.py` | una vez |
| 2. Fine-tune en VisDrone | `src/train_visdrone.py` | **antes** de la charla (~horas en T4) |
| 3. Benchmark mAP | `src/evaluate.py` | genera los números clave |
| 4. Barrido de slice | `src/slice_sweep.py` | trade-off precisión/velocidad |
| 5. Comparar postproceso | `src/compare_postprocess.py` | NMS vs NMM vs GREEDYNMM |
| 6. Análisis por clase | `src/analyze_classes.py` | personas, motos, vehículos |
| 7. Segmentación | `src/segment.py` | máscaras YOLO-seg + SAHI (cualitativo) |
| 8. Galería visual | `src/gallery.py` | imágenes antes/después |
| 9. Figuras para slides | `src/figures.py` | PNG de alta resolución |
| 10. (Bonus) Video | `src/pipeline_video.py` | con tu propio clip urbano |

> **Atajo sin entrenar:** la galería (`gallery.py`) funciona con `yolo11s.pt` (COCO) y ya muestra el efecto visual del slicing. El **mAP real** sí requiere el modelo entrenado en VisDrone (las clases deben coincidir con el ground truth).

---

## Inicio rápido

### Google Colab (recomendado — GPU gratis)

- [`notebooks/00_entrenamiento.ipynb`](notebooks/00_entrenamiento.ipynb) — **fine-tune en VisDrone** (paso previo para el mAP real).
- [`notebooks/01_demo_colab.ipynb`](notebooks/01_demo_colab.ipynb) — demo en vivo de la charla.
- [`notebooks/02_resultados_figuras.ipynb`](notebooks/02_resultados_figuras.ipynb) — genera todas las figuras para las slides.

Abre en Colab, activa GPU (T4) y ejecuta en orden.

> ⚠️ **El mAP requiere entrenar primero.** Evaluar un modelo COCO (`yolo11s.pt`, 80 clases)
> contra el ground truth de VisDrone (10 clases) da mAP ≈ 0 porque los `category_id` no coinciden
> (*zero-shot*). Corre `00_entrenamiento.ipynb` antes que `02_resultados_figuras.ipynb`.
> `evaluate.py` ahora avisa automáticamente si detecta esta desalineación.

### Local

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python scripts/download_visdrone.py            # 1. datos + COCO GT
python src/train_visdrone.py --epochs 30       # 2. fine-tune (necesita GPU)
python src/evaluate.py --limit 100             # 3. benchmark mAP
python src/slice_sweep.py --limit 15           # 4. trade-off de slice
python src/compare_postprocess.py --limit 60   # 5. NMS vs NMM vs GREEDYNMM
python src/gallery.py --limit 30 --top 8       # 6. galería antes/después
python src/figures.py                          # 7. figuras para slides
```

> En CPU: pon `DEVICE = "cpu"` en [`src/config.py`](src/config.py) (el entrenamiento será inviable; usa Colab).

---

## Estructura

```
├── notebooks/
│   ├── 01_demo_colab.ipynb        # Demo en vivo (Colab)
│   └── 02_resultados_figuras.ipynb # Genera todas las figuras para slides
├── src/
│   ├── config.py                  # Parámetros: modelo, clases, slices
│   ├── datasets.py                # VisDrone -> COCO ground truth
│   ├── train_visdrone.py          # Fine-tune YOLO11 en VisDrone
│   ├── evaluate.py                # ⭐ Benchmark mAP: YOLO vs YOLO+SAHI
│   ├── slice_sweep.py             # Trade-off tamaño de slice (detección/tiempo)
│   ├── compare_postprocess.py     # NMS vs NMM vs GREEDYNMM
│   ├── analyze_classes.py         # Detecciones por clase (personas, motos...)
│   ├── segment.py                 # Segmentación de instancias YOLO-seg + SAHI
│   ├── gallery.py                 # Comparativas visuales antes/después
│   ├── figures.py                 # Figuras PNG de alta resolución para slides
│   └── pipeline_video.py          # (Bonus) inferencia sobre video
├── scripts/download_visdrone.py
├── slides/outline.md              # Esquematización completa de la charla
├── data/  outputs/  weights/
```

---

## Parámetros clave (`src/config.py`)

| Parámetro | Efecto |
|---|---|
| `SLICE_HEIGHT/WIDTH` | Más pequeño = detecta objetos más diminutos, pero más lento |
| `OVERLAP_*_RATIO` | Solape entre slices; evita cortar objetos en los bordes |
| `POSTPROCESS_TYPE` | `GREEDYNMM` / `NMM` / `NMS` para fusionar duplicados |
| `MODEL_PATH` | Pesos entrenados en VisDrone (para mAP real) |

---

## Resultados que genera

CSV de datos:
- `outputs/benchmark_map.csv` — mAP@.5:.95, mAP@.5, **AP_small/medium/large** (YOLO vs SAHI, con Δ%)
- `outputs/slice_sweep.csv` — detecciones y tiempo por tamaño de slice
- `outputs/postprocess.csv` — mAP por tipo de postprocesamiento

Figuras para slides (`outputs/figures/`, 200 DPI):
- `00_pipeline_sahi.png` — diagrama del pipeline de slicing
- `01_map_comparison.png` — barras YOLO vs YOLO+SAHI
- `02_ap_por_tamano.png` — AP por tamaño (el gráfico estrella)
- `03_slice_tradeoff.png` — precisión vs velocidad
- `04_postprocess.png` — NMS vs NMM vs GREEDYNMM
- `05_per_class.png` — detecciones por clase (personas, motos...)
- `outputs/gallery/*.jpg` — comparativas de detección antes/después
- `outputs/segmentation/seg_*.jpg` — comparativas de segmentación antes/después

> Genera todo de una con `notebooks/02_resultados_figuras.ipynb`. Commitea los resultados para tenerlos a mano aunque falle el internet en la sala.

---

## Dataset

**VisDrone2019-DET** — imágenes de dron en escenarios urbanos con 10 clases
(pedestrian, people, bicycle, car, van, truck, tricycle, awning-tricycle, bus, motor).
Se descarga automáticamente desde el mirror de Ultralytics. Es el caso clásico de
objetos pequeños donde SAHI demuestra su valor.

---

## Herramientas open source

- [Ultralytics YOLO11](https://github.com/ultralytics/ultralytics) (AGPL-3.0)
- [SAHI](https://github.com/obss/sahi) (MIT)
- [pycocotools](https://github.com/cocodataset/cocoapi) · [Supervision](https://github.com/roboflow/supervision)

## Licencia

MIT (código de este repo). Los modelos YOLO de Ultralytics están bajo AGPL-3.0.
