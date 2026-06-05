"""Configuración central del proyecto YOLO + SAHI sobre VisDrone.

Todos los scripts importan de aquí para mantener parámetros consistentes
entre el entrenamiento, la evaluación (benchmark mAP) y la galería visual.
"""
from pathlib import Path

# --- Rutas ---
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
VISDRONE_DIR = DATA_DIR / "VisDrone2019-DET-val"      # imágenes + anotaciones crudas
COCO_GT_PATH = DATA_DIR / "visdrone_val_coco.json"     # ground truth en formato COCO
OUTPUTS_DIR = ROOT / "outputs"
WEIGHTS_DIR = ROOT / "weights"

# --- Descarga VisDrone (mirror oficial de Ultralytics) ---
VISDRONE_VAL_URL = (
    "https://github.com/ultralytics/assets/releases/download/v0.0.0/"
    "VisDrone2019-DET-val.zip"
)

# --- Modelo ---
# Para resultados REALES de mAP necesitas un modelo entrenado en VisDrone
# (corre src/train_visdrone.py). Apunta aquí a tus pesos entrenados:
MODEL_PATH = str(WEIGHTS_DIR / "visdrone_yolo11s.pt")
# Fallback rápido (sin entrenar) solo para la galería visual cualitativa:
FALLBACK_MODEL = "yolo11s.pt"
# Modelo de SEGMENTACIÓN de instancias (COCO-pretrained; VisDrone no trae máscaras,
# así que la segmentación se muestra de forma cualitativa sobre la imagen).
SEG_MODEL = "yolo11s-seg.pt"
CONFIDENCE = 0.25
DEVICE = "cuda:0"  # usa "cpu" si no hay GPU

# --- Clases VisDrone (orden de Ultralytics VisDrone.yaml) ---
# El índice = id de clase del modelo entrenado.
VISDRONE_CLASSES = {
    0: "pedestrian",
    1: "people",
    2: "bicycle",
    3: "car",
    4: "van",
    5: "truck",
    6: "tricycle",
    7: "awning-tricycle",
    8: "bus",
    9: "motor",
}
# Para el caso "seguridad ciudadana" resaltamos personas y motos:
HIGHLIGHT_CLASSES = [0, 1, 9]  # pedestrian, people, motor

# --- Parámetros SAHI (slicing) ---
# El corazón de la charla. 640px con 20% de solape funciona bien en VisDrone.
SLICE_HEIGHT = 640
SLICE_WIDTH = 640
OVERLAP_HEIGHT_RATIO = 0.2
OVERLAP_WIDTH_RATIO = 0.2
POSTPROCESS_TYPE = "GREEDYNMM"        # alternativas: "NMS", "NMM"
POSTPROCESS_MATCH_METRIC = "IOS"      # IOS (Intersection over Smaller) o IOU
POSTPROCESS_MATCH_THRESHOLD = 0.5

# Crear carpetas necesarias
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
