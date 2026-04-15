"""
Standalone YOLOv8 training for FridgeVision — tuned for laptops (GTX 1650 class, ~16 GB RAM).

Uses COCO-pretrained yolov8n.pt so you reach a usable best.pt much faster than training from yaml
from scratch. Smaller imgsz, fewer epochs, early stopping, and workers=0 reduce RAM pressure and
avoid Windows DataLoader multiprocessing hangs.
"""

from __future__ import annotations

import os

# Before NumPy/PyTorch import: stops BLAS/OpenMP from spawning many threads on top of the
# training loop — a common cause of "frozen" tqdm on Windows laptops (GPU idle, bar stuck).
for _k, _v in (
    ("OMP_NUM_THREADS", "1"),
    ("MKL_NUM_THREADS", "1"),
    ("OPENBLAS_NUM_THREADS", "1"),
    ("NUMEXPR_NUM_THREADS", "1"),
):
    os.environ.setdefault(_k, _v)

import pathlib
import sys
import traceback
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

# Laptop-friendly training (edit here if you have more VRAM/RAM)
EPOCHS = 30
IMGSZ = 512
BATCH = 4
WORKERS = 0  # must stay 0 on Windows — worker processes often deadlock/hang
PATIENCE = 12
# Stable run dir so resume=True always finds weights/last.pt (delete that file for a fresh run)
RUN_NAME = "smart_fridge_train"
HEARTBEAT_EVERY = 10  # stderr lines every N batches (tqdm often hides stdout on Windows)


def _make_heartbeat_callbacks():
    batch_in_epoch = [0]

    def on_train_epoch_start(trainer):
        batch_in_epoch[0] = 0

    def _hb_line(trainer, phase: str):
        b = batch_in_epoch[0]
        if b % HEARTBEAT_EVERY != 0 and b != 1:
            return
        try:
            nb = len(trainer.train_loader)
        except Exception:
            nb = "?"
        ep = int(getattr(trainer, "epoch", 0)) + 1
        # stderr so tqdm does not swallow lines in some terminals
        sys.stderr.write(
            f"[heartbeat] {phase}  epoch {ep}/{trainer.epochs}  batch {b}/{nb}\n"
        )
        sys.stderr.flush()

    def on_train_batch_start(trainer):
        batch_in_epoch[0] += 1
        _hb_line(trainer, "enter_batch")

    def on_train_batch_end(trainer):
        _hb_line(trainer, "done_batch")

    return on_train_epoch_start, on_train_batch_start, on_train_batch_end


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    os.chdir(script_dir)

    project_dir = script_dir / "backend" / "runs" / "detect"
    run_name = RUN_NAME
    data_rel = Path("FridgeVision.yolov8") / "data.yaml"
    last_pt = project_dir / run_name / "weights" / "last.pt"

    cuda_ok = torch.cuda.is_available()
    print("--- Device debug ---", flush=True)
    print(f"CUDA available: {cuda_ok}", flush=True)
    if cuda_ok:
        print(f"GPU name: {torch.cuda.get_device_name(0)}", flush=True)
    device = "cuda" if cuda_ok else "cpu"
    print(f"Selected device: {device}", flush=True)
    print("--------------------", flush=True)
    print(
        f"Laptop-friendly run: yolov8n.pt (pretrained), epochs={EPOCHS}, "
        f"patience={PATIENCE}, imgsz={IMGSZ}, batch={BATCH}, workers={WORKERS}",
        flush=True,
    )

    if not data_rel.is_file():
        print(f"Error: dataset config not found: {data_rel.resolve()}", file=sys.stderr)
        sys.exit(1)

    resume = last_pt.is_file()
    if resume:
        print(f"Resuming from checkpoint:\n{last_pt.resolve()}", flush=True)
        model = YOLO(str(last_pt))
    else:
        model = YOLO("yolov8n.pt")

    ep_start, ep_bs, ep_be = _make_heartbeat_callbacks()
    model.add_callback("on_train_epoch_start", ep_start)
    model.add_callback("on_train_batch_start", ep_bs)
    model.add_callback("on_train_batch_end", ep_be)

    print("Training started...", flush=True)
    model.train(
        data="./FridgeVision.yolov8/data.yaml",
        epochs=EPOCHS,
        imgsz=IMGSZ,
        batch=BATCH,
        workers=WORKERS,
        device=device,
        patience=PATIENCE,
        cache=False,
        # Lighter augment on CPU path when workers=0 (less work per batch before GPU sees data)
        mosaic=0.7,
        close_mosaic=5,
        project=str(project_dir),
        name=run_name,
        exist_ok=True,
        resume=resume,
    )
    print("Training finished...", flush=True)

    save_dir = Path(model.trainer.save_dir)
    best_pt = (save_dir / "weights" / "best.pt").resolve()
    if best_pt.is_file():
        print(f"best.pt exists. Full path:\n{best_pt}")
    else:
        print(f"Warning: best.pt not found at expected path:\n{best_pt}", file=sys.stderr)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
