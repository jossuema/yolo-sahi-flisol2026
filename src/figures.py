"""Genera figuras listas para slides (PNG de alta resolución).

Lee los CSV producidos por evaluate.py / slice_sweep.py / compare_postprocess.py
y dibuja gráficos limpios con etiquetas en español, pensados para pegar
directamente en la presentación.

Salida: outputs/figures/*.png  (200 DPI, fondo blanco)

Uso:
    python src/figures.py            # genera todas las figuras disponibles
"""
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import pandas as pd

import config

FIG_DIR = config.OUTPUTS_DIR / "figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)

# Estilo consistente para toda la charla
plt.rcParams.update({
    "figure.dpi": 110,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
    "savefig.facecolor": "white",
    "font.size": 13,
    "axes.titlesize": 16,
    "axes.titleweight": "bold",
    "axes.spines.top": False,
    "axes.spines.right": False,
})
C_YOLO = "#E4572E"   # naranja-rojo
C_SAHI = "#2E8B57"   # verde
C_ACC = "#3A6EA5"    # azul


def _save(fig, name):
    out = FIG_DIR / name
    fig.savefig(out)
    plt.close(fig)
    print(f"  -> {out}")


def fig_map_comparison(csv=None):
    """Barras agrupadas: YOLO vs YOLO+SAHI en las 6 métricas de mAP."""
    csv = csv or config.OUTPUTS_DIR / "benchmark_map.csv"
    if not Path(csv).exists():
        print(f"(omito mAP: falta {csv} — corre src/evaluate.py)")
        return
    df = pd.read_csv(csv)
    x = range(len(df))
    w = 0.38
    fig, ax = plt.subplots(figsize=(11, 6))
    ax.bar([i - w / 2 for i in x], df["YOLO"], w, label="YOLO", color=C_YOLO)
    ax.bar([i + w / 2 for i in x], df["YOLO+SAHI"], w, label="YOLO + SAHI", color=C_SAHI)
    ax.set_xticks(list(x))
    ax.set_xticklabels(df["Métrica"], rotation=20, ha="right")
    ax.set_ylabel("Average Precision")
    ax.set_title("YOLO vs YOLO + SAHI en VisDrone")
    ax.legend()
    for i, (a, b) in enumerate(zip(df["YOLO"], df["YOLO+SAHI"])):
        ax.text(i - w / 2, a, f"{a:.2f}", ha="center", va="bottom", fontsize=9)
        ax.text(i + w / 2, b, f"{b:.2f}", ha="center", va="bottom", fontsize=9)
    _save(fig, "01_map_comparison.png")


def fig_apsmall_focus(csv=None):
    """Foco en AP por tamaño: dónde SAHI marca la diferencia."""
    csv = csv or config.OUTPUTS_DIR / "benchmark_map.csv"
    if not Path(csv).exists():
        print(f"(omito AP_small: falta {csv})")
        return
    df = pd.read_csv(csv).set_index("Métrica")
    sizes = [m for m in ["AP_small", "AP_medium", "AP_large"] if m in df.index]
    yolo = [df.loc[m, "YOLO"] for m in sizes]
    sahi = [df.loc[m, "YOLO+SAHI"] for m in sizes]
    x = range(len(sizes))
    w = 0.38
    fig, ax = plt.subplots(figsize=(9, 6))
    ax.bar([i - w / 2 for i in x], yolo, w, label="YOLO", color=C_YOLO)
    ax.bar([i + w / 2 for i in x], sahi, w, label="YOLO + SAHI", color=C_SAHI)
    ax.set_xticks(list(x))
    ax.set_xticklabels(["Pequeños", "Medianos", "Grandes"])
    ax.set_ylabel("Average Precision")
    ax.set_title("AP por tamaño de objeto — SAHI gana en los pequeños")
    ax.legend()
    for i, (a, b) in enumerate(zip(yolo, sahi)):
        if a > 0:
            ax.annotate(f"+{(b - a) / a * 100:.0f}%", (i + w / 2, b),
                        textcoords="offset points", xytext=(0, 6),
                        ha="center", fontweight="bold", color=C_SAHI)
    _save(fig, "02_ap_por_tamano.png")


def fig_slice_tradeoff(csv=None):
    """Trade-off: detecciones (barras) y tiempo (línea) vs tamaño de slice."""
    csv = csv or config.OUTPUTS_DIR / "slice_sweep.csv"
    if not Path(csv).exists():
        print(f"(omito trade-off: falta {csv} — corre src/slice_sweep.py)")
        return
    df = pd.read_csv(csv).sort_values("slice")
    fig, ax1 = plt.subplots(figsize=(10, 6))
    ax1.bar(df["slice"].astype(str), df["detections"], color=C_SAHI, alpha=0.85,
            label="Detecciones")
    ax1.set_xlabel("Tamaño de slice (px)")
    ax1.set_ylabel("Detecciones totales", color=C_SAHI)
    ax1.tick_params(axis="y", labelcolor=C_SAHI)
    ax2 = ax1.twinx()
    ax2.spines.top.set_visible(False)
    ax2.plot(df["slice"].astype(str), df["time_s"], color=C_YOLO, marker="o",
             linewidth=2.5, label="Tiempo")
    ax2.set_ylabel("Tiempo (s)", color=C_YOLO)
    ax2.tick_params(axis="y", labelcolor=C_YOLO)
    ax1.set_title("Precisión vs velocidad: el efecto del tamaño de slice")
    _save(fig, "03_slice_tradeoff.png")


