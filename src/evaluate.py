"""Benchmark cuantitativo: YOLO vs YOLO + SAHI en VisDrone (mAP COCO).

Corre el MISMO modelo de dos formas sobre el set de validación:
  1) Estándar (imagen completa, sin slicing)
  2) Con SAHI (slicing + merge)
y evalúa ambas contra el ground truth con pycocotools, reportando:
  mAP@.5:.95, mAP@.5, y AP por tamaño (small / medium / large).

El AP de objetos PEQUEÑOS (AP_small) es la métrica estrella: ahí es donde
SAHI marca la diferencia. Estos son los números de tu charla.

Requiere un modelo entrenado en VisDrone (ver train_visdrone.py).

Uso:
    python src/evaluate.py --limit 100      # subconjunto rápido para demo
    python src/evaluate.py                   # set de val completo
"""
import argparse
import contextlib
import io
import json

import pandas as pd
from pycocotools.coco import COCO
from pycocotools.cocoeval import COCOeval
from sahi import AutoDetectionModel
from sahi.predict import get_prediction, get_sliced_prediction
from tqdm import tqdm

import config

STAT_NAMES = ["mAP@.5:.95", "mAP@.5", "mAP@.75", "AP_small", "AP_medium", "AP_large"]


def build_model(model_path: str):
    return AutoDetectionModel.from_pretrained(
        model_type="ultralytics",
        model_path=model_path,
        confidence_threshold=config.CONFIDENCE,
        device=config.DEVICE,
    )


def model_num_classes(det_model) -> int | None:
    """Número de clases del modelo cargado (para detectar desalineación)."""
    for attr in ("category_mapping",):
        m = getattr(det_model, attr, None)
        if m:
            return len(m)
    inner = getattr(det_model, "model", None)
    names = getattr(inner, "names", None)
    return len(names) if names else None


def check_class_alignment(det_model, coco_gt: COCO):
    """Avisa si el modelo NO está alineado con el dataset (causa típica de mAP~0)."""
    n_model = model_num_classes(det_model)
    n_gt = len(coco_gt.getCatIds())
    if n_model is not None and n_model != n_gt:
        print("\n" + "!" * 70)
        print(f"⚠️  ADVERTENCIA: el modelo tiene {n_model} clases pero el ground truth")
        print(f"    de VisDrone tiene {n_gt}. Los category_id NO coinciden, así que el")
        print(f"    mAP saldrá ~0 (estás evaluando en ZERO-SHOT con un modelo COCO).")
        print(f"    👉 Entrena en VisDrone primero: notebooks/00_entrenamiento.ipynb")
        print(f"       o  python src/train_visdrone.py  y usa weights/visdrone_yolo11s.pt")
        print("!" * 70 + "\n")
        return False
    return True


def coco_eval(coco_gt: COCO, predictions: list) -> dict:
    """Evalúa una lista de predicciones COCO y devuelve las 6 métricas clave."""
    if not predictions:
        return {name: 0.0 for name in STAT_NAMES}
    coco_dt = coco_gt.loadRes(predictions)
    ev = COCOeval(coco_gt, coco_dt, "bbox")
    with contextlib.redirect_stdout(io.StringIO()):  # silenciar el dump largo
        ev.evaluate()
        ev.accumulate()
        ev.summarize()
    return dict(zip(STAT_NAMES, ev.stats[:6]))


def per_class_ap(coco_gt: COCO, predictions: list) -> dict:
    """AP@.5:.95 por cada clase (para ver dónde gana SAHI)."""
    out = {c["id"]: 0.0 for c in coco_gt.loadCats(coco_gt.getCatIds())}
    if not predictions:
        return out
    coco_dt = coco_gt.loadRes(predictions)
    for cid in coco_gt.getCatIds():
        ev = COCOeval(coco_gt, coco_dt, "bbox")
        ev.params.catIds = [cid]
        with contextlib.redirect_stdout(io.StringIO()):
            ev.evaluate(); ev.accumulate(); ev.summarize()
        out[cid] = float(ev.stats[0])
    return out


