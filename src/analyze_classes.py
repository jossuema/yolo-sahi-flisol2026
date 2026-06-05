"""Análisis por clase: ¿en qué clases ayuda más SAHI?

Cuenta cuántas detecciones produce YOLO vs YOLO+SAHI POR CLASE sobre un
subconjunto del val. Útil para el caso de seguridad ciudadana: muestra el
salto concreto en 'pedestrian', 'people' y 'motor'.

Alimenta la figura '05_per_class.png'.

Uso:
    python src/analyze_classes.py --limit 60
"""
import argparse
from collections import defaultdict

import pandas as pd
from sahi.predict import get_prediction, get_sliced_prediction
from tqdm import tqdm

import config
from evaluate import build_model


def run(model_path: str, limit: int):
    img_dir = config.VISDRONE_DIR / "images"
    images = sorted(img_dir.glob("*.jpg"))[:limit]
    if not images:
        raise SystemExit(f"No hay imágenes en {img_dir}. Corre src/datasets.py primero.")

    model = build_model(model_path)
    std_counts = defaultdict(int)
    sahi_counts = defaultdict(int)

    for img in tqdm(images, desc="Analizando por clase"):
        r_std = get_prediction(str(img), model)
        for p in r_std.object_prediction_list:
            std_counts[p.category.id] += 1
        r_sahi = get_sliced_prediction(
            str(img), model,
            slice_height=config.SLICE_HEIGHT, slice_width=config.SLICE_WIDTH,
            overlap_height_ratio=config.OVERLAP_HEIGHT_RATIO,
            overlap_width_ratio=config.OVERLAP_WIDTH_RATIO,
            postprocess_type=config.POSTPROCESS_TYPE, verbose=0,
        )
        for p in r_sahi.object_prediction_list:
            sahi_counts[p.category.id] += 1

    rows = []
    for cid, name in config.VISDRONE_CLASSES.items():
        rows.append({"clase": name, "YOLO": std_counts.get(cid, 0),
                     "YOLO+SAHI": sahi_counts.get(cid, 0)})
    df = pd.DataFrame(rows)
    df["ganancia"] = df["YOLO+SAHI"] - df["YOLO"]

    out = config.OUTPUTS_DIR / "per_class.csv"
    df.to_csv(out, index=False)
    print("\n=== Detecciones por clase ===")
    print(df.to_string(index=False))
    print(f"\nGuardado en {out}")
    return df


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=config.MODEL_PATH)
    ap.add_argument("--limit", type=int, default=60)
    args = ap.parse_args()
    run(args.model, args.limit)
