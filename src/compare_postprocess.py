"""Comparación de tipos de POSTPROCESAMIENTO de SAHI.

Al cortar en slices con solape, un mismo objeto aparece en varios slices.
El postprocesamiento fusiona esas detecciones duplicadas. SAHI ofrece:

  - NMS        (Non-Maximum Suppression): descarta la caja de menor score
               cuando dos se solapan demasiado. Rápido, estándar.
  - NMM        (Non-Maximum Merging): en vez de descartar, FUSIONA las cajas
               solapadas en una sola. Mejor para objetos partidos por el corte.
  - GREEDYNMM  (Greedy NMM): variante voraz de NMM, el valor por defecto de SAHI.

La métrica de match puede ser IOU o IOS (Intersection over Smaller area).

Este script evalúa el mismo modelo+slicing variando el postprocesamiento y
reporta mAP / AP_small / nº detecciones. Alimenta '04_postprocess.png'.

Requiere modelo entrenado en VisDrone (para el mAP). Las detecciones se cuentan
siempre.

Uso:
    python src/compare_postprocess.py --limit 60
"""
import argparse

import pandas as pd
from pycocotools.coco import COCO
from sahi.predict import get_sliced_prediction
from tqdm import tqdm

import config
from evaluate import build_model, coco_eval

POSTPROCESS_TYPES = ["NMS", "NMM", "GREEDYNMM"]


def run(model_path: str, limit: int, metric: str):
    coco_gt = COCO(str(config.COCO_GT_PATH))
    model = build_model(model_path)
    img_ids = sorted(coco_gt.getImgIds())[:limit]

    rows = []
    for pp in POSTPROCESS_TYPES:
        preds, n_det = [], 0
        for img_id in tqdm(img_ids, desc=pp, leave=False):
            info = coco_gt.loadImgs(img_id)[0]
            img_path = str(config.VISDRONE_DIR / "images" / info["file_name"])
            r = get_sliced_prediction(
                img_path, model,
                slice_height=config.SLICE_HEIGHT, slice_width=config.SLICE_WIDTH,
                overlap_height_ratio=config.OVERLAP_HEIGHT_RATIO,
                overlap_width_ratio=config.OVERLAP_WIDTH_RATIO,
                postprocess_type=pp, postprocess_match_metric=metric,
                postprocess_match_threshold=config.POSTPROCESS_MATCH_THRESHOLD,
                verbose=0,
            )
            preds += r.to_coco_predictions(image_id=img_id)
            n_det += len(r.object_prediction_list)
        m = coco_eval(coco_gt, preds)
        rows.append({"postprocess": pp, "match": metric,
                     "mAP": round(m["mAP@.5:.95"], 4),
                     "mAP50": round(m["mAP@.5"], 4),
                     "AP_small": round(m["AP_small"], 4),
                     "detections": n_det})
        print(f"{pp:10s} mAP={m['mAP@.5:.95']:.4f}  AP_small={m['AP_small']:.4f}  det={n_det}")

    df = pd.DataFrame(rows)
    out = config.OUTPUTS_DIR / "postprocess.csv"
    df.to_csv(out, index=False)
    print(f"\nGuardado en {out}")
    return df


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=config.MODEL_PATH)
    ap.add_argument("--limit", type=int, default=60)
    ap.add_argument("--metric", default=config.POSTPROCESS_MATCH_METRIC,
                    choices=["IOU", "IOS"])
    args = ap.parse_args()
    run(args.model, args.limit, args.metric)
