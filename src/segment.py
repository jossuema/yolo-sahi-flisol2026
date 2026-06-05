"""Segmentación de instancias con YOLO-seg + SAHI.

SAHI no solo mejora cajas: también funciona con modelos de SEGMENTACIÓN.
Cada slice produce máscaras a resolución nativa y luego se fusionan, así que
los objetos pequeños obtienen máscaras mucho más precisas (o aparecen del todo).

VisDrone es un dataset de DETECCIÓN (sin máscaras), por lo que la segmentación
se demuestra de forma CUALITATIVA con un modelo YOLO-seg pre-entrenado en COCO
sobre las mismas imágenes urbanas/aéreas.

Genera comparativas antes/después con máscaras dibujadas.

Uso:
    python src/segment.py --limit 20 --top 6
"""
import argparse
from pathlib import Path

import cv2
from sahi import AutoDetectionModel
from sahi.predict import get_prediction, get_sliced_prediction
from tqdm import tqdm

import config


def build_seg_model(model_path: str = None):
    return AutoDetectionModel.from_pretrained(
        model_type="ultralytics",
        model_path=model_path or config.SEG_MODEL,
        confidence_threshold=config.CONFIDENCE,
        device=config.DEVICE,
    )


def _visual(result, tmp_dir: Path, name: str):
    """Exporta la visualización (con máscaras) y la devuelve como imagen BGR."""
    result.export_visuals(export_dir=str(tmp_dir), file_name=name)
    return cv2.imread(str(tmp_dir / f"{name}.png"))


def compare(image_path: Path, model, out_dir: Path):
    """Panel YOLO-seg vs YOLO-seg+SAHI con máscaras. Devuelve (n_std, n_sahi)."""
    tmp = out_dir / "_tmp"
    tmp.mkdir(parents=True, exist_ok=True)

    r_std = get_prediction(str(image_path), model)
    r_sahi = get_sliced_prediction(
        str(image_path), model,
        slice_height=config.SLICE_HEIGHT, slice_width=config.SLICE_WIDTH,
        overlap_height_ratio=config.OVERLAP_HEIGHT_RATIO,
        overlap_width_ratio=config.OVERLAP_WIDTH_RATIO,
        postprocess_type=config.POSTPROCESS_TYPE, verbose=0,
    )
    n_std = len(r_std.object_prediction_list)
    n_sahi = len(r_sahi.object_prediction_list)

    left = _visual(r_std, tmp, f"std_{image_path.stem}")
    right = _visual(r_sahi, tmp, f"sahi_{image_path.stem}")
    if left is None or right is None:
        return n_std, n_sahi

    h = min(left.shape[0], right.shape[0])
    left = cv2.resize(left, (int(left.shape[1] * h / left.shape[0]), h))
    right = cv2.resize(right, (int(right.shape[1] * h / right.shape[0]), h))
    cv2.putText(left, f"YOLO-seg: {n_std}", (15, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 255), 3)
    cv2.putText(right, f"YOLO-seg + SAHI: {n_sahi}", (15, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 255, 0), 3)
    panel = cv2.hconcat([left, right])
    out = out_dir / f"seg_gain{n_sahi - n_std}_{image_path.stem}.jpg"
    cv2.imwrite(str(out), panel)
    return n_std, n_sahi


def main(model_path: str, limit: int, top: int):
    img_dir = config.VISDRONE_DIR / "images"
    images = sorted(img_dir.glob("*.jpg"))[:limit]
    if not images:
        raise SystemExit(f"No hay imágenes en {img_dir}. Corre src/datasets.py primero.")

    model = build_seg_model(model_path)
    out_dir = config.OUTPUTS_DIR / "segmentation"
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for img in tqdm(images, desc="Segmentando"):
        n_std, n_sahi = compare(img, model, out_dir)
        results.append((n_sahi - n_std, n_std, n_sahi, img))

    results.sort(key=lambda r: r[0], reverse=True)
    print(f"\nTop {top} por ganancia de instancias segmentadas:")
    for rank, (gain, n_std, n_sahi, img) in enumerate(results[:top], 1):
        print(f"  {rank:2d}. +{gain:3d} instancias (YOLO-seg {n_std} -> SAHI {n_sahi})  {img.name}")
    print(f"\nPaneles en {out_dir}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=None, help="por defecto yolo11s-seg.pt")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--top", type=int, default=6)
    args = ap.parse_args()
    main(args.model, args.limit, args.top)
