"""
Train YOLOv8n on project YOLO datasets — laptop-friendly defaults (pretrained .pt, smaller imgsz,
fewer epochs, early stopping, workers=0).

Order:
  1) Run named "diet" on FridgeVision (food items for diet / fridge use).
  2) Any other *.yolov8 bundles with data.local.yaml or data.yaml (excluding FridgeVision if already done).

Skips archive/daily_food_nutrition_dataset.csv — tabular CSV, not YOLO image/label format.

Outputs under ./backend/runs/detect/<run_name>/weights/best.pt
"""

from __future__ import annotations

import os

for _k, _v in (
    ("OMP_NUM_THREADS", "1"),
    ("MKL_NUM_THREADS", "1"),
    ("OPENBLAS_NUM_THREADS", "1"),
    ("NUMEXPR_NUM_THREADS", "1"),
):
    os.environ.setdefault(_k, _v)

import pathlib
import sys
from pathlib import Path


def _patch_path_exists_for_ultralytics() -> None:
    """GitRepo() walks parents for `.git`; on some Windows setups a path like D:\\WpSystem\\.git raises WinError 1337 on stat."""
    _orig = pathlib.Path.exists

    def _exists(self, *args, **kwargs):
        try:
            return _orig(self, *args, **kwargs)
        except OSError:
            return False

    pathlib.Path.exists = _exists  # type: ignore[method-assign]


_patch_path_exists_for_ultralytics()

import torch
from ultralytics import YOLO

torch.set_num_threads(1)
try:
    torch.set_num_interop_threads(1)
except Exception:
    pass


def train_one(
    data_yaml: Path,
    run_name: str,
    project_dir: Path,
    epochs: int = 30,
    imgsz: int = 512,
    batch: int = 4,
    workers: int = 0,
    patience: int = 12,
) -> Path:
    if not data_yaml.is_file():
        raise FileNotFoundError(data_yaml)

    device: str = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        print("Warning: CUDA not available; using CPU.")
    else:
        print(f"Using GPU: {torch.cuda.get_device_name(0)} (device='cuda').")
    print(
        f"DataLoader workers={workers} "
        "(0 = main process only; avoids Windows multiprocessing hangs and saves RAM)."
    )

    model = YOLO("yolov8n.pt")
    model.train(
        data=str(data_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        workers=workers,
        patience=patience,
        cache=False,
        mosaic=0.7,
        close_mosaic=5,
        project=str(project_dir),
        name=run_name,
    )
    save_dir = Path(model.trainer.save_dir)
    return (save_dir / "weights" / "best.pt").resolve()


def main() -> None:
    root = Path(__file__).resolve().parent
    os.chdir(root)
    project_runs = root / "backend" / "runs" / "detect"

    fridge_local = root / "FridgeVision.yolov8" / "data.local.yaml"
    fridge_default = root / "FridgeVision.yolov8" / "data.yaml"
    fridge_yaml = fridge_local if fridge_local.is_file() else fridge_default

    archive_csv = root / "archive" / "daily_food_nutrition_dataset.csv"
    if archive_csv.is_file():
        print(
            f"Note: skipping {archive_csv.name} (nutrition CSV, not YOLO images/labels).\n"
        )

    # 1) Diet / fridge food detector first (explicit user order)
    print("=== Training run: diet (FridgeVision) ===\n")
    best_diet = train_one(fridge_yaml, "diet", project_runs)
    print(f"diet best.pt:\n{best_diet}\n")

    # 2) Any other YOLOv8 dataset folders at repo root
    done = {fridge_yaml.resolve()}
    for folder in sorted(root.glob("*.yolov8")):
        if folder.name.lower() == "fridgevision.yolov8":
            continue
        for name in ("data.local.yaml", "data.yaml"):
            candidate = folder / name
            if candidate.is_file() and candidate.resolve() not in done:
                run = folder.name.replace(".yolov8", "").lower()
                print(f"=== Training run: {run} ===\n")
                best = train_one(candidate, run, project_runs)
                print(f"{run} best.pt:\n{best}\n")
                done.add(candidate.resolve())
                break


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
