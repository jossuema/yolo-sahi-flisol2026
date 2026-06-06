"""Visualización de cómo SAHI reparte los slices sobre la imagen.

Dibuja la rejilla de slices con y sin solapamiento. Las zonas donde dos o más
slices se superponen aparecen más oscuras (los rectángulos semitransparentes se
acumulan), lo que hace evidente para qué sirve el `overlap`.

Genera 'figures/09_slice_grid.png'.

Uso:
    python src/viz_slices.py                 # usa la primera imagen del val
    python src/viz_slices.py ruta/imagen.jpg
"""
import sys
from pathlib import Path

import cv2
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
from sahi.slicing import get_slice_bboxes

import config

FIG_DIR = config.OUTPUTS_DIR / "figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)


def _draw_panel(ax, image_rgb, bboxes, title):
    ax.imshow(image_rgb)
    for (x1, y1, x2, y2) in bboxes:
        # relleno semitransparente: los solapes se acumulan -> más oscuros
        ax.add_patch(mpatches.Rectangle((x1, y1), x2 - x1, y2 - y1,
                     facecolor="#2E8B57", alpha=0.18, edgecolor="white", linewidth=1.2))
    ax.set_title(f"{title}\n{len(bboxes)} slices", fontsize=14, fontweight="bold")
    ax.axis("off")


def visualize(image_path: str, slice_size: int = 512,
              overlaps=(0.0, 0.2, 0.4)):
    img = cv2.imread(str(image_path))
    if img is None:
        raise SystemExit(f"No se pudo leer {image_path}")
    image_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    H, W = img.shape[:2]

    fig, axes = plt.subplots(1, len(overlaps), figsize=(7 * len(overlaps), 7))
    if len(overlaps) == 1:
        axes = [axes]
    for ax, ov in zip(axes, overlaps):
        bboxes = get_slice_bboxes(
            image_height=H, image_width=W,
            slice_height=slice_size, slice_width=slice_size,
            overlap_height_ratio=ov, overlap_width_ratio=ov,
        )
        label = "Sin solape (overlap=0.0)" if ov == 0 else f"Overlap = {ov:.1f}"
        _draw_panel(ax, image_rgb, bboxes, label)

    fig.suptitle(f"Distribución de slices ({slice_size}×{slice_size} px) sobre imagen {W}×{H}",
                 fontsize=16, fontweight="bold")
    fig.tight_layout()
    out = FIG_DIR / "09_slice_grid.png"
    fig.savefig(out, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  -> {out}")
    return out


if __name__ == "__main__":
    if len(sys.argv) > 1:
        img = sys.argv[1]
    else:
        imgs = sorted((config.VISDRONE_DIR / "images").glob("*.jpg"))
        if not imgs:
            raise SystemExit("No hay imágenes. Corre src/datasets.py primero.")
        img = imgs[0]
    visualize(img)
