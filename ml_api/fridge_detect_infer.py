from __future__ import annotations

import argparse
import json
import pathlib
import sys
from collections import Counter
from pathlib import Path


def _patch_path_exists_for_ultralytics() -> None:
    """GitRepo() walks parents for `.git`; on some Windows paths stat raises OSError (e.g. WinError 1337)."""
    _orig = pathlib.Path.exists

    def _exists(self, *args, **kwargs):
        try:
            return _orig(self, *args, **kwargs)
        except OSError:
            return False

    pathlib.Path.exists = _exists  # type: ignore[method-assign]


_patch_path_exists_for_ultralytics()

from ultralytics import YOLO


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--conf", type=float, default=0.25)
    args = parser.parse_args()

    model_path = Path(args.model).resolve()
    image_path = Path(args.image).resolve()

    if not model_path.is_file():
        print(f"ERROR: model not found: {model_path}", file=sys.stderr)
        return 1
    if not image_path.is_file():
        print(f"ERROR: image not found: {image_path}", file=sys.stderr)
        return 1

    model = YOLO(str(model_path))
    results = model.predict(source=str(image_path), conf=args.conf, verbose=False)
    if not results:
        print("JSON_RESULT:[]")
        return 0

    r = results[0]
    names = r.names
    counter = Counter()

    if r.boxes is not None and r.boxes.cls is not None:
        for cls_idx in r.boxes.cls.tolist():
            idx = int(cls_idx)
            name = names.get(idx, str(idx)) if isinstance(names, dict) else names[idx]
            counter[str(name)] += 1

    items = [{"name": k, "count": int(v)} for k, v in sorted(counter.items(), key=lambda x: x[0])]
    print("JSON_RESULT:" + json.dumps(items))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
