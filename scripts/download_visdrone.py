"""Atajo: descarga VisDrone-DET val y lo convierte a COCO en un solo paso.

Uso:
    python scripts/download_visdrone.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from datasets import download_visdrone_val, visdrone_to_coco  # noqa: E402

if __name__ == "__main__":
    download_visdrone_val()
    visdrone_to_coco()
