"""Fine-tune de YOLO11 en VisDrone.

Ultralytics descarga y convierte VisDrone automáticamente a partir de
'VisDrone.yaml'. El resultado (best.pt) es el modelo que usa evaluate.py
para producir el mAP REAL del benchmark de la charla.

RECOMENDACIÓN: corre esto ANTES de la charla (no en vivo). En una GPU T4 de
Colab, ~20-30 épocas con yolo11s toman un par de horas. Luego copia el best.pt
a weights/visdrone_yolo11s.pt.

Uso:
    python src/train_visdrone.py --model yolo11s.pt --epochs 30 --imgsz 640
"""
import argparse
import shutil

from ultralytics import YOLO

import config


def main(model_name: str, epochs: int, imgsz: int, batch: int):
    model = YOLO(model_name)
    results = model.train(
        data="VisDrone.yaml",   # Ultralytics lo descarga y convierte solo
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=0 if config.DEVICE.startswith("cuda") else "cpu",
        project=str(config.ROOT / "runs"),
        name="visdrone",
    )
    best = config.ROOT / "runs" / "visdrone" / "weights" / "best.pt"
    if best.exists():
        dst = config.WEIGHTS_DIR / "visdrone_yolo11s.pt"
        shutil.copy(best, dst)
        print(f"\nModelo entrenado copiado a {dst}")
        print("Ya puedes correr: python src/evaluate.py")
    return results


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="yolo11s.pt")
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16)
    args = ap.parse_args()
    main(args.model, args.epochs, args.imgsz, args.batch)