def run(model_path: str, limit: int | None):
    coco_gt = COCO(str(config.COCO_GT_PATH))
    model = build_model(model_path)
    check_class_alignment(model, coco_gt)

    img_ids = sorted(coco_gt.getImgIds())
    if limit:
        img_ids = img_ids[:limit]

    preds_std, preds_sahi = [], []
    for img_id in tqdm(img_ids, desc="Evaluando"):
        info = coco_gt.loadImgs(img_id)[0]
        img_path = str(config.VISDRONE_DIR / "images" / info["file_name"])

        # --- YOLO estándar ---
        r_std = get_prediction(img_path, model)
        preds_std += r_std.to_coco_predictions(image_id=img_id)

        # --- YOLO + SAHI ---
        r_sahi = get_sliced_prediction(
            img_path, model,
            slice_height=config.SLICE_HEIGHT, slice_width=config.SLICE_WIDTH,
            overlap_height_ratio=config.OVERLAP_HEIGHT_RATIO,
            overlap_width_ratio=config.OVERLAP_WIDTH_RATIO,
            postprocess_type=config.POSTPROCESS_TYPE,
            postprocess_match_metric=config.POSTPROCESS_MATCH_METRIC,
            postprocess_match_threshold=config.POSTPROCESS_MATCH_THRESHOLD,
            verbose=0,
        )
        preds_sahi += r_sahi.to_coco_predictions(image_id=img_id)

    m_std = coco_eval(coco_gt, preds_std)
    m_sahi = coco_eval(coco_gt, preds_sahi)

    df = pd.DataFrame({
        "Métrica": STAT_NAMES,
        "YOLO": [round(m_std[k], 4) for k in STAT_NAMES],
        "YOLO+SAHI": [round(m_sahi[k], 4) for k in STAT_NAMES],
    })
    df["Δ (puntos)"] = (df["YOLO+SAHI"] - df["YOLO"]).round(4)
    df["Δ %"] = ((df["YOLO+SAHI"] - df["YOLO"]) / df["YOLO"].replace(0, float("nan"))
                 * 100).round(1)

    out_csv = config.OUTPUTS_DIR / "benchmark_map.csv"
    df.to_csv(out_csv, index=False)
    (config.OUTPUTS_DIR / "benchmark_map.json").write_text(
        json.dumps({"yolo": m_std, "yolo_sahi": m_sahi, "n_images": len(img_ids)}, indent=2)
    )

    # --- AP por clase (reutiliza las predicciones ya calculadas) ---
    ap_std = per_class_ap(coco_gt, preds_std)
    ap_sahi = per_class_ap(coco_gt, preds_sahi)
    id2name = {c["id"]: c["name"] for c in coco_gt.loadCats(coco_gt.getCatIds())}
    df_cls = pd.DataFrame([
        {"clase": id2name[cid],
         "AP_YOLO": round(ap_std[cid], 4),
         "AP_YOLO+SAHI": round(ap_sahi[cid], 4)}
        for cid in coco_gt.getCatIds()
    ])
    df_cls.to_csv(config.OUTPUTS_DIR / "per_class_ap.csv", index=False)

    print(f"\n=== BENCHMARK mAP — VisDrone val ({len(img_ids)} imágenes) ===")
    print(df.to_string(index=False))
    print("\n--- AP por clase ---")
    print(df_cls.to_string(index=False))
    print(f"\nGuardado en {out_csv} y per_class_ap.csv")
    print("\n👉 Mira AP_small: ahí SAHI da el mayor salto (objetos diminutos aéreos).")
    return df


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=config.MODEL_PATH)
    ap.add_argument("--limit", type=int, default=None, help="nº de imágenes (None = todas)")
    args = ap.parse_args()
    run(args.model, args.limit)