def fig_postprocess(csv=None):
    """Comparación de tipos de postprocesamiento (NMS / NMM / GREEDYNMM)."""
    csv = csv or config.OUTPUTS_DIR / "postprocess.csv"
    if not Path(csv).exists():
        print(f"(omito postproceso: falta {csv} — corre src/compare_postprocess.py)")
        return
    df = pd.read_csv(csv)
    metrics = [m for m in ["mAP", "AP_small"] if m in df.columns]
    x = range(len(df))
    w = 0.8 / max(len(metrics), 1)
    fig, ax = plt.subplots(figsize=(9, 6))
    colors = [C_ACC, C_SAHI, C_YOLO]
    for j, m in enumerate(metrics):
        ax.bar([i + j * w for i in x], df[m], w, label=m, color=colors[j % len(colors)])
    ax.set_xticks([i + w * (len(metrics) - 1) / 2 for i in x])
    ax.set_xticklabels(df["postprocess"])
    ax.set_ylabel("Average Precision")
    ax.set_title("Postprocesamiento de fusión: NMS vs NMM vs GREEDYNMM")
    ax.legend()
    _save(fig, "04_postprocess.png")


def fig_per_class(csv=None):
    """Barras horizontales: detecciones por clase, YOLO vs YOLO+SAHI."""
    csv = csv or config.OUTPUTS_DIR / "per_class.csv"
    if not Path(csv).exists():
        print(f"(omito por-clase: falta {csv} — corre src/analyze_classes.py)")
        return
    df = pd.read_csv(csv).sort_values("YOLO+SAHI")
    y = range(len(df))
    h = 0.38
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.barh([i + h / 2 for i in y], df["YOLO"], h, label="YOLO", color=C_YOLO)
    ax.barh([i - h / 2 for i in y], df["YOLO+SAHI"], h, label="YOLO + SAHI", color=C_SAHI)
    ax.set_yticks(list(y))
    ax.set_yticklabels(df["clase"])
    ax.set_xlabel("Detecciones totales")
    ax.set_title("Detecciones por clase — dónde más ayuda SAHI")
    ax.legend()
    _save(fig, "05_per_class.png")


def fig_per_class_ap(csv=None):
    """Barras horizontales: AP@.5:.95 por clase, YOLO vs YOLO+SAHI."""
    csv = csv or config.OUTPUTS_DIR / "per_class_ap.csv"
    if not Path(csv).exists():
        print(f"(omito AP por-clase: falta {csv} — corre src/evaluate.py)")
        return
    df = pd.read_csv(csv).sort_values("AP_YOLO+SAHI")
    y = range(len(df))
    h = 0.38
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.barh([i + h / 2 for i in y], df["AP_YOLO"], h, label="YOLO", color=C_YOLO)
    ax.barh([i - h / 2 for i in y], df["AP_YOLO+SAHI"], h, label="YOLO + SAHI", color=C_SAHI)
    ax.set_yticks(list(y))
    ax.set_yticklabels(df["clase"])
    ax.set_xlabel("AP@.5:.95")
    ax.set_title("AP por clase — YOLO vs YOLO + SAHI")
    ax.legend()
    _save(fig, "10_per_class_ap.png")


def fig_pipeline_diagram():
    """Diagrama esquemático del pipeline de slicing de SAHI."""
    fig, ax = plt.subplots(figsize=(12, 4))
    ax.axis("off")

    def box(x, w, text, color):
        ax.add_patch(mpatches.FancyBboxPatch((x, 0.3), w, 0.45,
                     boxstyle="round,pad=0.02", facecolor=color, edgecolor="black"))
        ax.text(x + w / 2, 0.52, text, ha="center", va="center",
                fontsize=12, fontweight="bold", color="white")

    def arrow(x):
        ax.annotate("", (x + 0.04, 0.52), (x, 0.52),
                    arrowprops=dict(arrowstyle="-|>", lw=2))

    box(0.02, 0.16, "Imagen\nalta resolución", C_ACC)
    arrow(0.18)
    # mini grid de slices
    ax.add_patch(mpatches.Rectangle((0.24, 0.3), 0.16, 0.45, facecolor="#cfe8d6",
                 edgecolor="black"))
    for gx in (0.24, 0.2933, 0.3466):
        ax.plot([gx + 0.0533, gx + 0.0533], [0.3, 0.75], color="black", lw=0.6)
    for gy in (0.45, 0.6):
        ax.plot([0.24, 0.40], [gy, gy], color="black", lw=0.6)
    ax.text(0.32, 0.18, "Slices con solape", ha="center", fontsize=11)
    arrow(0.42)
    box(0.46, 0.18, "YOLO en\ncada slice", C_YOLO)
    arrow(0.66)
    box(0.70, 0.16, "Merge\n(NMS/NMM)", C_SAHI)
    arrow(0.88)
    box(0.90, 0.08, "Salida", C_ACC)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_title("Pipeline SAHI: Slicing Aided Hyper Inference", pad=12)
    _save(fig, "00_pipeline_sahi.png")


def all_figures():
    print("Generando figuras para slides en", FIG_DIR)
    fig_pipeline_diagram()
    fig_map_comparison()
    fig_apsmall_focus()
    fig_slice_tradeoff()
    fig_postprocess()
    fig_per_class()
    fig_per_class_ap()
    print("Listo.")


if __name__ == "__main__":
    all_figures()
