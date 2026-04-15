"""
Load trained diet RF and print one JSON line for Node (same pattern as fridge_detect_infer).

Usage:
  python -m ml_diet.diet_predict_infer path/to/payload.json

payload.json:
  { "gender": "Male", "goal": "Lose Weight", "weight_kg": 80, "height_cm": 180 }
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

from ml_diet._bmi import (
    bmi,
    bmi_category,
    bmi_category_to_csv,
    norm_gender,
    ui_goal_to_csv_goal,
)

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "diet_rf_pipeline.joblib"


def _gender_for_model(g: str) -> str:
    """Training data only has Male/Female; map Other to Female for encoding."""
    ng = norm_gender(g)
    if ng == "Other":
        return "Female"
    return ng


def main() -> int:
    if len(sys.argv) < 2:
        print("JSON_RESULT:" + json.dumps({"ok": False, "error": "missing payload path"}))
        return 1

    payload_path = Path(sys.argv[1])
    if not payload_path.is_file():
        print("JSON_RESULT:" + json.dumps({"ok": False, "error": "payload not found"}))
        return 1

    if not MODEL_PATH.is_file():
        print("JSON_RESULT:" + json.dumps({"ok": False, "error": "model not trained"}))
        return 2

    try:
        raw = payload_path.read_text(encoding="utf-8-sig")
        body = json.loads(raw)
    except json.JSONDecodeError as e:
        print("JSON_RESULT:" + json.dumps({"ok": False, "error": str(e)}))
        return 1

    gender = body.get("gender", "")
    goal_ui = body.get("goal", "")
    w = float(body.get("weight_kg", 0))
    h = float(body.get("height_cm", 0))
    if w <= 0 or h <= 0:
        print("JSON_RESULT:" + json.dumps({"ok": False, "error": "invalid weight/height"}))
        return 1

    b = bmi(w, h)
    cat_ui = bmi_category(b)
    csv_bmi_cat = bmi_category_to_csv(cat_ui)
    csv_goal = ui_goal_to_csv_goal(goal_ui)

    bundle = joblib.load(MODEL_PATH)
    pipe = bundle["pipeline"]
    label_names = bundle["label_names"]

    row = pd.DataFrame(
        [
            {
                "Gender": _gender_for_model(gender),
                "Goal": csv_goal,
                "BMI Category": csv_bmi_cat,
                "bmi": b,
            }
        ]
    )

    pred_idx = int(pipe.predict(row)[0])
    if pred_idx < 0 or pred_idx >= len(label_names):
        print("JSON_RESULT:" + json.dumps({"ok": False, "error": "bad prediction index"}))
        return 3

    label = label_names[pred_idx]
    if "|||" not in label:
        print("JSON_RESULT:" + json.dumps({"ok": False, "error": "corrupt label"}))
        return 3

    exercise, meal = label.split("|||", 1)

    out = {
        "ok": True,
        "source": "sklearn_rf_gym",
        "exercise_schedule": exercise,
        "meal_plan_focus": meal,
        "csv_goal": csv_goal,
        "csv_bmi_category": csv_bmi_cat,
        "bmi_used": b,
    }
    print("JSON_RESULT:" + json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
