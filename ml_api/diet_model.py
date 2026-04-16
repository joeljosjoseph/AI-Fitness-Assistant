from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from ml_api._bmi import (
    bmi,
    bmi_category,
    bmi_category_to_csv,
    norm_gender,
    ui_goal_to_csv_goal,
)

MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "diet_rf_pipeline.joblib"


def _gender_for_model(gender: str) -> str:
    """Training data only has Male/Female; map Other to Female for encoding."""
    normalized = norm_gender(gender)
    if normalized == "Other":
        return "Female"
    return normalized


def predict_gym_plan(
    *,
    gender: str,
    goal: str,
    weight_kg: float,
    height_cm: float,
) -> dict[str, Any] | None:
    if not MODEL_PATH.is_file():
        return None

    bmi_value = bmi(weight_kg, height_cm)
    csv_bmi_category = bmi_category_to_csv(bmi_category(bmi_value))
    csv_goal = ui_goal_to_csv_goal(goal)

    bundle = joblib.load(MODEL_PATH)
    pipe = bundle["pipeline"]
    label_names = bundle["label_names"]

    row = pd.DataFrame(
        [
            {
                "Gender": _gender_for_model(gender),
                "Goal": csv_goal,
                "BMI Category": csv_bmi_category,
                "bmi": bmi_value,
            }
        ]
    )

    pred_idx = int(pipe.predict(row)[0])
    if pred_idx < 0 or pred_idx >= len(label_names):
        return None

    label = label_names[pred_idx]
    if "|||" not in label:
        return None

    exercise_schedule, meal_plan_focus = label.split("|||", 1)
    return {
        "exercise_schedule": exercise_schedule,
        "meal_plan_focus": meal_plan_focus,
        "csv_goal": csv_goal,
        "csv_bmi_category": csv_bmi_category,
        "bmi_used": bmi_value,
    }
