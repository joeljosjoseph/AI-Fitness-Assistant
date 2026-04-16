from __future__ import annotations

import pathlib
import shutil
import tempfile
from collections import Counter
from pathlib import Path


def _patch_path_exists_for_ultralytics() -> None:
    """GitRepo() walks parents for `.git`; on some Windows paths stat raises OSError."""
    original_exists = pathlib.Path.exists

    def _exists(self, *args, **kwargs):
        try:
            return original_exists(self, *args, **kwargs)
        except OSError:
            return False

    pathlib.Path.exists = _exists  # type: ignore[method-assign]


_patch_path_exists_for_ultralytics()

from ultralytics import YOLO

MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "backend"
    / "runs"
    / "detect"
    / "smart_fridge_train"
    / "weights"
    / "best.pt"
)


def detect_items_from_upload(upload_file, conf: float = 0.25) -> list[dict[str, int | str]]:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    suffix = Path(upload_file.filename or "upload.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
        temp_path = Path(temp_file.name)
        upload_file.file.seek(0)
        shutil.copyfileobj(upload_file.file, temp_file)

    try:
        model = YOLO(str(MODEL_PATH))
        results = model.predict(source=str(temp_path), conf=conf, verbose=False)
        if not results:
            return []

        result = results[0]
        names = result.names
        counter = Counter()

        if result.boxes is not None and result.boxes.cls is not None:
            for cls_idx in result.boxes.cls.tolist():
                idx = int(cls_idx)
                name = names.get(idx, str(idx)) if isinstance(names, dict) else names[idx]
                counter[str(name)] += 1

        return [
            {"name": name, "count": int(count)}
            for name, count in sorted(counter.items(), key=lambda item: item[0])
        ]
    finally:
        temp_path.unlink(missing_ok=True)
