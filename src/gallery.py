"""Galería visual antes/después: YOLO vs YOLO + SAHI sobre imágenes VisDrone.

Recorre un subconjunto del val, calcula cuántos objetos detecta cada método y
guarda comparativas lado a lado. Ordena por "ganancia" (objetos extra que SAHI
encontró) para que tengas a mano las imágenes MÁS impactantes para las slides.

Funciona con cualquier modelo:
  - Modelo VisDrone entrenado  -> demo rigurosa
  - yolo11s.pt (COCO, sin entrenar) -> demo visual rápida (autos/personas)

Uso:
    python src/gallery.py --limit 30 --top 8
"""
import argparse
from pathlib import Path

import cv2
from sahi.predict import get_prediction, get_sliced_prediction
from tqdm import tqdm

import config
from evaluate import build_model


def annotate(image, predictions, color):
    for p in predictions:
        x1, y1, x2, y2 = map(int, p.bbox.to_xyxy())
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
    return image


def make_panel(img_path: Path, model):
    image = cv2.imread(str(img_path))
    if image is None:
        return None, 0, 0

    r_std = get_prediction(str(img_path), model)
    r_sahi = get_sliced_prediction(
        str(img_path), model,
        slice_height=config.SLICE_HEIGHT, slice_width=config.SLICE_WIDTH,
        overlap_height_ratio=config.OVERLAP_HEIGHT_RATIO,
        overlap_width_ratio=config.OVERLAP_WIDTH_RATIO,
        postprocess_type=config.POSTPROCESS_TYPE, verbose=0,
    )
    n_std = len(r_std.object_prediction_list)
    n_sahi = len(r_sahi.object_prediction_list)

    left = annotate(image.copy(), r_std.object_prediction_list, (0, 0, 255))
    right = annotate(image.copy(), r_sahi.object_prediction_list, (0, 255, 0))
    cv2.putText(left, f"YOLO: {n_std} obj", (15, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 255), 3)
    cv2.putText(right, f"YOLO+SAHI: {n_sahi} obj", (15, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 255, 0), 3)
    panel = cv2.hconcat([left, right])
    return panel, n_std, n_sahi


def main(model_path: str, limit: int, top: int):
    img_dir = config.VISDRONE_DIR / "images"
    images = sorted(img_dir.glob("*.jpg"))[:limit]
    if not images:
        raise SystemExit(f"No hay imágenes en {img_dir}. Corre src/datasets.py primero.")

    model = build_model(model_path)
    results = []
    for img_path in tqdm(images, desc="Generando galería"):
        panel, n_std, n_sahi = make_panel(img_path, model)
        if panel is not None:
            results.append((n_sahi - n_std, n_std, n_sahi, img_path, panel))

    results.sort(key=lambda r: r[0], reverse=True)  # mayor ganancia primero
    gallery_dir = config.OUTPUTS_DIR / "gallery"
    gallery_dir.mkdir(exist_ok=True)

    print(f"\nTop {top} imágenes por ganancia de detecciones:")
    for rank, (gain, n_std, n_sahi, img_path, panel) in enumerate(results[:top], 1):
        out = gallery_dir / f"{rank:02d}_gain{gain}_{img_path.stem}.jpg"
        cv2.imwrite(str(out), panel)
        print(f"  {rank:2d}. +{gain:3d} objetos (YOLO {n_std} -> SAHI {n_sahi})  {out.name}")

    print(f"\nGalería en {gallery_dir}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=config.MODEL_PATH)
    ap.add_argument("--limit", type=int, default=30, help="imágenes a analizar")
    ap.add_argument("--top", type=int, default=8, help="mejores comparativas a guardar")
    args = ap.parse_args()
    main(args.model, args.limit, args.top)
