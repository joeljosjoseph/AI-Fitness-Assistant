from pathlib import Path
import argparse

from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run inference with deploy/best.pt.")
    parser.add_argument(
        "--source",
        required=True,
        help="Image/video path, folder, or camera index (e.g. 0).",
    )
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold.")
    parser.add_argument("--imgsz", type=int, default=640, help="Inference image size.")
    parser.add_argument(
        "--device",
        default="0",
        help="Device to run on, e.g. '0' for GPU or 'cpu'.",
    )
    parser.add_argument(
        "--save",
        action="store_true",
        help="Save annotated predictions to deploy/predictions.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    deploy_dir = Path(__file__).resolve().parent
    model_path = deploy_dir / "best.pt"
    if not model_path.exists():
        raise FileNotFoundError(f"Missing model file: {model_path}")

    model = YOLO(str(model_path))
    results = model.predict(
        source=args.source,
        conf=args.conf,
        imgsz=args.imgsz,
        device=args.device,
        save=args.save,
        project=str(deploy_dir / "predictions"),
        name="run",
        exist_ok=True,
        verbose=False,
    )

    print(f"Model: {model_path}")
    print(f"Source: {args.source}")
    print(f"Frames/images processed: {len(results)}")
    for idx, result in enumerate(results):
        boxes = result.boxes
        n = 0 if boxes is None else len(boxes)
        print(f"- Result {idx}: detections={n}")
        if boxes is not None and len(boxes):
            names = result.names
            for box in boxes:
                cls_id = int(box.cls.item())
                conf = float(box.conf.item())
                label = names.get(cls_id, str(cls_id))
                print(f"  - {label}: {conf:.3f}")

    if args.save:
        print(f"Saved predictions under: {(deploy_dir / 'predictions' / 'run').as_posix()}")


if __name__ == "__main__":
    main()
