"""Fine-tune de YOLO11 en VisDrone.

Ultralytics descarga y convierte VisDrone automáticamente a partir de
'VisDrone.yaml'. El resultado (best.pt) es el modelo que usa evaluate.py
para producir el mAP REAL del benchmark de la charla.

¿POR QUÉ ENTRENAR? Sin entrenar, evaluarías un modelo COCO (80 clases) contra
el ground truth de VisDrone (10 clases): los IDs de clase NO coinciden y el
mAP sale ~0 (zero-shot). Entrenar alinea las clases y da números reales.

RECOMENDACIÓN: corre esto ANTES de la charla (no en vivo). En una GPU T4 de
Colab, ~30-50 épocas con yolo11s toman 2-4 horas. El best.pt queda en
weights/visdrone_yolo11s.pt.

Tip objetos pequeños: entrenar con imgsz mayor (p. ej. 960/1024) mejora la
detección de objetos diminutos, a costa de más tiempo/VRAM.

Uso:
    python src/train_visdrone.py --model yolo11s.pt --epochs 50 --imgsz 640
    python src/train_visdrone.py --epochs 3        # prueba rápida del pipeline
"""
import argparse
import shutil

from ultralytics import YOLO

import config


def main(model_name: str, epochs: int, imgsz: int, batch, patience: int, cache: bool):
    model = YOLO(model_name)
    model.train(
        data="VisDrone.yaml",   # Ultralytics lo descarga y convierte solo
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,            # -1 = autobatch (ajusta a la VRAM disponible)
        patience=patience,      # early stopping
        cache=cache,
        device=0 if config.DEVICE.startswith("cuda") else "cpu",
        project=str(config.ROOT / "runs"),
        name="visdrone",
        exist_ok=True,
    )
    best = config.ROOT / "runs" / "visdrone" / "weights" / "best.pt"
    if best.exists():
        dst = config.WEIGHTS_DIR / "visdrone_yolo11s.pt"
        shutil.copy(best, dst)
        print(f"\n✅ Modelo entrenado copiado a {dst}")
        print("Ya puedes correr el benchmark: python src/evaluate.py")
    else:
        print(f"\n⚠️  No se encontró {best}. Revisa el log de entrenamiento.")
    return best


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="yolo11s.pt")
    ap.add_argument("--epochs", type=int, default=50)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16, help="-1 para autobatch")
    ap.add_argument("--patience", type=int, default=15)
    ap.add_argument("--cache", action="store_true", help="cachear imágenes (más rápido, más RAM)")
    args = ap.parse_args()
    main(args.model, args.epochs, args.imgsz, args.batch, args.patience, args.cache)
