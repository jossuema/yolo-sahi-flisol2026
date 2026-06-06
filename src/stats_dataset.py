"""Estadísticas del dataset VisDrone (explicativas, sin necesidad de modelo).

Lee el ground truth en COCO (data/visdrone_val_coco.json) y genera gráficos que
explican POR QUÉ este dataset es el caso ideal para SAHI:

  - 06_size_distribution.png : distribución del tamaño de los objetos (la mayoría
                               son 'small' según el criterio COCO < 32px).
  - 07_objects_per_image.png : cuántos objetos hay por imagen (densidad extrema).
  - 08_class_distribution.png: frecuencia de cada clase en el ground truth.

Uso:
    python src/stats_dataset.py
"""
import json
import math
from collections import Counter

import matplotlib.pyplot as plt

import config

FIG_DIR = config.OUTPUTS_DIR / "figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)
C_MAIN = "#3A6EA5"
C_SMALL = "#E4572E"


def _load_gt():
    if not config.COCO_GT_PATH.exists():
        raise SystemExit(f"Falta {config.COCO_GT_PATH}. Corre scripts/download_visdrone.py")
    return json.loads(config.COCO_GT_PATH.read_text())


def fig_size_distribution(gt):
    # sqrt(area) ~ lado del objeto en px; umbrales COCO: 32 y 96
    sides = [math.sqrt(a["area"]) for a in gt["annotations"] if a["area"] > 0]
    small = sum(s < 32 for s in sides)
    medium = sum(32 <= s < 96 for s in sides)
    large = sum(s >= 96 for s in sides)
    total = max(len(sides), 1)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.hist([s for s in sides if s < 200], bins=60, color=C_MAIN, alpha=0.85)
    ax.axvline(32, color=C_SMALL, ls="--", lw=2, label="32 px (small/medium)")
    ax.axvline(96, color="#444", ls="--", lw=2, label="96 px (medium/large)")
    ax.set_xlabel("Tamaño del objeto  √área (px)")
    ax.set_ylabel("Nº de objetos")
    ax.set_title(f"VisDrone es 'small object': {100*small/total:.0f}% de los objetos < 32 px")
    ax.legend()
    ax.spines[["top", "right"]].set_visible(False)
    out = FIG_DIR / "06_size_distribution.png"
    fig.savefig(out, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  -> {out}  (small={small}, medium={medium}, large={large})")


def fig_objects_per_image(gt):
    per_img = Counter(a["image_id"] for a in gt["annotations"])
    counts = list(per_img.values())
    avg = sum(counts) / max(len(counts), 1)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.hist(counts, bins=40, color="#2E8B57", alpha=0.85)
    ax.axvline(avg, color=C_SMALL, ls="--", lw=2, label=f"promedio = {avg:.0f}")
    ax.set_xlabel("Objetos por imagen")
    ax.set_ylabel("Nº de imágenes")
    ax.set_title("Densidad de objetos por imagen (por eso YOLO pierde tantos)")
    ax.legend()
    ax.spines[["top", "right"]].set_visible(False)
    out = FIG_DIR / "07_objects_per_image.png"
    fig.savefig(out, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  -> {out}  (promedio {avg:.1f} obj/img)")


def fig_class_distribution(gt):
    id2name = {c["id"]: c["name"] for c in gt["categories"]}
    counts = Counter(a["category_id"] for a in gt["annotations"])
    items = sorted(((id2name.get(cid, str(cid)), n) for cid, n in counts.items()),
                   key=lambda x: x[1])
    names = [n for n, _ in items]
    vals = [v for _, v in items]

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(names, vals, color=C_MAIN)
    ax.set_xlabel("Nº de instancias (ground truth)")
    ax.set_title("Distribución de clases en VisDrone val")
    ax.spines[["top", "right"]].set_visible(False)
    out = FIG_DIR / "08_class_distribution.png"
    fig.savefig(out, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  -> {out}")


def all_stats():
    gt = _load_gt()
    print(f"Dataset: {len(gt['images'])} imágenes, {len(gt['annotations'])} objetos, "
          f"{len(gt['categories'])} clases")
    fig_size_distribution(gt)
    fig_objects_per_image(gt)
    fig_class_distribution(gt)


if __name__ == "__main__":
    all_stats()
