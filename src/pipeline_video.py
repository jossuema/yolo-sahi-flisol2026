"""(Opcional / bonus) Inferencia YOLO + SAHI sobre un video de cámara urbana.

Procesa un clip frame a frame con slicing y escribe un video anotado.
Con --compare genera el video lado-a-lado YOLO vs SAHI (gran respaldo si la
demo en vivo falla). Usa tu propio clip de cámara urbana para el caso de
seguridad ciudadana.

OJO: SAHI por frame es costoso. Usa un clip corto (10-20s) y/o --skip N.

Uso:
    python src/pipeline_video.py data/videos/calle.mp4 --skip 2 --compare
"""
import argparse
from pathlib import Path

import cv2
from ultralytics import YOLO
from sahi.predict import get_sliced_prediction

import config
from evaluate import build_model


def draw(frame, predictions, color):
    for p in predictions:
        x1, y1, x2, y2 = map(int, p.bbox.to_xyxy())
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    return frame


def run(video_path: str, model_path: str, skip: int, compare: bool):
    sahi_model = build_model(model_path)
    yolo = YOLO(model_path) if compare else None

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise SystemExit(f"No se pudo abrir el video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out_w = w * 2 if compare else w
    out_path = config.OUTPUTS_DIR / f"video_{Path(video_path).stem}_sahi.mp4"
    writer = cv2.VideoWriter(str(out_path), cv2.VideoWriter_fourcc(*"mp4v"),
                             fps / skip, (out_w, h))

    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % skip != 0:
            idx += 1
            continue

        result = get_sliced_prediction(
            frame, sahi_model,
            slice_height=config.SLICE_HEIGHT, slice_width=config.SLICE_WIDTH,
            overlap_height_ratio=config.OVERLAP_HEIGHT_RATIO,
            overlap_width_ratio=config.OVERLAP_WIDTH_RATIO,
            postprocess_type=config.POSTPROCESS_TYPE, verbose=0,
        )
        sahi_frame = draw(frame.copy(), result.object_prediction_list, (0, 255, 0))
        cv2.putText(sahi_frame, "YOLO + SAHI", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)

        if compare:
            yres = yolo.predict(frame, conf=config.CONFIDENCE,
                                device=config.DEVICE, verbose=False)[0]
            yframe = yres.plot()
            cv2.putText(yframe, "YOLO", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
            out_frame = cv2.hconcat([yframe, sahi_frame])
        else:
            out_frame = sahi_frame

        writer.write(out_frame)
        idx += 1
        if idx % 25 == 0:
            print(f"  procesados {idx} frames...")

    cap.release()
    writer.release()
    print(f"Video generado: {out_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("video", nargs="?", default=str(config.DATA_DIR / "videos" / "calle.mp4"))
    ap.add_argument("--model", default=config.MODEL_PATH)
    ap.add_argument("--skip", type=int, default=1, help="procesa 1 de cada N frames")
    ap.add_argument("--compare", action="store_true", help="video lado-a-lado YOLO vs SAHI")
    args = ap.parse_args()
    run(args.video, args.model, args.skip, args.compare)
