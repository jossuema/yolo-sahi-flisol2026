"""Descarga de VisDrone-DET (val) y conversión a formato COCO.

VisDrone trae, por cada imagen, un .txt con líneas:
    bbox_left,bbox_top,bbox_width,bbox_height,score,category,truncation,occlusion

Categorías VisDrone (en el .txt):
    0=ignored, 1=pedestrian, 2=people, 3=bicycle, 4=car, 5=van,
    6=truck, 7=tricycle, 8=awning-tricycle, 9=bus, 10=motor, 11=others

Las mapeamos a los índices 0..9 de Ultralytics (category_txt - 1), descartando
'ignored' (0) y 'others' (11). Así el COCO ground truth queda alineado con
los class ids del modelo entrenado vía VisDrone.yaml.

Uso:
    python src/datasets.py            # descarga + convierte a COCO
"""
import json
import zipfile
from pathlib import Path

import requests
from PIL import Image
from tqdm import tqdm

import config


def download_visdrone_val():
    DEST = config.DATA_DIR / "VisDrone2019-DET-val.zip"
    if config.VISDRONE_DIR.exists():
        print(f"VisDrone ya existe en {config.VISDRONE_DIR}")
        return
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Descargando VisDrone-DET val (~80 MB) ...")
    with requests.get(config.VISDRONE_VAL_URL, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        with open(DEST, "wb") as f, tqdm(total=total, unit="B", unit_scale=True) as bar:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                bar.update(len(chunk))

    print("Descomprimiendo ...")
    with zipfile.ZipFile(DEST) as z:
        z.extractall(config.DATA_DIR)
    DEST.unlink(missing_ok=True)
    print(f"Listo: {config.VISDRONE_DIR}")


def visdrone_to_coco():
    """Convierte las anotaciones VisDrone val a un único JSON COCO."""
    img_dir = config.VISDRONE_DIR / "images"
    ann_dir = config.VISDRONE_DIR / "annotations"
    if not img_dir.exists():
        raise SystemExit(f"No se encontró {img_dir}. Corre download_visdrone_val() primero.")

    categories = [{"id": i, "name": name} for i, name in config.VISDRONE_CLASSES.items()]
    images, annotations = [], []
    ann_id = 1

    img_files = sorted(img_dir.glob("*.jpg"))
    for img_id, img_path in enumerate(tqdm(img_files, desc="Convirtiendo a COCO"), start=1):
        with Image.open(img_path) as im:
            w, h = im.size
        images.append({"id": img_id, "file_name": img_path.name, "width": w, "height": h})

        ann_path = ann_dir / f"{img_path.stem}.txt"
        if not ann_path.exists():
            continue
        for line in ann_path.read_text().splitlines():
            parts = line.strip().rstrip(",").split(",")
            if len(parts) < 6:
                continue
            x, y, bw, bh = (int(float(v)) for v in parts[:4])
            cat_txt = int(parts[5])
            if cat_txt in (0, 11) or bw <= 0 or bh <= 0:  # ignored / others / inválidos
                continue
            annotations.append({
                "id": ann_id,
                "image_id": img_id,
                "category_id": cat_txt - 1,            # 1..10 -> 0..9 (idx Ultralytics)
                "bbox": [x, y, bw, bh],
                "area": bw * bh,
                "iscrowd": 0,
            })
            ann_id += 1

    coco = {"images": images, "annotations": annotations, "categories": categories}
    config.COCO_GT_PATH.write_text(json.dumps(coco))
    print(f"COCO GT: {config.COCO_GT_PATH}  "
          f"({len(images)} imágenes, {len(annotations)} objetos)")
    return config.COCO_GT_PATH


if __name__ == "__main__":
    download_visdrone_val()
    visdrone_to_coco()
