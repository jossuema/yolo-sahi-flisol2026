"""Barrido de tamaño de slice: detecciones y tiempo (trade-off precisión/velocidad).

Corre SAHI con varios tamaños de slice sobre un subconjunto de imágenes y
registra cuántas detecciones produce y cuánto tarda. Alimenta la figura
'03_slice_tradeoff.png'.

Funciona con cualquier modelo (mide conteo de detecciones, no mAP).

Uso:
    python src/slice_sweep.py --limit 15 --sizes 320 512 640 768 1024
"""
import argparse
import time

import pandas as pd
from sahi.predict import get_sliced_prediction
from tqdm import tqdm

import config
from evaluate import build_model


def run(model_path: str, limit: int, sizes: list):
    img_dir = config.VISDRONE_DIR / "images"
    images = sorted(img_dir.glob("*.jpg"))[:limit]
    if not images:
        raise SystemExit(f"No hay imágenes en {img_dir}. Corre src/datasets.py primero.")

    model = build_model(model_path)
    rows = []
    for s in sizes:
        n_det, elapsed = 0, 0.0
        for img in tqdm(images, desc=f"slice {s}px", leave=False):
            t0 = time.perf_counter()
            r = get_sliced_prediction(
                str(img), model, slice_height=s, slice_width=s,
                overlap_height_ratio=config.OVERLAP_HEIGHT_RATIO,
                overlap_width_ratio=config.OVERLAP_WIDTH_RATIO,
                postprocess_type=config.POSTPROCESS_TYPE, verbose=0,
            )
            elapsed += time.perf_counter() - t0
            n_det += len(r.object_prediction_list)
        rows.append({"slice": s, "detections": n_det,
                     "time_s": round(elapsed, 2),
                     "time_per_img": round(elapsed / len(images), 3)})
        print(f"slice={s}px -> {n_det} detecciones en {elapsed:.1f}s")

    df = pd.DataFrame(rows)
    out = config.OUTPUTS_DIR / "slice_sweep.csv"
    df.to_csv(out, index=False)
    print(f"\nGuardado en {out}")
    return df


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=config.MODEL_PATH)
    ap.add_argument("--limit", type=int, default=15)
    ap.add_argument("--sizes", type=int, nargs="+", default=[320, 512, 640, 768, 1024])
    args = ap.parse_args()
    run(args.model, args.limit, args.sizes)
